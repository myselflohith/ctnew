import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Filter,
  Mail,
  Calendar,
  Users,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import CandidateProfileModal from "@/components/employer/CandidateProfileModal";
import JobDescriptionDialog from "@/components/talent/JobDescriptionDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { employerNavItems } from "@/components/layout/navItems";

interface Candidate {
  id: string;              // application id
  applicationId: string;
  userId: string;
  jobId: string;
  name: string;
  email?: string;
  jobTitle: string;
  matchScore: number | null;
  rankScore: number | null;
  status: string;
  appliedAt: string | null;
  appliedAtRaw: string | null;
  resumeId?: string;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Interview Scheduled":
      return "excellent";
    case "Phone Screen":
      return "good";
    case "Under Review":
      return "secondary";
    case "New":
      return "outline";
    default:
      return "secondary";
  }
};

const EmployerCandidates = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobIdFilter = searchParams.get("jobId");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedJobForView, setSelectedJobForView] = useState<any>(null);
  const [jobDescriptionOpen, setJobDescriptionOpen] = useState(false);
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "rejected">("all");
  const [matchMin, setMatchMin] = useState<number>(0);
  const [matchMax, setMatchMax] = useState<number>(100);
  const [rankMin, setRankMin] = useState<number>(0);
  const [rankMax, setRankMax] = useState<number>(100);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contactOpen, setContactOpen] = useState(false);
  const [contactBody, setContactBody] = useState("");

  useEffect(() => {
    const fetchCandidates = async () => {
      const token = apiClient.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let applicationsResponse;
        
        // If jobId filter is provided, fetch applications for that specific job
        if (jobIdFilter) {
          applicationsResponse = await apiClient.getJobApplications(jobIdFilter).catch(() => ({ success: false, data: [] }));
        } else {
          // Otherwise, get all applications (employer view)
          applicationsResponse = await apiClient.getApplications().catch(() => ({ success: false, data: [] }));
        }
        
        if (applicationsResponse.success && applicationsResponse.data) {
          const rawApps: any[] = applicationsResponse.data as any[];

          const candidatesData: Candidate[] = rawApps.map((app: any, index: number) => {
            const appliedAtRaw = app.applied_at ?? null;
            const appliedAtFormatted =
              appliedAtRaw != null
                ? formatDistanceToNow(new Date(appliedAtRaw), { addSuffix: true })
                : null;

            const name =
              app.candidate_name ||
              app.candidate_email ||
              `Candidate ${index + 1}`;

            return {
              id: String(app.id || app.application_id),
              applicationId: String(app.id || app.application_id),
              userId: String(app.user_id),
              jobId: String(app.job_id),
              name,
              email: app.candidate_email ?? undefined,
              jobTitle: app.job?.title || "Unknown Position",
              matchScore:
                typeof app.job?.match_score === "number"
                  ? app.job.match_score
                  : app.job?.match_score != null
                  ? Number(app.job.match_score)
                  : null,
              rankScore:
                typeof app.rank_score === "number"
                  ? app.rank_score
                  : app.rank_score != null
                  ? Number(app.rank_score)
                  : null,
              status: app.status || "Application Sent",
              appliedAt: appliedAtFormatted,
              appliedAtRaw: appliedAtRaw,
              resumeId: app.resume_id ?? undefined,
            };
          });

          setCandidates(candidatesData);
        } else {
          setCandidates([]);
        }
      } catch (error: any) {
        console.error("Error fetching candidates:", error);
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [jobIdFilter]);

  const allJobs = useMemo(
    () =>
      Array.from(
        new Map(
          candidates.map((c) => [c.jobId, c.jobTitle])
        ).entries()
      ).map(([id, title]) => ({ id, title })),
    [candidates]
  );

  // Filter + sort candidates
  const filteredCandidates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const minMatch = Number.isFinite(matchMin) ? matchMin : 0;
    const maxMatch = Number.isFinite(matchMax) ? matchMax : 100;
    const minRank = Number.isFinite(rankMin) ? rankMin : 0;
    const maxRank = Number.isFinite(rankMax) ? rankMax : 100;

    const base = candidates.filter((c) => {
      if (q) {
        const inName = c.name.toLowerCase().includes(q);
        const inJob = c.jobTitle.toLowerCase().includes(q);
        if (!inName && !inJob) return false;
      }

      if (jobFilter !== "all" && c.jobId !== jobFilter) return false;

      if (statusFilter === "active" && c.status === "Rejected") return false;
      if (statusFilter === "rejected" && c.status !== "Rejected") return false;

      const matchVal = c.matchScore ?? 0;
      if (matchVal < minMatch || matchVal > maxMatch) return false;

      const rankVal = c.rankScore ?? 0;
      if (rankVal < minRank || rankVal > maxRank) return false;

      return true;
    });

    // Sort: active first, then match desc, then rank desc, then applied date desc
    return base.sort((a, b) => {
      const aRejected = a.status === "Rejected";
      const bRejected = b.status === "Rejected";
      if (aRejected !== bRejected) return aRejected ? 1 : -1;
      const matchDiff = (b.matchScore ?? 0) - (a.matchScore ?? 0);
      if (matchDiff !== 0) return matchDiff;
      const rankDiff = (b.rankScore ?? 0) - (a.rankScore ?? 0);
      if (rankDiff !== 0) return rankDiff;
      const aTime = a.appliedAtRaw ? new Date(a.appliedAtRaw).getTime() : 0;
      const bTime = b.appliedAtRaw ? new Date(b.appliedAtRaw).getTime() : 0;
      return bTime - aTime;
    });
  }, [candidates, searchQuery, jobFilter, statusFilter, matchMin, matchMax, rankMin, rankMax]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = filteredCandidates.every((c) => next.has(c.id));
      if (allSelected) {
        filteredCandidates.forEach((c) => next.delete(c.id));
      } else {
        filteredCandidates.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const handleViewJob = async (jobId: string) => {
    try {
      const jobResponse = (await apiClient.getJobById(jobId)) as any;
      if (jobResponse.success && jobResponse.data) {
        const fullJob = jobResponse.data as any;
        const jobForView = {
          id: fullJob.id,
          title: fullJob.title,
          company: fullJob.company || "",
          location: fullJob.location,
          type: fullJob.type ? (fullJob.type.toLowerCase() as "remote" | "hybrid" | "onsite") : undefined,
          salary: fullJob.salary,
          postedAt: fullJob.posted_at || fullJob.postedAt || new Date().toISOString(),
          matchScore: fullJob.match_score || 0,
          skills: fullJob.skills || [],
          description: fullJob.description || "",
        };
        setSelectedJobForView(jobForView);
        setJobDescriptionOpen(true);
      }
    } catch (err) {
      console.error("Failed to load job", err);
    }
  };

  const handleEditJobFromDescription = (job: { id: string }) => {
    setJobDescriptionOpen(false);
    navigate(`/employer/jobs?jobId=${job.id}`);
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    const ids = candidates
      .filter((c) => selectedIds.has(c.id))
      .map((c) => c.applicationId);
    if (!ids.length) return;
    try {
      await Promise.all(
        ids.map((id) =>
          apiClient.updateApplicationStatus(id, newStatus).catch((err) => {
            console.error("Failed to update status for application", id, err);
          })
        )
      );
      setCandidates((prev) =>
        prev.map((c) =>
          selectedIds.has(c.id) ? { ...c, status: newStatus } : c
        )
      );
    } catch (err) {
      console.error("Bulk status update failed:", err);
    }
  };

  const handleOpenContact = () => {
    const selected = candidates.filter((c) => selectedIds.has(c.id));
    if (!selected.length) return;
    const first = selected[0];
    const body = `Dear ${first.name},

After reviewing your profile, I believe your background aligns well with the ${first.jobTitle} position.

Best regards,
[Your Name]`;
    setContactBody(body);
    setContactOpen(true);
  };

  const handleSendContact = () => {
    const selected = candidates.filter((c) => selectedIds.has(c.id));
    console.log("[EmployerCandidates] Contact email payload", {
      to: selected.map((c) => c.email).filter(Boolean),
      body: contactBody,
    });
    setContactOpen(false);
  };

  return (
    <DashboardLayout
      role="employer"
      navItems={employerNavItems}
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Candidates
        </h1>
        <p className="text-muted-foreground">
          Review and manage applicants across all your jobs.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="glass rounded-2xl p-4 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search candidates by name or job..."
              className="pl-12 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status</span>
              <select
                className="border rounded-md px-2 py-1 text-xs bg-background"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "active" | "rejected")
                }
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Job</span>
              <select
                className="border rounded-md px-2 py-1 text-xs bg-background max-w-[200px]"
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
              >
                <option value="all">All jobs</option>
                {allJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Match %</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={matchMin}
              onChange={(e) => setMatchMin(Number(e.target.value) || 0)}
              className="w-16 h-8 px-2"
            />
            <span>-</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={matchMax}
              onChange={(e) => setMatchMax(Number(e.target.value) || 100)}
              className="w-16 h-8 px-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>Rank %</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={rankMin}
              onChange={(e) => setRankMin(Number(e.target.value) || 0)}
              className="w-16 h-8 px-2"
            />
            <span>-</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={rankMax}
              onChange={(e) => setRankMax(Number(e.target.value) || 100)}
              className="w-16 h-8 px-2"
            />
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-muted-foreground">
          {selectedIds.size
            ? `${selectedIds.size} candidate${selectedIds.size === 1 ? "" : "s"} selected`
            : `${filteredCandidates.length} candidate${filteredCandidates.length === 1 ? "" : "s"} found`}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedIds.size}
            onClick={() => handleBulkStatusChange("Rejected")}
          >
            Reject
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={
              !candidates.some(
                (c) => selectedIds.has(c.id) && c.status === "Rejected"
              )
            }
            onClick={() => handleBulkStatusChange("Under Review")}
          >
            Cancel Rejection
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={!selectedIds.size}
            onClick={handleOpenContact}
          >
            Contact
          </Button>
        </div>
      </div>

      {/* Candidates List */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Loading candidates...</p>
        </div>
      ) : filteredCandidates.length > 0 ? (
        <div className="glass rounded-2xl p-0 overflow-hidden">
          <div className="min-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredCandidates.length > 0 &&
                        filteredCandidates.every((c) => selectedIds.has(c.id))
                      }
                      onChange={toggleSelectAllVisible}
                    />
                  </th>
                  <th className="px-4 py-2 text-left">Candidate</th>
                  <th className="px-4 py-2 text-left">Job Applied To</th>
                  <th className="px-4 py-2 text-left">Match %</th>
                  <th className="px-4 py-2 text-left">Rank %</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Applied</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className="border-t border-border/60 hover:bg-secondary/40"
                  >
                    <td className="px-4 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(candidate.id)}
                        onChange={() => toggleSelect(candidate.id)}
                      />
                    </td>
                    <td className="px-4 py-2 align-top">
                      <button
                        className="text-left"
                        onClick={() => {
                          setSelectedCandidate({
                            id: candidate.id,
                            userId: candidate.userId,
                            name: candidate.name,
                            email: candidate.email,
                            job: candidate.jobTitle,
                            matchScore: candidate.matchScore ?? undefined,
                            rankScore: candidate.rankScore ?? undefined,
                            status: candidate.status,
                            resumeId: candidate.resumeId,
                            appliedAt: candidate.appliedAt ?? undefined,
                          });
                          setProfileModalOpen(true);
                        }}
                      >
                        <div className="font-medium text-foreground">
                          {candidate.name}
                        </div>
                        {candidate.email && (
                          <div className="text-xs text-muted-foreground">
                            {candidate.email}
                          </div>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => handleViewJob(candidate.jobId)}
                        className="text-primary underline-offset-2 hover:underline text-left"
                      >
                        {candidate.jobTitle}
                      </button>
                    </td>
                    <td className="px-4 py-2 align-top">
                      {candidate.matchScore != null ? (
                        <Badge
                          variant={
                            candidate.matchScore >= 90
                              ? "excellent"
                              : candidate.matchScore >= 80
                              ? "good"
                              : "fair"
                          }
                        >
                          {Math.round(candidate.matchScore)}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      {candidate.rankScore != null ? (
                        <Badge
                          variant={
                            candidate.rankScore >= 90
                              ? "excellent"
                              : candidate.rankScore >= 80
                              ? "good"
                              : "secondary"
                          }
                        >
                          {Math.round(candidate.rankScore)}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <Badge variant={getStatusVariant(candidate.status)}>
                        {candidate.status === "Rejected" ? "Rejected" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 align-top">
                      {candidate.appliedAt ?? "-"}
                    </td>
                    <td className="px-4 py-2 align-top text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedIds(new Set([candidate.id]));
                            handleOpenContact();
                          }}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={
                                candidate.status === "Rejected"
                                  ? "Cancel rejection"
                                  : "Reject candidate"
                              }
                              onClick={() => {
                                setSelectedIds(new Set([candidate.id]));
                                handleBulkStatusChange(
                                  candidate.status === "Rejected"
                                    ? "Under Review"
                                    : "Rejected"
                                );
                              }}
                            >
                              <Calendar className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {candidate.status === "Rejected"
                              ? "Cancel rejection"
                              : "Reject candidate"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            {searchQuery ? 'No candidates found' : 'No candidates yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery 
              ? 'Try adjusting your search criteria.'
              : 'Candidates will appear here once they apply to your jobs.'}
          </p>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* Candidate Profile Modal */}
      {selectedCandidate && (
        <CandidateProfileModal
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          candidate={selectedCandidate}
        />
      )}

      {/* Job Description Modal (same as Jobs page) */}
      <JobDescriptionDialog
        open={jobDescriptionOpen}
        onOpenChange={setJobDescriptionOpen}
        job={selectedJobForView}
        onEditJob={handleEditJobFromDescription}
      />

      {/* Contact modal */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Contact candidates</DialogTitle>
            <DialogDescription>
              This email will be sent (individually) to the selected candidates. You can edit the text before sending.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="min-h-[180px]"
            value={contactBody}
            onChange={(e) => setContactBody(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setContactOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSendContact}>Send</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EmployerCandidates;
