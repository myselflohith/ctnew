import DashboardLayout from "@/components/layout/DashboardLayout";
import JobDescriptionDialog from "@/components/talent/JobDescriptionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  Search,
  FileText,
  Heart,
  Settings,
  Building2,
  MapPin,
  Clock,
  Calendar,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useJobs } from "@/contexts/JobsContext";
import { apiClient } from "@/lib/api";

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Interview Scheduled":
      return "excellent";
    case "Under Review":
      return "good";
    case "Application Sent":
      return "secondary";
    case "Rejected":
      return "destructive";
    default:
      return "outline";
  }
};

const getMatchVariant = (score: number) => {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  return "fair";
};

// Map API application response to same shape as JobsContext applications
const mapApiApplication = (apiApp: any) => {
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
    matchScore: job.match_score ?? 0,
    type: job.type,
    salary: job.salary,
    postedAt: job.posted_at
      ? formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })
      : undefined,
    skills: job.skills || [],
    description: job.description,
  };
};

const TalentApplications = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [jobDescriptionOpen, setJobDescriptionOpen] = useState(false);
  const [selectedJobForView, setSelectedJobForView] = useState<any>(null);
  const { applications, refetch } = useJobs();

  // Refetch applications (and related data) when user navigates to this page so list is up to date
  useEffect(() => {
    refetch();
  }, [refetch]);

  // When search query changes, debounce and call API (server-side search)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setLoadingSearch(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await apiClient.getApplications(trimmed);
        const list = Array.isArray(res.data) ? res.data : [];
        setSearchResults(list.map(mapApiApplication));
      } catch {
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;
  const displayApplications = isSearching ? (searchResults ?? []) : applications;

  const totalApplications = applications.length;
  const inProgress = applications.filter(a => a.status === "Under Review" || a.status === "Application Sent").length;
  const interviews = applications.filter(a => a.status === "Interview Scheduled").length;
  const rejected = applications.filter(a => a.status === "Rejected").length;

  const handleViewJob = (application: typeof applications[0]) => {
    // Convert application to job format for the dialog
    const jobForView = {
      id: application.id,
      title: application.jobTitle,
      company: application.company,
      location: application.location,
      type: application.type || "remote" as const,
      salary: application.salary,
      postedAt: application.postedAt || application.appliedAt,
      matchScore: application.matchScore,
      skills: application.skills || [],
      description: application.description,
    };
    setSelectedJobForView(jobForView);
    setJobDescriptionOpen(true);
  };

  return (
    <DashboardLayout role="talent">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          My Applications
        </h1>
        <p className="text-muted-foreground">
          Track the status of all your job applications.
        </p>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-4 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search applications by job title or company..."
            className="pl-12 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalApplications}</p>
          <p className="text-sm text-muted-foreground">Total Applications</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{inProgress}</p>
          <p className="text-sm text-muted-foreground">In Progress</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{interviews}</p>
          <p className="text-sm text-muted-foreground">Interviews</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{rejected}</p>
          <p className="text-sm text-muted-foreground">Rejected</p>
        </div>
      </div>

      {/* Applications List */}
      {applications.length > 0 || isSearching ? (
        <div className="glass rounded-2xl p-6">
          {isSearching && (
            <p className="text-sm text-muted-foreground mb-4">
              {loadingSearch
                ? "Searching..."
                : `Showing ${displayApplications.length} result${displayApplications.length !== 1 ? "s" : ""} for "${searchQuery.trim()}"`}
            </p>
          )}
          <div className="space-y-4">
            {loadingSearch ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>Loading...</p>
              </div>
            ) : displayApplications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No applications match &quot;{searchQuery.trim()}&quot;</p>
                <p className="text-sm mt-1">Try a different job title or company name.</p>
              </div>
            ) : (
              displayApplications.map((application) => (
                <div
                  key={application.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 
                        className="font-medium text-foreground cursor-pointer hover:text-primary underline-offset-4 hover:underline"
                        onClick={() => handleViewJob(application)}
                      >
                        {application.jobTitle}
                      </h3>
                      <p className="text-sm text-muted-foreground">{application.company}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {application.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Applied {application.appliedAt}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={getMatchVariant(application.matchScore ?? 0)}>
                      {(application.matchScore ?? 0)}% Match
                    </Badge>
                    <Badge variant={getStatusVariant(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            No applications yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Start applying to jobs to see them here.
          </p>
          <Button variant="hero" onClick={() => navigate("/talent/jobs")}>Find Jobs</Button>
        </div>
      )}

      {/* Job Description Dialog */}
      <JobDescriptionDialog
        open={jobDescriptionOpen}
        onOpenChange={setJobDescriptionOpen}
        job={selectedJobForView}
      />
    </DashboardLayout>
  );
};

export default TalentApplications;
