import { createContext, useContext, useState, ReactNode } from "react";

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
}

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  appliedAt: string;
  status: string;
  matchScore: number;
}

interface JobsContextType {
  availableJobs: Job[];
  savedJobs: Job[];
  applications: Application[];
  removeFromAvailable: (jobId: string) => void;
  removeFromSaved: (jobId: string) => void;
  saveJob: (job: Job) => void;
  applyToJob: (job: Job) => void;
  isJobSaved: (jobId: string) => boolean;
  isJobApplied: (jobId: string) => boolean;
}

const initialJobs: Job[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp AI",
    location: "San Francisco, CA",
    type: "hybrid",
    salary: "$150k - $200k",
    postedAt: "2 days ago",
    matchScore: 92,
    skills: ["React", "TypeScript", "Node.js", "GraphQL", "AWS"],
  },
  {
    id: "2",
    title: "Full Stack Engineer",
    company: "StartupXYZ",
    location: "New York, NY",
    type: "remote",
    salary: "$130k - $170k",
    postedAt: "5 days ago",
    matchScore: 87,
    skills: ["Python", "React", "PostgreSQL", "Docker"],
  },
  {
    id: "3",
    title: "Backend Developer",
    company: "Enterprise Inc",
    location: "Austin, TX",
    type: "onsite",
    salary: "$120k - $150k",
    postedAt: "1 week ago",
    matchScore: 75,
    skills: ["Java", "Spring Boot", "Kubernetes", "MongoDB"],
  },
  {
    id: "4",
    title: "DevOps Engineer",
    company: "CloudScale",
    location: "Seattle, WA",
    type: "remote",
    salary: "$140k - $180k",
    postedAt: "3 days ago",
    matchScore: 82,
    skills: ["AWS", "Terraform", "Docker", "Kubernetes"],
  },
  {
    id: "5",
    title: "ML Engineer",
    company: "AI Labs",
    location: "Boston, MA",
    type: "hybrid",
    salary: "$160k - $210k",
    postedAt: "1 day ago",
    matchScore: 68,
    skills: ["Python", "PyTorch", "TensorFlow", "MLOps"],
  },
];

const initialSavedJobs: Job[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp AI",
    location: "San Francisco, CA",
    type: "hybrid",
    salary: "$150k - $200k",
    postedAt: "2 days ago",
    matchScore: 92,
    skills: ["React", "TypeScript", "Node.js", "GraphQL", "AWS"],
  },
  {
    id: "2",
    title: "Full Stack Engineer",
    company: "StartupXYZ",
    location: "New York, NY",
    type: "remote",
    salary: "$130k - $170k",
    postedAt: "5 days ago",
    matchScore: 87,
    skills: ["Python", "React", "PostgreSQL", "Docker"],
  },
];

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export const JobsProvider = ({ children }: { children: ReactNode }) => {
  const [availableJobs, setAvailableJobs] = useState<Job[]>(initialJobs);
  const [savedJobs, setSavedJobs] = useState<Job[]>(initialSavedJobs);
  const [applications, setApplications] = useState<Application[]>([]);

  const removeFromAvailable = (jobId: string) => {
    setAvailableJobs((prev) => prev.filter((job) => job.id !== jobId));
  };

  const removeFromSaved = (jobId: string) => {
    setSavedJobs((prev) => prev.filter((job) => job.id !== jobId));
  };

  const saveJob = (job: Job) => {
    if (!savedJobs.find((j) => j.id === job.id)) {
      setSavedJobs((prev) => [...prev, job]);
    }
  };

  const applyToJob = (job: Job) => {
    // Remove from available and saved
    setAvailableJobs((prev) => prev.filter((j) => j.id !== job.id));
    setSavedJobs((prev) => prev.filter((j) => j.id !== job.id));

    // Add to applications if not already applied
    if (!applications.find((a) => a.id === job.id)) {
      const newApplication: Application = {
        id: job.id,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        appliedAt: "Just now",
        status: "Application Sent",
        matchScore: job.matchScore,
      };
      setApplications((prev) => [...prev, newApplication]);
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
        removeFromAvailable,
        removeFromSaved,
        saveJob,
        applyToJob,
        isJobSaved,
        isJobApplied,
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
