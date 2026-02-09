import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  Plus,
  Eye,
  MoreVertical,
  MapPin,
  Clock,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import JobDescriptionDialog from "@/components/talent/JobDescriptionDialog";
import EditJobModal from "@/components/employer/EditJobModal";
import CloseJobModal from "@/components/employer/CloseJobModal";
import { toast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Calendar, label: "Interviews", path: "/employer/interviews" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

interface Job {
  id: string;
  title: string;
  company?: string;
  location: string;
  type: string;
  status: string;
  applicants: number;
  newApplicants: number;
  views: number;
  postedAt: string;
  salary?: string;
  match_score?: number;
  skills?: string[];
  description?: string;
}

const EmployerJobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobForView, setSelectedJobForView] = useState<any>(null);
  const [jobDescriptionOpen, setJobDescriptionOpen] = useState(false);
  const [selectedJobForEdit, setSelectedJobForEdit] = useState<Job | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedJobForClose, setSelectedJobForClose] = useState<Job | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    const fetchJobs = async () => {
      const token = apiClient.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch all jobs (employer can see all jobs)
        const jobsResponse = await apiClient.getAllJobs();
        
        if (jobsResponse.success && jobsResponse.data) {
          // Get applications for employer's jobs
          const applicationsResponse = await apiClient.getApplications().catch(() => ({ success: false, data: [] }));
          const applications = applicationsResponse.success ? applicationsResponse.data : [];
          
          // Group applications by job_id
          const applicationsByJob: Record<string, any[]> = {};
          applications.forEach((app: any) => {
            const jobId = app.job_id || app.job?.id;
            if (jobId) {
              if (!applicationsByJob[jobId]) {
                applicationsByJob[jobId] = [];
              }
              applicationsByJob[jobId].push(app);
            }
          });
          
          // Get user's company name to filter jobs
          const userResponse = await apiClient.getCurrentUser().catch(() => ({ success: false, user: null }));
          const companyName = userResponse.user?.company_name;
          
          // Filter jobs by company if available
          const employerJobs = companyName 
            ? jobsResponse.data.filter((job: any) => job.company === companyName)
            : jobsResponse.data;
          
          // Store company name for later use
          if (companyName) {
            setCompanyName(companyName);
          }
          
          // Map jobs with stats
          const jobsWithStats = employerJobs.map((job: any) => {
            const jobApplications = applicationsByJob[job.id] || [];
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const newApplicants = jobApplications.filter((app: any) => {
              const appliedDate = new Date(app.applied_at || app.appliedAt);
              return appliedDate >= oneWeekAgo;
            }).length;
            
            return {
              id: job.id,
              title: job.title,
              location: job.location,
              type: job.type.charAt(0).toUpperCase() + job.type.slice(1),
              status: job.status || "active",
              applicants: jobApplications.length,
              newApplicants: newApplicants,
              views: 0, // Views tracking can be added later
              postedAt: job.posted_at 
                ? formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })
                : "Recently",
            };
          });
          
          setJobs(jobsWithStats);
        } else {
          setJobs([]);
        }
      } catch (error: any) {
        console.error("Error fetching jobs:", error);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleViewJob = async (job: Job) => {
    try {
      // Fetch full job details
      const jobResponse = await apiClient.getJobById(job.id);
      if (jobResponse.success && jobResponse.data) {
        const fullJob = jobResponse.data;
        const jobForView = {
          id: fullJob.id,
          title: fullJob.title,
          company: fullJob.company || companyName || "",
          location: fullJob.location,
          type: fullJob.type.toLowerCase() as "remote" | "hybrid" | "onsite",
          salary: fullJob.salary,
          postedAt: fullJob.posted_at || fullJob.postedAt || new Date().toISOString(),
          matchScore: fullJob.match_score || 0,
          skills: fullJob.skills || [],
          description: fullJob.description || "",
        };
        setSelectedJobForView(jobForView);
        setJobDescriptionOpen(true);
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
      toast.error("Failed to load job details");
    }
  };

  const handleEditJob = async (jobId: string, jobData: Partial<Job>) => {
    try {
      await apiClient.updateJob(jobId, jobData);
      toast.success("Job updated successfully");
      // Refetch jobs by reloading the page data
      window.location.reload();
    } catch (error: any) {
      console.error("Error updating job:", error);
      toast.error(error.message || "Failed to update job");
    }
  };

  const handlePauseJob = async (jobId: string) => {
    try {
      await apiClient.updateJobStatus(jobId, "paused");
      toast.success("Job paused successfully");
      // Refetch jobs
      window.location.reload(); // Simple refresh for now
    } catch (error: any) {
      console.error("Error pausing job:", error);
      toast.error(error.message || "Failed to pause job");
    }
  };

  const handleCloseJob = async (reason: string) => {
    if (!selectedJobForClose) return;
    try {
      await apiClient.updateJobStatus(selectedJobForClose.id, "closed", reason);
      toast.success("Job closed successfully");
      setSelectedJobForClose(null);
      // Refetch jobs
      window.location.reload();
    } catch (error: any) {
      console.error("Error closing job:", error);
      toast.error(error.message || "Failed to close job");
    }
  };

  const handleViewCandidates = (jobId: string) => {
    navigate(`/employer/candidates?jobId=${jobId}`);
  };

  // Filter jobs by status
  const filteredJobs = filterStatus 
    ? jobs.filter(job => job.status === filterStatus)
    : jobs;

  // Calculate stats
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.status === "active").length;
  const totalApplicants = jobs.reduce((sum, j) => sum + j.applicants, 0);
  const newThisWeek = jobs.reduce((sum, j) => sum + j.newApplicants, 0);

  return (
    <DashboardLayout
      role="employer"
      navItems={navItems}
      userName="Jane Smith"
      companyName="TechCorp AI"
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Jobs
          </h1>
          <p className="text-muted-foreground">
            Manage all your job postings in one place.
          </p>
        </div>
        <Button variant="hero" onClick={() => navigate("/employer/jobs/new")}>
          <Plus className="w-5 h-5 mr-2" />
          Post New Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setFilterStatus(null)}
          className="glass rounded-xl p-4 text-center hover:bg-secondary/50 transition-colors cursor-pointer"
        >
          <p className="text-2xl font-bold text-foreground">{loading ? "..." : totalJobs}</p>
          <p className="text-sm text-muted-foreground">Total Jobs</p>
        </button>
        <button
          onClick={() => setFilterStatus("active")}
          className="glass rounded-xl p-4 text-center hover:bg-secondary/50 transition-colors cursor-pointer"
        >
          <p className="text-2xl font-bold text-primary">
            {loading ? "..." : activeJobs}
          </p>
          <p className="text-sm text-muted-foreground">Active</p>
        </button>
        <button
          onClick={() => navigate("/employer/candidates")}
          className="glass rounded-xl p-4 text-center hover:bg-secondary/50 transition-colors cursor-pointer"
        >
          <p className="text-2xl font-bold text-amber-500">
            {loading ? "..." : totalApplicants}
          </p>
          <p className="text-sm text-muted-foreground">Total Applicants</p>
        </button>
        <button
          onClick={() => navigate("/employer/candidates")}
          className="glass rounded-xl p-4 text-center hover:bg-secondary/50 transition-colors cursor-pointer"
        >
          <p className="text-2xl font-bold text-green-500">
            {loading ? "..." : newThisWeek}
          </p>
          <p className="text-sm text-muted-foreground">New This Week</p>
        </button>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Loading jobs...</p>
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="glass rounded-2xl p-6">
          <div className="space-y-4">
            {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 
                      className="font-medium text-foreground cursor-pointer hover:text-primary underline-offset-4 hover:underline"
                      onClick={() => handleViewJob(job)}
                    >
                      {job.title}
                    </h3>
                    <Badge
                      variant={
                        job.status === "active"
                          ? "active"
                          : job.status === "paused"
                          ? "secondary"
                          : "closed"
                      }
                    >
                      {job.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                    <span>{job.type}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {job.postedAt}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleViewCandidates(job.id)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {job.applicants} applicant{job.applicants !== 1 ? 's' : ''}
                    {job.newApplicants > 0 && (
                      <span className="text-primary ml-1">(+{job.newApplicants} new)</span>
                    )}
                  </span>
                </button>
                <div className="text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {job.views} views
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewCandidates(job.id)}>
                      View Candidates
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      // Fetch full job details before opening edit modal
                      try {
                        const jobResponse = await apiClient.getJobById(job.id);
                        if (jobResponse.success && jobResponse.data) {
                          const fullJob = jobResponse.data;
                          setSelectedJobForEdit({
                            id: fullJob.id,
                            title: fullJob.title,
                            company: fullJob.company || companyName || "",
                            location: fullJob.location,
                            type: fullJob.type.toLowerCase() as "remote" | "hybrid" | "onsite",
                            salary: fullJob.salary,
                            match_score: fullJob.match_score,
                            skills: fullJob.skills,
                            description: fullJob.description || "",
                          });
                          setEditModalOpen(true);
                        } else {
                          toast.error("Failed to load job details");
                        }
                      } catch (error) {
                        console.error("Error fetching job details:", error);
                        toast.error("Failed to load job details");
                      }
                    }}>
                      Edit Job
                    </DropdownMenuItem>
                    {job.status === "active" && (
                      <DropdownMenuItem onClick={() => handlePauseJob(job.id)}>
                        Pause Job
                      </DropdownMenuItem>
                    )}
                    {job.status === "paused" && (
                      <DropdownMenuItem onClick={() => {
                        apiClient.updateJobStatus(job.id, "active").then(() => {
                          toast.success("Job activated");
                          window.location.reload();
                        });
                      }}>
                        Activate Job
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => {
                        setSelectedJobForClose(job);
                        setCloseModalOpen(true);
                      }}
                    >
                      Close Job
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            No jobs posted yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Get started by posting your first job opening.
          </p>
          <Button variant="hero" onClick={() => navigate("/employer/jobs/new")}>
            <Plus className="w-5 h-5 mr-2" />
            Post New Job
          </Button>
        </div>
      )}

      {/* Job Description Dialog */}
      {selectedJobForView && (
        <JobDescriptionDialog
          open={jobDescriptionOpen}
          onOpenChange={setJobDescriptionOpen}
          job={selectedJobForView}
        />
      )}

      {/* Edit Job Modal */}
      {selectedJobForEdit && (
        <EditJobModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          job={selectedJobForEdit}
          onSave={handleEditJob}
        />
      )}

      {/* Close Job Modal */}
      {selectedJobForClose && (
        <CloseJobModal
          open={closeModalOpen}
          onOpenChange={setCloseModalOpen}
          jobTitle={selectedJobForClose.title}
          onClose={(reason) => handleCloseJob(reason)}
        />
      )}
    </DashboardLayout>
  );
};

export default EmployerJobs;
