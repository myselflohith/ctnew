import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  Eye,
  ArrowRight,
  MoreVertical,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { employerNavItems } from "@/components/layout/navItems";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Job {
  id: string;
  title: string;
  status: string;
  applicants: number;
  newApplicants: number;
  views: number;
  postedAt: string;
}

interface Candidate {
  id: string;
  name: string;
  role: string;
  matchScore: number;
  rank: number;
  status: string;
  interview?: {
    id: string;
    interview_type?: string;
    scheduled_date?: string;
    scheduled_time?: string;
    status?: string;
  } | null;
}

interface InterviewItem {
  id: string;
  interview_type?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  interviewer?: string;
  status?: string;
  application?: {
    id?: string;
    candidate_name?: string;
    candidate_email?: string;
    job?: { title?: string };
  };
}

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [allInterviews, setAllInterviews] = useState<InterviewItem[]>([]);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [showAllInterviews, setShowAllInterviews] = useState(false);
  const [candidateMatchDialogOpen, setCandidateMatchDialogOpen] = useState(false);
  const [selectedCandidateForMatch, setSelectedCandidateForMatch] = useState<Candidate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = apiClient.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch jobs
        const jobsResponse = await apiClient.getAllJobs();
        if (jobsResponse.success && jobsResponse.data) {
          // Get applications to calculate stats
          const applicationsResponse = await apiClient
            .getApplications()
            .catch(() => ({ success: false, data: [] as any[] }));
          const applications = applicationsResponse.success
            ? ((applicationsResponse.data as any[]) ?? [])
            : [];

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

          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          const jobsData = (jobsResponse.data as any[]) ?? [];

          // Filter jobs to only those belonging to the logged-in employer's company
          const userResponse = await apiClient
            .getCurrentUser()
            .catch(() => ({ success: false, user: null as any }));
          const companyName = userResponse.user?.company_name as string | undefined;
          const employerJobs = companyName
            ? jobsData.filter((job: any) => job.company === companyName)
            : jobsData;

          const allJobsWithStats = employerJobs.map((job: any) => {
            const jobApplications = applicationsByJob[job.id] || [];
            const newApplicants = jobApplications.filter((app: any) => {
              const appliedDate = new Date(app.applied_at || app.appliedAt);
              return appliedDate >= oneWeekAgo;
            }).length;

            return {
              id: job.id,
              title: job.title,
              status: job.status || "active",
              applicants: jobApplications.length,
              newApplicants: newApplicants,
              views: 0,
              postedAt: job.posted_at
                ? formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })
                : "Recently",
            };
          });

          setAllJobs(allJobsWithStats);
          setJobs(allJobsWithStats.slice(0, 3));
        }
        
        // Fetch candidates (from applications for employer's jobs)
        const applicationsResponse = await apiClient
          .getApplications()
          .catch(() => ({ success: false, data: [] as any[] }));
        const apps = applicationsResponse.success
          ? ((applicationsResponse.data as any[]) ?? [])
          : [];
        if (apps.length) {
          // Sort by match score and get all candidates
          const sortedApplications = [...apps].sort((a: any, b: any) => {
            const scoreA = a.job?.match_score || 0;
            const scoreB = b.job?.match_score || 0;
            return scoreB - scoreA;
          });
          
          const allCandidatesData = sortedApplications.map((app: any, index: number) => ({
            id: app.id,
            name: app.candidate_name || `Candidate ${index + 1}`,
            role: app.job?.title || "Unknown",
            matchScore: app.job?.match_score || 0,
            rank: index + 1,
            status: app.status || "New",
            interview: app.interview || null,
          }));
          
          setAllCandidates(allCandidatesData);
          setCandidates(allCandidatesData.slice(0, 3));
        }

        // Fetch scheduled interviews (authoritative source for "Interview Scheduled")
        const interviewsResponse = await apiClient
          .getInterviews({ status: "active" })
          .catch(() => ({ success: false, data: [] }));
        const interviewList = interviewsResponse.success
          ? ((interviewsResponse.data as any[]) ?? [])
          : [];

        // Employer expectation for "Interviews Scheduled" on dashboard (based on user feedback):
        // show COUNT OF CREATED INTERVIEWS (active/not archived), regardless of candidate completion.
        // We'll still keep a separate "onlyScheduled" list for future use, but metric uses `interviewList.length`.
        const onlyScheduled = [...interviewList].filter((i: any) => {
          const s = (i.status || "").toString().toLowerCase();
          return s === "pending" || s === "in progress";
        });

        // Sort newest first
        interviewList.sort((a: any, b: any) => {
          const da = a.created_at ? new Date(a.created_at).getTime() : 0;
          const db = b.created_at ? new Date(b.created_at).getTime() : 0;
          return db - da;
        });

        setAllInterviews(interviewList);
        setAllInterviews(onlyScheduled);
        setInterviews(onlyScheduled.slice(0, 3));
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        setJobs([]);
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout
      role="employer"
      navItems={employerNavItems}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Employer Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your jobs and find the best candidates.
          </p>
        </div>
        <Button variant="hero" onClick={() => navigate("/employer/jobs/new")}>
          <Plus className="w-5 h-5 mr-2" />
          Post New Job
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <button onClick={() => navigate("/employer/candidates")} className="text-left">
          <MetricCard
            title="Applications"
            value={loading ? "..." : jobs.reduce((sum, j) => sum + j.applicants, 0)}
            change=""
            changeType="neutral"
            icon={<Users className="w-6 h-6" />}
            variant="amber"
          />
        </button>
        <button
          onClick={() => navigate("/employer/interviews")}
          className="text-left"
        >
          <MetricCard
            title="Interview Scheduled"
            value={loading ? "..." : allInterviews.length}
            change=""
            changeType="neutral"
            icon={<Clock className="w-6 h-6" />}
            variant="success"
          />
        </button>
        <button onClick={() => navigate("/employer/jobs")} className="text-left">
          <MetricCard
            title="Total Jobs"
            value={loading ? "..." : allJobs.length}
            change=""
            changeType="neutral"
            icon={<CheckCircle className="w-6 h-6" />}
          />
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Active Jobs */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Your Jobs
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="group" 
              onClick={() => navigate("/employer/jobs")}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Loading jobs...</p>
            ) : jobs.length > 0 ? (
              jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-foreground">
                      <Link
                        to={`/employer/jobs/${job.id}`}
                        className="hover:underline"
                      >
                        {job.title}
                      </Link>
                    </h3>
                    <Badge variant={job.status === "active" ? "active" : "closed"}>
                      {job.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {job.applicants} applicants
                      {job.newApplicants > 0 && (
                        <span className="text-primary ml-1">
                          (+{job.newApplicants} new)
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {job.views} views
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Candidates</DropdownMenuItem>
                    <DropdownMenuItem>Edit Job</DropdownMenuItem>
                    <DropdownMenuItem>Pause Job</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No jobs posted yet</p>
            )}
          </div>
        </div>

        {/* Top Candidates */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Top Candidates
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="group" 
              onClick={() => setShowAllCandidates(!showAllCandidates)}
            >
              {showAllCandidates ? "Show Less" : "View All"}
              <ArrowRight className={`w-4 h-4 ml-1 transition-transform ${showAllCandidates ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
            </Button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Loading candidates...</p>
            ) : (showAllCandidates ? allCandidates : candidates).length > 0 ? (
              (showAllCandidates ? allCandidates : candidates).map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cardinal to-amber flex items-center justify-center text-white font-semibold">
                    {candidate.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{candidate.name}</h3>
                    <p className="text-sm text-muted-foreground">{candidate.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge
                      variant={
                        candidate.matchScore >= 90
                          ? "excellent"
                          : candidate.matchScore >= 80
                          ? "good"
                          : "fair"
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedCandidateForMatch(candidate);
                        setCandidateMatchDialogOpen(true);
                      }}
                      title="Click to see how this match score was calculated"
                    >
                      {candidate.matchScore}% Match
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rank #{candidate.rank}
                    </p>
                  </div>
                  <Badge variant="outline">{candidate.status}</Badge>
                </div>
              </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No candidates yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Match details dialog for top candidates */}
      <Dialog open={candidateMatchDialogOpen} onOpenChange={setCandidateMatchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Overall Match</DialogTitle>
            <DialogDescription>
              High scores indicate strong alignment between this candidate and your open roles.
            </DialogDescription>
          </DialogHeader>
          {selectedCandidateForMatch && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{selectedCandidateForMatch.name}</p>
                <p className="text-xs text-muted-foreground">
                  Rank #{selectedCandidateForMatch.rank} • {selectedCandidateForMatch.role}
                </p>
              </div>
              <p>
                <span className="font-semibold">Match score:</span>{" "}
                {Math.round(selectedCandidateForMatch.matchScore)}%
              </p>
              <p className="text-xs text-muted-foreground">
                This dashboard preview shows the candidate&apos;s overall match score. For full
                scoring details and breakdown, open the candidate in the{" "}
                <span className="font-semibold">Candidates</span> or{" "}
                <span className="font-semibold">Resume Database</span> pages.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EmployerDashboard;
