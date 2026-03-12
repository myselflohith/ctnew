import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Mail, MoreVertical, User, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button as UIButton } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { interviewsAPI } from "@/lib/api/interviews";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface InvitedCandidate {
  id: string;
  candidate_name?: string;
  candidate_email?: string;
  name?: string;
  email?: string;
  status: string;
  created_at: string;
}

interface CandidateReport {
  inviteId: number;
  candidateName: string;
  candidateEmail: string;
  status: string;
  rating: string;
  score: any;
  aiFeedback: any;
}


export default function InterviewDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<any>(null);
  const [invitedCandidates, setInvitedCandidates] = useState<InvitedCandidate[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesPage, setInvitesPage] = useState(1);
  const [invitesTotalPages, setInvitesTotalPages] = useState(1);
  const [invitesTotalCount, setInvitesTotalCount] = useState(0);
  const [invitesPerPage, setInvitesPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [candidateReports, setCandidateReports] = useState<CandidateReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Archive modal state (match ch-job-marketplace behavior)
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveInviteId, setArchiveInviteId] = useState<string | number | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveReasonNote, setArchiveReasonNote] = useState("");
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);

  // Row actions (kebab menu)
  const [actionsOpenFor, setActionsOpenFor] = useState<string | number | null>(null);

  const archiveReasons = useMemo(
    () => [
      // Common reasons used in ch-job-marketplace-like flows
      "Candidate not interested",
      "Role filled",
      "Not qualified",
      "Duplicate",
      "No response",
      "Position on hold",
      "Other",
    ],
    []
  );

  // Invites filters (parity with ch-job-marketplace)
  const [inviteListStatus, setInviteListStatus] = useState<"active" | "archieved">("active");
  const [inviteDateRangeOpen, setInviteDateRangeOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteInterviewStatus, setInviteInterviewStatus] = useState("");

  // Single field date range UI (one control) but still produces start/end for API
  const [inviteStartDate, setInviteStartDate] = useState("");
  const [inviteEndDate, setInviteEndDate] = useState("");

  useEffect(() => {
    const fetchInterviewData = async () => {
      if (!id) return;
      try {
        // Fetch interview details (metadata + questions)
        const data = await interviewsAPI.getInterviewDetail(id);
        if (data && (data.interview || data.data)) {
          const interviewData = data.interview || data.data;
          setInterview(interviewData);
        } else {
          setInterview(data);
        }
      } catch (error) {
        console.error("Failed to fetch interview:", error);
        toast.error("Failed to load interview details");
        navigate("/employer/interviews");
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewData();
  }, [id, navigate]);

  // Fetch candidate reports for this interview
  const fetchCandidateReports = async () => {
    if (!interview?.id) {
      console.log("⚠️ No interview ID, skipping report fetch");
      return;
    }

    try {
      setReportsLoading(true);
      const token = apiClient.getToken();
      if (!token) {
        setCandidateReports([]);
        return;
      }

      console.log("📡 Fetching reports for interview:", interview.id);

      // Use the dedicated interview-specific endpoint.
      // IMPORTANT: When viewing Archived candidates, pass status so backend includes discarded invites.
      const url = `/api/interviews/employer/interview-reports/${interview.id}?status=${inviteListStatus}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Reports API Response:", data);

        if (data.success && Array.isArray(data.data)) {
          console.log(`📊 Fetched ${data.data.length} reports for interview ${interview.id}`);
          setCandidateReports(data.data);
        } else {
          console.warn("❌ Invalid reports response:", data);
          setCandidateReports([]);
        }
      } else {
        console.error("❌ Failed to fetch reports. Status:", response.status);
        const errorText = await response.text();
        console.error("Response:", errorText);
        setCandidateReports([]);
      }
    } catch (error: any) {
      console.error("❌ Error fetching candidate reports:", error);
      setCandidateReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchInvites = async () => {
    if (!id) return;
    try {
      setInvitesLoading(true);
      const resp = await interviewsAPI.getInterviewCandidates(id, invitesPage, {
        status: inviteListStatus,
        interviewStatus: inviteInterviewStatus,
        search: inviteSearch,
        startDate: inviteStartDate,
        endDate: inviteEndDate,
        sortField: "created_at",
        sortDirection: "DESC",
      });

      console.log("✅ Invites API response:", resp);

      // apiClient.request returns { success, data: { list, ... } }
      const list = (resp as any)?.data?.list || (resp as any)?.list || [];
      setInvitedCandidates(list);

      const totalPages =
        (resp as any)?.data?.total_pages ??
        (resp as any)?.total_pages ??
        1;
      const totalCount =
        (resp as any)?.data?.total_count ??
        (resp as any)?.total_count ??
        list.length;
      const perPage =
        (resp as any)?.data?.per_page ??
        (resp as any)?.per_page ??
        invitesPerPage;

      setInvitesTotalPages(Number(totalPages) || 1);
      setInvitesTotalCount(Number(totalCount) || 0);
      setInvitesPerPage(Number(perPage) || 25);
    } catch (e) {
      console.error("Failed to fetch invites:", e);
      setInvitedCandidates([]);
      setInvitesTotalPages(1);
      setInvitesTotalCount(0);
    } finally {
      setInvitesLoading(false);
    }
  };

  // Load reports when interview is loaded
  useEffect(() => {
    console.log("🔄 Checking if should load reports. Interview ID:", interview?.id);
    if (interview?.id) {
      fetchCandidateReports();
    }
  }, [interview?.id]);

  // Load invites when filters change
  useEffect(() => {
    if (id) fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id,
    inviteListStatus,
    inviteSearch,
    inviteInterviewStatus,
    inviteStartDate,
    inviteEndDate,
    invitesPage,
  ]);

  // Close row actions menu when switching lists/filters/pages
  useEffect(() => {
    setActionsOpenFor(null);
  }, [inviteListStatus, inviteSearch, inviteInterviewStatus, inviteStartDate, inviteEndDate, invitesPage]);

  if (loading) {
    return (
      <DashboardLayout
        role="employer"
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!interview) {
    return (
      <DashboardLayout
        role="employer"
      >
        <div>
          <Button
            variant="outline"
            className="mb-6"
            onClick={() => navigate("/employer/interviews")}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center text-destructive">
            <p>Interview not found</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role="employer"
    >
      {/* Archive reason modal (page-level, not inside candidates card) */}
      {archiveOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!archiveSubmitting) setArchiveOpen(false);
            }}
          />
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Archive candidate</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Select a reason for archiving. If you choose{" "}
              <span className="font-medium">Other</span>, a note is required.
            </p>

            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-1">
                Reason<span className="text-destructive"> *</span>
              </p>
              <Select value={archiveReason} onValueChange={setArchiveReason}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {archiveReasons.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {archiveReason.toLowerCase() === "other" ? (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Note<span className="text-destructive"> *</span>
                </p>
                <Input
                  className="h-10"
                  placeholder="Enter reason"
                  value={archiveReasonNote}
                  onChange={(e) => setArchiveReasonNote(e.target.value)}
                />
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={archiveSubmitting}
                onClick={() => setArchiveOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={archiveSubmitting}
                onClick={async () => {
                  const reason = archiveReason.trim();
                  const note = archiveReasonNote.trim();

                  if (!reason) {
                    toast.error("Reason is required");
                    return;
                  }
                  if (reason.toLowerCase() === "other" && !note) {
                    toast.error("Reason note is required for Other");
                    return;
                  }
                  if (!archiveInviteId) {
                    toast.error("Missing invite id");
                    return;
                  }

                  try {
                    setArchiveSubmitting(true);
                    await interviewsAPI.archiveInvite(archiveInviteId, {
                      reason,
                      reason_note: note,
                    });
                    toast.success("Candidate archived");
                    setArchiveOpen(false);
                    fetchInvites();
                  } catch (e: any) {
                    console.error(e);
                    toast.error(e?.message || "Failed to archive candidate");
                  } finally {
                    setArchiveSubmitting(false);
                  }
                }}
              >
                Archive
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-8">
        <Button
          variant="outline"
          className="mb-6"
          onClick={() => navigate("/employer/interviews")}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {interview.interview_title || `Interview #${interview.id}`}
          </h1>
          <p className="text-muted-foreground">View interview details and invited candidates</p>
        </div>
      </div>

      {/* Interview Details Card */}
      <div className="glass rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Interview Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Interview Type</p>
            <p className="font-medium text-foreground">{interview.type_of_interview || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Category</p>
            <p className="font-medium text-foreground">{interview.interview_category || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium text-foreground">
              {interview.created_at ? new Date(interview.created_at).toLocaleDateString() : "N/A"}
            </p>
          </div>
        </div>

        {interview.interview_description && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="font-medium text-foreground">{interview.interview_description}</p>
          </div>
        )}
      </div>

      {/* Invites filters (between Interview Information and Candidates) */}
      <div className="mb-8 rounded-2xl border border-border bg-secondary/20 p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Candidate Status */}
          <div className="md:col-span-3">
            <p className="text-xs text-muted-foreground mb-1">Candidate Status</p>
            <Select
              value={inviteListStatus}
              onValueChange={(v) => {
                setInviteListStatus(v as "active" | "archieved");
                setInvitesPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archieved">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interview Status */}
          <div className="md:col-span-3">
            <p className="text-xs text-muted-foreground mb-1">Interview Status</p>
              <select
                className="h-10 w-full px-3 rounded-md bg-background border border-input text-foreground"
                value={inviteInterviewStatus}
                onChange={(e) => {
                  setInviteInterviewStatus(e.target.value);
                  setInvitesPage(1);
                }}
              >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Partially Completed">Partially Completed</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Date range (single field that opens calendar) */}
          <div className="md:col-span-4">
            <p className="text-xs text-muted-foreground mb-1">Date Range</p>
            <Popover open={inviteDateRangeOpen} onOpenChange={setInviteDateRangeOpen}>
              <PopoverTrigger asChild>
                <UIButton
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {inviteStartDate || inviteEndDate
                    ? `${inviteStartDate || ""} - ${inviteEndDate || ""}`.trim()
                    : "Pick a date range"}
                </UIButton>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={{
                    from: inviteStartDate ? new Date(inviteStartDate) : undefined,
                    to: inviteEndDate ? new Date(inviteEndDate) : undefined,
                  }}
                  onSelect={(range: any) => {
                    const from = range?.from ? new Date(range.from) : undefined;
                    const to = range?.to ? new Date(range.to) : undefined;

                    const fmt = (d?: Date) =>
                      d
                        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
                            d.getDate()
                          ).padStart(2, "0")}`
                        : "";

                    setInviteStartDate(fmt(from));
                    setInviteEndDate(fmt(to));
                    setInvitesPage(1);
                  }}
                />
                <div className="flex items-center justify-end gap-2 border-t border-border p-2">
                  <UIButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setInviteStartDate("");
                      setInviteEndDate("");
                    }}
                  >
                    Clear
                  </UIButton>
                  <UIButton type="button" size="sm" onClick={() => setInviteDateRangeOpen(false)}>
                    Done
                  </UIButton>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Search */}
          <div className="md:col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Search</p>
              <input
                className="h-10 w-full px-3 rounded-md bg-background border border-input text-foreground"
                placeholder="Search"
                value={inviteSearch}
                onChange={(e) => {
                  setInviteSearch(e.target.value);
                  setInvitesPage(1);
                }}
              />
          </div>

          {/* Clear */}
          <div className="md:col-span-12 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setInviteListStatus("active");
                setInviteInterviewStatus("");
                setInviteStartDate("");
                setInviteEndDate("");
                setInviteSearch("");
                setInvitesPage(1);
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
      </div>

      {/* Invited Candidates & Reports */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Candidates ({invitesTotalCount || invitedCandidates.length})
            </h2>
            {reportsLoading ? (
              <p className="text-xs text-muted-foreground mt-1">(loading reports...)</p>
            ) : null}
          </div>
          <Button
            onClick={() => navigate(`/employer/interviews/${interview.id}/invite`)}
            className="h-10"
          >
            <Mail className="w-4 h-4 mr-2" />
            Invite Candidates
          </Button>
        </div>

        {invitedCandidates.length > 0 ? (
          <>
            <div>
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-3 pr-4 text-center w-[18%]">Name</th>
                    <th className="py-3 pr-4 text-center w-[22%]">Email</th>
                    <th className="py-3 pr-4 text-center w-[16%]">Interview status</th>
                    <th className="py-3 pr-4 text-center w-[16%]">Overall rating</th>
                    <th className="py-3 pr-4 text-center w-[14%]">Report</th>
                    <th className="py-3 pr-0 text-right w-[14%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitedCandidates.map((candidate) => {
                    const report =
                      candidateReports.find(
                        (r) =>
                          r.inviteId &&
                          candidate.id &&
                          r.inviteId.toString() === candidate.id.toString()
                      ) ||
                      // Fallback: archived list may not return `candidateReports` rows (server-side filtering),
                      // but invites list includes `report_id/report_rating` via join.
                      ((candidate as any)?.report_id
                        ? {
                            inviteId: Number(candidate.id),
                            candidateName: candidate.candidate_name || candidate.name || "",
                            candidateEmail: candidate.candidate_email || candidate.email || "",
                            status: candidate.status,
                            rating:
                              (candidate as any).report_rating ||
                              (candidate as any).reportRating ||
                              "Pending",
                            score:
                              (candidate as any).report_score ||
                              (candidate as any).reportScore ||
                              null,
                            aiFeedback:
                              (candidate as any).report_ai_feedback ||
                              (candidate as any).reportAiFeedback ||
                              null,
                          }
                        : undefined);

                    const interviewStatus = candidate.status || "Pending";
                    const isArchivedView = inviteListStatus === "archieved";

                    // Completion % rules (partial interviews):
                    // - Show status as "X% Completed" instead of "Partially Completed"
                    // - If completion < 80%, hide overall rating + hide report button
                    // Completion % sources:
                    // - Preferred: backend-provided completion_percentage (new field on invites list)
                    // - Fallback: compute from answered_count/total_questions (also provided now)
                    const reportAnsweredCount = Number(
                      (report as any)?.answered_count ?? (candidate as any)?.answered_count ?? 0
                    );
                    const reportTotalQuestions = Number(
                      (report as any)?.total_questions ?? (candidate as any)?.total_questions ?? 0
                    );
                    const reportCompletionPctRaw =
                      (report as any)?.completion_percentage ?? (candidate as any)?.completion_percentage;
                    const reportCompletionPct =
                      typeof reportCompletionPctRaw === "number"
                        ? reportCompletionPctRaw
                        : reportTotalQuestions > 0
                          ? Math.round((reportAnsweredCount / reportTotalQuestions) * 100)
                          : 0;

                    const isPartialStatus = interviewStatus.toLowerCase() === "partially completed";
                    // Show report/rating for:
                    // - Completed interviews always
                    // - Partially Completed interviews if there is at least 1 saved answer
                    //   (rating may still be "Pending" while async scoring runs)
                    const showReportAndRating =
                      interviewStatus.toLowerCase() === "completed" ||
                      (isPartialStatus && reportAnsweredCount > 0);
                    const statusLabel = isPartialStatus
                      ? `${reportCompletionPct}% Completed`
                      : interviewStatus;

                    // Rating sources:
                    // 1) candidateReports API (`/employer/interview-reports/:id`) -> `rating`
                    // 2) invites list API (now includes `report_rating` from latest report join)
                    // Prefer "real rating"; treat "Pending" as not-a-rating (processing).
                    const overallRatingRaw =
                      (report as any)?.rating ??
                      (report as any)?.overallRating ??
                      (candidate as any)?.report_rating ??
                      (candidate as any)?.reportRating ??
                      null;

                    const overallRating =
                      showReportAndRating
                        ? overallRatingRaw && String(overallRatingRaw).trim().length > 0
                          ? // For partial interviews we may still be "Pending" while async scoring runs.
                            String(overallRatingRaw)
                          : "Pending"
                        : "N/A";

                    const ratingClass = (() => {
                      const r = (overallRating || "").toString().toLowerCase().trim();

                      // No background when we don't have a rating
                      if (r === "n/a" || r === "na" || r === "") {
                        return "text-muted-foreground";
                      }

                      // If rating is numeric (0-10 or 0-100), map to bands.
                      const n = Number(r);
                      if (!Number.isNaN(n)) {
                        // assume 0-10 if <= 10 else 0-100
                        const pct = n <= 10 ? (n / 10) * 100 : n;
                        if (pct < 40) return "bg-red-500/15 text-red-300 border border-red-500/30";
                        if (pct < 70) return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
                        return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
                      }

                      // common string ratings
                      if (r.includes("poor") || r.includes("bad") || r.includes("low"))
                        return "bg-red-500/15 text-red-300 border border-red-500/30";
                      if (r.includes("avg") || r.includes("average") || r.includes("medium"))
                        return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
                      if (r.includes("great") || r.includes("good") || r.includes("high"))
                        // same green as "Completed" status badge
                        return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";

                      return "bg-muted/20 text-muted-foreground border border-border/40";
                    })();

                    return (
                      <tr key={candidate.id} className="border-b border-border/60">
                        <td className="py-3 pr-4 text-center text-foreground">
                          {candidate.candidate_name || candidate.name || "N/A"}
                        </td>
                        <td className="py-3 pr-4 text-center text-muted-foreground">
                          {candidate.candidate_email || candidate.email || "N/A"}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <Badge
                            variant="secondary"
                            className={
                              interviewStatus.toLowerCase() === "in progress"
                                ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                : interviewStatus.toLowerCase() === "partially completed"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : interviewStatus.toLowerCase() === "completed"
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                    : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            }
                          >
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium ${
                              overallRating === "N/A" ? "text-muted-foreground" : ratingClass
                            }`}
                          >
                            {overallRating}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {!!report && showReportAndRating ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                              onClick={() =>
                                navigate(
                                  `/employer/interviews/${interview.id}/candidate-report/${(report as any).inviteId}`
                                )
                              }
                            >
                              View report
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>

                        <td className="py-3 pr-0">
                          <div className="relative flex items-center justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-500/40 text-slate-200 hover:bg-slate-500/10"
                              onClick={() =>
                                setActionsOpenFor((cur) =>
                                  cur?.toString() === candidate.id.toString() ? null : candidate.id
                                )
                              }
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>

                            {actionsOpenFor?.toString() === candidate.id.toString() ? (
                              <div className="absolute right-0 top-10 z-40 w-44 overflow-hidden rounded-md border border-border bg-background shadow-lg">
                                {isArchivedView ? (
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-secondary/40"
                                    onClick={async () => {
                                      try {
                                        await interviewsAPI.unarchiveInvite(candidate.id);
                                        toast.success("Candidate unarchived");
                                        setActionsOpenFor(null);
                                        fetchInvites();
                                      } catch (e) {
                                        console.error(e);
                                        toast.error("Failed to unarchive candidate");
                                      }
                                    }}
                                  >
                                    Unarchive
                                  </button>
                                ) : (
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-secondary/40"
                                    onClick={() => {
                                      setActionsOpenFor(null);
                                      setArchiveInviteId(candidate.id);
                                      setArchiveReason("");
                                      setArchiveReasonNote("");
                                      setArchiveOpen(true);
                                    }}
                                  >
                                    Archive
                                  </button>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Page {invitesPage} of {invitesTotalPages} • {invitesTotalCount} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={invitesPage <= 1}
                  onClick={() => setInvitesPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={invitesPage >= invitesTotalPages}
                  onClick={() => setInvitesPage((p) => Math.min(invitesTotalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No candidate found</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
