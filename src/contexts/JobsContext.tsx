import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "remote" | "hybrid" | "onsite";
  salary: string;
  postedAt: string;
  matchScore: number;
  skills: string[];
  description?: string;
}

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  appliedAt: string;
  status: string;
  matchScore: number;
  type?: "remote" | "hybrid" | "onsite";
  salary?: string;
  postedAt?: string;
  skills?: string[];
  description?: string;
}

interface JobsContextType {
  availableJobs: Job[];
  savedJobs: Job[];
  applications: Application[];
  applicationsTodayCount: number;
  scheduledInterviewsCount: number;
  scheduledInterviewsTodayCount: number;
  loading: boolean;
  removeFromAvailable: (jobId: string) => void;
  removeFromSaved: (jobId: string) => Promise<void>;
  saveJob: (job: Job) => Promise<void>;
  applyToJob: (job: Job, resumeId: string) => Promise<void>;
  isJobSaved: (jobId: string) => boolean;
  isJobApplied: (jobId: string) => boolean;
  refetch: () => Promise<void>;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

// Helper to convert API job to frontend format
const convertApiJobToJob = (apiJob: any): Job => {
  return {
    id: apiJob.id,
    title: apiJob.title,
    company: apiJob.company,
    location: apiJob.location,
    type: apiJob.type,
    salary: apiJob.salary || "",
    postedAt: apiJob.posted_at 
      ? formatDistanceToNow(new Date(apiJob.posted_at), { addSuffix: true })
      : "Recently",
    matchScore: apiJob.match_score || 0,
    skills: apiJob.skills || [],
    description: apiJob.description,
  };
};

// Helper to convert API application to frontend format
const convertApiApplicationToApplication = (apiApp: any): Application => {
  const job = apiApp.job || {};
  return {
    id: apiApp.id,
    jobTitle: job.title || "",
    company: job.company || "",
    location: job.location || "",
    appliedAt: apiApp.applied_at
      ? formatDistanceToNow(new Date(apiApp.applied_at), { addSuffix: true })
      : "Just now",
    status: apiApp.status || "Application Sent",
    matchScore: job.match_score || 0,
    type: job.type,
    salary: job.salary,
    postedAt: job.posted_at
      ? formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })
      : undefined,
    skills: job.skills || [],
    description: job.description,
  };
};

export const JobsProvider = ({ children }: { children: ReactNode }) => {
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsTodayCount, setApplicationsTodayCount] = useState(0);
  const [scheduledInterviewsCount, setScheduledInterviewsCount] = useState(0);
  const [scheduledInterviewsTodayCount, setScheduledInterviewsTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const token = apiClient.getToken();
    if (!token) {
      setLoading(false);
      setAvailableJobs([]);
      setSavedJobs([]);
      setApplications([]);
      return;
    }

    try {
      setLoading(true);
      
      // Talent: try available-with-match first (RESUME_MATCH_API); on 403 or error fall back to available
      let availableResponse: { success: boolean; data?: any[]; error?: string };
      try {
        console.log("[JobsContext] calling GET /jobs/available-with-match");
        availableResponse = await apiClient.getAvailableJobsWithMatch();
      } catch (err: any) {
        console.warn(
          "[JobsContext] getAvailableJobsWithMatch failed, falling back to /jobs/available:",
          err?.message || err
        );
        const isForbidden = err?.message?.includes('403') || err?.message?.includes('Forbidden');
        if (isForbidden) {
          console.log("[JobsContext] 403 from available-with-match; calling GET /jobs/available instead");
          availableResponse = await apiClient.getAvailableJobs();
        } else {
          console.log("[JobsContext] error from available-with-match; trying GET /jobs/available with catch");
          availableResponse = await apiClient.getAvailableJobs().catch((e) => ({
            success: false,
            data: [] as any[],
            error: (e as Error)?.message,
          }));
        }
      }

      // Fetch the rest in parallel (saved, applications, interviews)
      const [savedResponse, applicationsResponse, interviewsResponse] = await Promise.all([
        apiClient.getSavedJobs().catch((err) => {
          console.error("Error fetching saved jobs:", err);
          return { success: false, data: [], error: err.message };
        }),
        apiClient.getApplications().catch((err) => {
          console.error("Error fetching applications:", err);
          return { success: false, data: [], error: err.message };
        }),
        apiClient.request("/interviews/talent/scheduled").catch((err) => {
          console.error("Error fetching interviews:", err);
          return { success: false, data: [], error: err.message };
        }),
      ]);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      if (interviewsResponse?.success && Array.isArray(interviewsResponse.data)) {
        const interviewsAll = interviewsResponse.data as any[];

        // "Scheduled interviews" on the dashboard = interviews that are still pending/actionable
        const interviewsPending = interviewsAll.filter((i) => {
          const status = String(i.invite_status || i.status || "").toLowerCase().trim();
          return status === "pending";
        });

        setScheduledInterviewsCount(interviewsPending.length);

        const todayInterviews = interviewsPending.filter((i) => {
          const createdRaw = i.invite_created_at || i.created_at || i.scheduled_at;
          if (!createdRaw) return false;
          const dt = new Date(createdRaw);
          return !Number.isNaN(dt.getTime()) && dt >= startOfToday;
        });
        setScheduledInterviewsTodayCount(todayInterviews.length);
      } else {
        setScheduledInterviewsCount(0);
        setScheduledInterviewsTodayCount(0);
      }

      if (availableResponse.success && Array.isArray(availableResponse.data)) {
        console.log(
          "[JobsContext] availableResponse.data (raw jobs)",
          (availableResponse.data as any[]).map((j: any) => ({
            id: j.id,
            title: j.title ?? j.name,
            match_score: j.match_score,
          }))
        );
        const mapped = (availableResponse.data as any[]).map(convertApiJobToJob);
        console.log(
          "[JobsContext] availableJobs after convertApiJobToJob",
          mapped.map((j) => ({ id: j.id, title: j.title, matchScore: j.matchScore }))
        );
        setAvailableJobs(mapped);
      } else {
        // If no data or failed, set empty array
        setAvailableJobs([]);
        if (availableResponse.error && !availableResponse.error.includes("Authentication")) {
          console.warn("Failed to load available jobs:", availableResponse.error);
        }
      }

      if (savedResponse.success && Array.isArray(savedResponse.data)) {
        setSavedJobs(
          (savedResponse.data as any[])
            .map((item: any) => item.job)
            .filter(Boolean)
            .map(convertApiJobToJob)
        );
      } else {
        setSavedJobs([]);
      }

      if (applicationsResponse.success && Array.isArray(applicationsResponse.data)) {
        const appsRaw = applicationsResponse.data as any[];
        setApplications(appsRaw.map(convertApiApplicationToApplication));

        const todayApps = appsRaw.filter((a) => {
          const createdRaw = a.applied_at || a.created_at;
          if (!createdRaw) return false;
          const dt = new Date(createdRaw);
          return !Number.isNaN(dt.getTime()) && dt >= startOfToday;
        });
        setApplicationsTodayCount(todayApps.length);
      } else {
        setApplications([]);
        setApplicationsTodayCount(0);
      }
    } catch (error: any) {
      console.error("Error fetching jobs data:", error);
      setAvailableJobs([]);
      setSavedJobs([]);
      setApplications([]);
      if (error.message && !error.message.includes("Authentication")) {
        toast.error("Failed to load jobs data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const removeFromAvailable = (jobId: string) => {
    setAvailableJobs((prev) => prev.filter((job) => job.id !== jobId));
  };

  const removeFromSaved = async (jobId: string) => {
    try {
      const token = apiClient.getToken();
      if (!token) {
        toast.error("Please sign in to remove saved jobs");
        return;
      }

      await apiClient.removeSavedJob(jobId);
      
      // Remove from saved and add back to available
      const jobToRestore = savedJobs.find((j) => j.id === jobId);
      if (jobToRestore) {
        setSavedJobs((prev) => prev.filter((job) => job.id !== jobId));
        setAvailableJobs((prev) => {
          // Only add if not already in available
          if (!prev.find((j) => j.id === jobId)) {
            return [...prev, jobToRestore];
          }
          return prev;
        });
      }
      
      toast.success("Job removed from saved");
    } catch (error: any) {
      console.error("Error removing saved job:", error);
      toast.error(error.message || "Failed to remove saved job");
    }
  };

  const saveJob = async (job: Job) => {
    try {
      const token = apiClient.getToken();
      if (!token) {
        toast.error("Please sign in to save jobs");
        return;
      }

      await apiClient.saveJob(job.id);
      
      // Remove from available and add to saved
      setAvailableJobs((prev) => prev.filter((j) => j.id !== job.id));
      setSavedJobs((prev) => {
        if (!prev.find((j) => j.id === job.id)) {
          return [...prev, job];
        }
        return prev;
      });
      
      toast.success(`Saved ${job.title}`);
    } catch (error: any) {
      console.error("Error saving job:", error);
      toast.error(error.message || "Failed to save job");
    }
  };

  const applyToJob = async (job: Job, resumeId: string) => {
    try {
      const token = apiClient.getToken();
      if (!token) {
        toast.error("Please sign in to apply to jobs");
        return;
      }

      await apiClient.applyToJob(job.id, resumeId);
      
      // Remove from available and saved
      setAvailableJobs((prev) => prev.filter((j) => j.id !== job.id));
      setSavedJobs((prev) => prev.filter((j) => j.id !== job.id));

      // Add to applications
      const newApplication: Application = {
        id: job.id,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        appliedAt: "Just now",
        status: "Application Sent",
        matchScore: job.matchScore,
        type: job.type,
        salary: job.salary,
        postedAt: job.postedAt,
        skills: job.skills,
        description: job.description,
      };
      
      setApplications((prev) => {
        if (!prev.find((a) => a.id === job.id)) {
          return [...prev, newApplication];
        }
        return prev;
      });
      
      toast.success(`Applied to ${job.title} at ${job.company}`);
      
      // Refetch to get updated data
      await fetchData();
    } catch (error: any) {
      console.error("Error applying to job:", error);
      toast.error(error.message || "Failed to apply to job");
    }
  };

  const isJobSaved = (jobId: string) => {
    return savedJobs.some((job) => job.id === jobId);
  };

  const isJobApplied = (jobId: string) => {
    return applications.some((app) => app.id === jobId);
  };

  return (
    <JobsContext.Provider
      value={{
        availableJobs,
        savedJobs,
        applications,
        applicationsTodayCount,
        scheduledInterviewsCount,
        scheduledInterviewsTodayCount,
        loading,
        removeFromAvailable,
        removeFromSaved,
        saveJob,
        applyToJob,
        isJobSaved,
        isJobApplied,
        refetch: fetchData,
      }}
    >
      {children}
    </JobsContext.Provider>
  );
};

export const useJobs = () => {
  const context = useContext(JobsContext);
  if (!context) {
    throw new Error("useJobs must be used within a JobsProvider");
  }
  return context;
};
