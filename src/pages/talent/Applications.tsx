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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const rawDetail =
    job.detail_response !== undefined
      ? job.detail_response
      : apiApp.detail_response !== undefined
      ? apiApp.detail_response
      : undefined;

  return {
    id: apiApp.id,
    jobTitle: job.title || "",
    company: job.company || "",
    location: job.location || "",
    appliedAt: apiApp.applied_at
      ? formatDistanceToNow(new Date(apiApp.applied_at), { addSuffix: true })
      : "Just now",
    status: apiApp.status || "Application Sent",
    matchScore: job.match_score ?? apiApp.match_score ?? 0,
    matchSummary:
      typeof job.match_summary === "string"
        ? job.match_summary
        : typeof apiApp.match_summary === "string"
        ? apiApp.match_summary
        : undefined,
    detailResponse: rawDetail
      ? (() => {
          try {
            return typeof rawDetail === "string" ? JSON.parse(rawDetail) : rawDetail;
          } catch {
            return rawDetail;
          }
        })()
      : undefined,
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
  const [matchDetailsOpen, setMatchDetailsOpen] = useState(false);
  const [selectedApplicationForMatch, setSelectedApplicationForMatch] = useState<any | null>(null);

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
                    <Badge
                      variant={getMatchVariant(application.matchScore ?? 0)}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedApplicationForMatch(application);
                        setMatchDetailsOpen(true);
                      }}
                      title="Click to see how this match score was calculated"
                    >
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

      {/* Match Details Dialog */}
      <Dialog open={matchDetailsOpen} onOpenChange={setMatchDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Overall Match</DialogTitle>
            <DialogDescription>
              Detailed scoring and explanation for why this job was recommended.
            </DialogDescription>
          </DialogHeader>
          {selectedApplicationForMatch && (
            <div className="space-y-4 text-sm">
              {(() => {
                const raw = selectedApplicationForMatch.detailResponse;
                if (!raw) {
                  return selectedApplicationForMatch.matchSummary ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedApplicationForMatch.matchSummary}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No match details available.
                    </p>
                  );
                }

                const details =
                  typeof raw === "string"
                    ? (() => {
                        try {
                          return JSON.parse(raw);
                        } catch {
                          return null;
                        }
                      })()
                    : raw;

                if (!details || typeof details !== "object") {
                  return (
                    <div className="space-y-4">
                      <div>
                        <p className="font-semibold">
                          Summary (Match Score:{" "}
                          {selectedApplicationForMatch.matchScore ?? "N/A"}%)
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Raw Details (detail_response)</p>
                        <pre className="mt-2 max-h-64 overflow-auto rounded-md border bg-background/50 p-2 text-[11px] leading-relaxed">
                          {String(raw)}
                        </pre>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold">
                        Summary (Match Score:{" "}
                        {details.score ?? selectedApplicationForMatch.matchScore ?? "N/A"}%)
                      </p>
                      {details.summary || selectedApplicationForMatch.matchSummary ? (
                        <p className="mt-1 text-muted-foreground">
                          {details.summary ?? selectedApplicationForMatch.matchSummary}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <p className="font-semibold">Overall Score</p>
                      <p className="text-muted-foreground">
                        Final overall score:{" "}
                        {details.score ?? selectedApplicationForMatch.matchScore ?? "N/A"} / 100
                      </p>
                    </div>

                    {Array.isArray(details.skills) && details.skills.length > 0 && (
                      <div>
                        <p className="font-semibold">Skills</p>
                        <div className="mt-2 space-y-2">
                          {details.skills.map((s: any) => (
                            <div key={s.name}>
                              <p className="font-medium">{s.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Match type: {s.match_type}, Experience: {s.years_experience}
                              </p>
                              {Array.isArray(s.evidence) && s.evidence.length > 0 && (
                                <p className="text-xs">
                                  Evidence: {s.evidence.join(", ")}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {details.notes_score_breakdown && (
                      <div>
                        <p className="font-semibold">Score Breakdown</p>
                        <div className="mt-2 space-y-2">
                          {Object.values(
                            details.notes_score_breakdown as Record<string, any>
                          ).map((note: any, idx: number) => (
                            <div key={idx}>
                              <p className="text-xs font-medium">{note.note_text}</p>
                              <p className="text-xs text-muted-foreground">
                                Score: {note.score} / {note.max_points} (weight {note.weight})
                              </p>
                              {note.match_summary && (
                                <p className="text-xs text-muted-foreground">
                                  {note.match_summary}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
