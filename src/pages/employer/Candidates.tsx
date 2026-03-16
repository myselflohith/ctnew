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
  MoreHorizontal,
} from "lucide-react";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import CandidateProfileModal from "@/components/employer/CandidateProfileModal";
import JobDescriptionDialog from "@/components/talent/JobDescriptionDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { interviewsAPI } from "@/lib/api/interviews";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { employerNavItems } from "@/components/layout/navItems";
import { TimeSlotCalendar } from "@/components/human-interview/TimeSlotCalendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  const [contactSubject, setContactSubject] = useState("Regarding your application");
  const [contactMode, setContactMode] = useState<"single" | "bulk">("bulk");
  const [contactHint, setContactHint] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteStep, setInviteStep] = useState<"type" | "ai" | "human">("type");
  const [inviteType, setInviteType] = useState<"ai" | "human" | null>(null);

  const [inviteInterviews, setInviteInterviews] = useState<any[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>("");

  // Human interview calendar slots (ch-job-marketplace style: pick 3)
  const [humanSelectedSlots, setHumanSelectedSlots] = useState<any[]>([]);

  const employerDisplayName = useMemo(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      const u = raw ? JSON.parse(raw) : null;
      const first = (u?.first_name || u?.firstName || "").trim();
      const last = (u?.last_name || u?.lastName || "").trim();
      const full = `${first} ${last}`.trim();
      return full || (u?.name || u?.email || "Employer");
    } catch {
      return "Employer";
    }
  }, []);

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

  const buildEmailBody = (mode: "single" | "bulk", candidate: Candidate) => {
    const dear = mode === "bulk" ? "Dear [Candidate Name]," : `Dear ${candidate.name},`;
    const job = mode === "bulk" ? "[Job Position]" : (candidate.jobTitle || "[Job Position]");
    return `${dear}

Thank you for applying to the ${job} position. After reviewing your profile, I believe your background aligns well with what we are looking for and would love to connect for a brief conversation.

Best regards,
${employerDisplayName}`;
  };

  const handleOpenContact = (mode: "single" | "bulk") => {
    const selected = candidates.filter((c) => selectedIds.has(c.id));
    if (!selected.length) return;

    const first = selected[0];
    setContactMode(mode);
    setContactSubject(
      mode === "bulk"
        ? "Regarding your application to [Job Position]"
        : `Regarding your application to ${first.jobTitle}`
    );
    setContactBody(buildEmailBody(mode, first));

    if (mode === "bulk") {
      setContactHint('Do not replace the text "[Candidate Name]" or "[Job Position]".');
    } else {
      setContactHint(null);
    }

    setContactOpen(true);
  };

  const substitutePlaceholders = (body: string, candidateName: string, jobTitle: string) => {
    // Replace even if user edited it partially (best-effort).
    const safeName = candidateName || "Candidate";
    const safeJob = jobTitle || "the role";
    let out = body;

    // Preferred placeholders
    out = out.replace(/\[Candidate Name\]/g, safeName);
    out = out.replace(/\[Job Position\]/g, safeJob);

    // Backwards-compat: older placeholder
    out = out.replace(/\[Job Name\]/g, safeJob);

    // If they removed brackets, still try to detect common variants
    out = out.replace(/Candidate Name/g, safeName);
    out = out.replace(/Job Position/g, safeJob);

    // Backwards-compat: older placeholder
    out = out.replace(/Job Name/g, safeJob);

    return out;
  };

  const handleSendContact = async () => {
    const selected = candidates.filter((c) => selectedIds.has(c.id)).filter((c) => !!c.email);
    if (!selected.length) {
      setContactOpen(false);
      return;
    }

    setSendingEmail(true);
    try {
      if (contactMode === "single") {
        const c = selected[0];
        const finalBody = contactBody;
        await apiClient.request("/employer/candidates/email", {
          method: "POST",
          body: JSON.stringify({
            to: c.email,
            subject: contactSubject,
            body: finalBody,
            candidateName: c.name,
            jobTitle: c.jobTitle,
          }),
        });
      } else {
        await Promise.all(
          selected.map((c) => {
            const finalBody = substitutePlaceholders(contactBody, c.name, c.jobTitle);
            const finalSubject = substitutePlaceholders(contactSubject, c.name, c.jobTitle);
            return apiClient.request("/employer/candidates/email", {
              method: "POST",
              body: JSON.stringify({
                to: c.email,
                subject: finalSubject,
                body: finalBody,
                candidateName: c.name,
                jobTitle: c.jobTitle,
              }),
            });
          })
        );
      }

      toast.success("Email sent");
      setContactOpen(false);
    } catch (e) {
      console.error("Failed to send email", e);
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const loadInterviewsForInvite = async () => {
    // AI interview list (existing interviews)
    try {
      setInviteLoading(true);
      const resp: any = await apiClient.getInterviews().catch(() => ({ success: false, data: [] }));
      const list = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
      const mapped = list.map((it: any) => ({
        id: String(it.id),
        title: it.interview_title || `Interview #${it.id}`,
        jobId: String(it.job_id || ""),
      }));
      setInviteInterviews(mapped);
      // Default: pick first interview if not selected yet
      if (!selectedInterviewId && mapped.length) {
        setSelectedInterviewId(mapped[0].id);
      }
    } catch (e) {
      console.error("Failed to load interviews", e);
      setInviteInterviews([]);
    } finally {
      setInviteLoading(false);
    }
  };


  const handleOpenInvite = async () => {
    const selected = candidates.filter((c) => selectedIds.has(c.id)).filter((c) => !!c.email);
    if (!selected.length) return;

    // reset invite flow state
    setInviteStep("type");
    setInviteType(null);
    setHumanSelectedSlots([]);
    setSelectedInterviewId("");
    setInviteOpen(true);
  };

  const formatSlot = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;

    // Include weekday + timezone so the email is understandable.
    return d.toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const buildHumanInterviewEmailBody = (
    candidate: Candidate,
    slots: Array<{ startISO: string; endISO: string }>,
    scheduleUrl: string
  ) => {
    const jobTitle = candidate.jobTitle || "the role";

    const slotLines = (slots || [])
      .filter((s) => !!s?.startISO)
      .slice(0, 3)
      .map((s, idx) => {
        const startText = formatSlot(s.startISO);
        const endText = formatSlot(s.endISO);
        return `Slot ${idx + 1}: ${startText} - ${endText}`;
      })
      .join("\n");

    const slotParams = encodeURIComponent(
      JSON.stringify(
        (slots || [])
          .filter((s) => !!s?.startISO && !!s?.endISO)
          .slice(0, 3)
          .map((s) => ({ start: s.startISO, end: s.endISO }))
      )
    );

    const scheduleUrlWithPrefill = scheduleUrl
      ? `${scheduleUrl}${scheduleUrl.includes("?") ? "&" : "?"}prefillSlots=${slotParams}`
      : scheduleUrl;

    return `Dear ${candidate.name},

We'd like to schedule an interview for the ${jobTitle} position. Here are 3 proposed time slots:

${slotLines}

[button] Review and Book Slot
${scheduleUrlWithPrefill}

If you'd like a different time, you can adjust the timing in the calendar after opening the link (or request a different time).

Best regards,
${employerDisplayName}`;
  };

  const handleSendInvite = async () => {
    const selected = candidates.filter((c) => selectedIds.has(c.id)).filter((c) => !!c.email);
    if (!selected.length) {
      setInviteOpen(false);
      return;
    }

    if (inviteType === "ai") {
      const interviewIdNum = Number(selectedInterviewId);
      if (!interviewIdNum || Number.isNaN(interviewIdNum)) {
        toast.error("Please select an AI interview");
        return;
      }

      setInviteSending(true);
      try {
        await Promise.all(
          selected.map((c) =>
            interviewsAPI.inviteCandidate(interviewIdNum, c.name, c.email || "")
          )
        );
        toast.success("AI interview invite sent");
        setInviteOpen(false);
      } catch (e) {
        console.error("Failed to send AI invite", e);
        toast.error("Failed to send AI interview invite");
      } finally {
        setInviteSending(false);
      }
      return;
    }

    if (inviteType === "human") {
      const filled = (humanSelectedSlots || []).filter((s: any) => !!s?.startISO).slice(0, 3);
      if (filled.length < 3) {
        toast.error("Please select 3 availability slots");
        return;
      }

      setInviteSending(true);
      try {
        const results = await Promise.allSettled(
          selected.map(async (c) => {
            // Create/ensure a scheduling record and get the public scheduling URL.
            const reqResp: any = await apiClient.request("/human-interview/request", {
              method: "POST",
              body: JSON.stringify({
                candidateName: c.name,
                candidateEmail: c.email,
                jobId: Number(c.jobId),
              }),
            });

            const scheduleUrl =
              (reqResp as any)?.data?.scheduleUrl ||
              (reqResp as any)?.scheduleUrl ||
              (reqResp as any)?.data?.data?.scheduleUrl ||
              "";

            const body = buildHumanInterviewEmailBody(c, filled, scheduleUrl || "");
            return apiClient.request("/employer/candidates/email", {
              method: "POST",
              body: JSON.stringify({
                to: c.email,
                subject: `Interview availability for ${c.jobTitle}`,
                body,
              }),
            });
          })
        );

        const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
        if (failed.length) {
          console.error("Some human interview emails failed", failed);
          toast.error(`Failed to send ${failed.length} email(s). Check console for details.`);
          return;
        }

        toast.success("Human interview availability sent");
        setInviteOpen(false);
      } catch (e) {
        console.error("Failed to send human interview email", e);
        toast.error("Failed to send human interview availability");
      } finally {
        setInviteSending(false);
      }
      return;
    }

    toast.error("Please select AI or Human interview");
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!selectedIds.size}>
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem title="Reject" onClick={() => handleBulkStatusChange("Rejected")}>
              Reject
            </DropdownMenuItem>
            <DropdownMenuItem
              title="Cancel Rejection"
              disabled={
                !candidates.some((c) => selectedIds.has(c.id) && c.status === "Rejected")
              }
              onClick={() => handleBulkStatusChange("Under Review")}
            >
              Cancel Rejection
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem title="Email Candidate" onClick={() => handleOpenContact("bulk")}>
              Email Candidate
            </DropdownMenuItem>
            <DropdownMenuItem title="Invite for Interview" onClick={handleOpenInvite}>
              Invite for Interview
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Actions">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              title={candidate.status === "Rejected" ? "Cancel Rejection" : "Reject"}
                              onClick={() => {
                                setSelectedIds(new Set([candidate.id]));
                                handleBulkStatusChange(
                                  candidate.status === "Rejected" ? "Under Review" : "Rejected"
                                );
                              }}
                            >
                              {candidate.status === "Rejected" ? "Cancel Rejection" : "Reject"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              title="Email Candidate"
                              onClick={() => {
                                setSelectedIds(new Set([candidate.id]));
                                handleOpenContact("single");
                              }}
                            >
                              Email Candidate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              title="Invite for Interview"
                              onClick={async () => {
                                setSelectedIds(new Set([candidate.id]));
                                await handleOpenInvite();
                              }}
                            >
                              Invite for Interview
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Email modal */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Email Candidate</DialogTitle>
            <DialogDescription>
              {contactMode === "bulk"
                ? "This email will be sent to the selected candidates."
                : "This email will be sent to the selected candidate."}
            </DialogDescription>
          </DialogHeader>

          {contactHint && (
            <div className="text-xs text-muted-foreground">{contactHint}</div>
          )}

          <div className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Subject</div>
              <Input
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
              />
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Message</div>
              <Textarea
                className="min-h-[220px]"
                value={contactBody}
                onChange={(e) => setContactBody(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setContactOpen(false)} disabled={sendingEmail}>
              Cancel
            </Button>
            <Button onClick={handleSendContact} disabled={sendingEmail}>
              {sendingEmail ? "Sending..." : "Send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite for interview modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Invite for Interview</DialogTitle>
            <DialogDescription>
              {inviteStep === "type"
                ? "Choose AI interview or Human interview."
                : inviteStep === "ai"
                ? "Select an existing AI interview, or create a new one."
                : "Select 3 availability slots to email the candidate(s)."}
            </DialogDescription>
          </DialogHeader>

          {inviteStep === "type" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setInviteType("human");
                    setInviteStep("human");
                    setHumanSelectedSlots([]);
                  }}
                  disabled={inviteSending}
                >
                  Human Interview
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    setInviteType("ai");
                    setInviteStep("ai");
                    await loadInterviewsForInvite();
                  }}
                  disabled={inviteSending}
                >
                  AI Interview
                </Button>
              </div>
            </div>
          )}

          {inviteStep === "ai" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-1">AI Interview</div>
                <select
                  className="border rounded-md px-2 py-2 text-sm bg-background w-full"
                  value={selectedInterviewId}
                  onChange={(e) => setSelectedInterviewId(e.target.value)}
                  disabled={inviteLoading || inviteSending}
                >
                  {inviteInterviews.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.title}
                    </option>
                  ))}
                </select>

                {!inviteInterviews.length && !inviteLoading && (
                  <div className="text-xs text-muted-foreground">
                    No AI interviews found.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const selected = candidates
                      .filter((c) => selectedIds.has(c.id))
                      .filter((c) => !!c.email)
                      .map((c) => ({
                        name: c.name,
                        email: c.email || "",
                      }));

                    localStorage.setItem("prefillInterviewCandidates", JSON.stringify(selected));
                    navigate("/employer/interviews/setup?type=ai&prefill=1");
                  }}
                  disabled={inviteSending}
                >
                  Create New
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setInviteStep("type")}
                    disabled={inviteSending}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSendInvite}
                    disabled={
                      inviteSending ||
                      inviteLoading ||
                      !inviteInterviews.length ||
                      !selectedInterviewId
                    }
                  >
                    {inviteSending ? "Sending..." : "Send Invite"}
                  </Button>
                </div>
              </div>
            </div>
          )}


          {inviteStep === "human" && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Select 3 availability slots. These will be emailed to each selected candidate (their own job title will be used).
              </div>

              {/* Calendar widget (same component used in other human interview flows) */}
              <div className="border rounded-xl overflow-hidden">
                {/* TimeSlotCalendar is heavy; keep it inside the modal only */}
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                <TimeSlotCalendar
                  maxSlots={3}
                  onSlotsSelected={(slots: any[]) => setHumanSelectedSlots(slots)}
                  disabled={inviteSending}
                />
              </div>

              <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t pt-3 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setInviteStep("type")} disabled={inviteSending}>
                  Back
                </Button>
                <Button
                  onClick={handleSendInvite}
                  disabled={inviteSending || (humanSelectedSlots || []).filter((s: any) => !!s?.startISO).length < 3}
                >
                  {inviteSending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          )}

          {inviteStep === "type" && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviteSending}>
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EmployerCandidates;
