import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import CandidateProfileModal from "@/components/employer/CandidateProfileModal";
import { FileText, Info } from "lucide-react";
import linkedInIcon from "@/assets/theme/icons/linkedin-icon.svg";

type JobOption = { id: string; title: string };

type Props = {
  jobOptions: JobOption[];
  jobId: string;
  onJobChange: (jobId: string) => void;
  jobTitle?: string;
};

type CandidateProfile = {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;

  company_name: string | null;
  location: string | null;

  // requested fields
  current_company?: string | null;
  current_position?: string | null;

  linkedin_profile_url: string | null;
  picture_url: string | null;
  skills: string[] | null;

  // Public URL to resume file (if present)
  resume_url?: string | null;

  // Sometimes available depending on API shape
  resume_id?: string | null;
};

type EmployerAutoMatchedCandidateRow = {
  id: number;
  person_id: number;
  job_id: number;
  match_score: number | null;
  rank_score?: number | null;
  detail_response: string | null;
  interested: number | null;
  email_sent_at: string | null;
  discarded_at: string | null;
  created_at?: string | null;
  candidate?: CandidateProfile | null;
};

type EmailHistoryRow = {
  id: number;
  to_email: string;
  subject: string;
  body: string;
  sent_at: string;
};

type EmailHistoryCountRow = {
  candidate_user_id: number;
  count: number;
};

type CandidateExperience = {
  designation?: string;
  company_worked_at?: string;
  years_of_experience?: string;
  experience_details?: string;
};

type CandidateEducation = {
  degree?: string;
  university?: string;
  from_year?: string;
  to_year?: string;
};

type CandidateProfileDetails = {
  userId: string;
  personId: number | null;
  name: string;
  email: string | null;
  location: string | null;
  linkedinUrl: string | null;

  rankScore: number | null;
  scoreEdu: number | null;
  scoreCompany: number | null;
  latestCompany: string | null;
  latestSchool: string | null;

  summary: string | null;
  skills: string[];
  education: CandidateEducation[];
  experiences: CandidateExperience[];
  certificates: string[];
  languages: string[];
};

export default function RecommendedCandidatesTab({
  jobOptions,
  jobId,
  onJobChange,
  jobTitle,
}: Props) {
  const navigate = useNavigate();
  const pollingRef = useRef<number | null>(null);
  const pollStartedAtRef = useRef<number | null>(null);

  const [rows, setRows] = useState<EmployerAutoMatchedCandidateRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());

  const [historyCounts, setHistoryCounts] = useState<Record<number, number>>(
    {},
  );

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [emailHistory, setEmailHistory] = useState<EmailHistoryRow[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeRow, setActiveRow] =
    useState<EmployerAutoMatchedCandidateRow | null>(null);

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchDetailsHtml, setMatchDetailsHtml] = useState<string>("");
  const [matchScoreLabel, setMatchScoreLabel] = useState<string>("");

  const [rankModalOpen, setRankModalOpen] = useState(false);
  const [rankModalError, setRankModalError] = useState<string | null>(null);
  const [rankModalData, setRankModalData] = useState<{
    rankScore: number | null;
    scoreCompany: number | null;
    scoreEdu: number | null;
    latestCompany: string | null;
    latestSchool: string | null;
  } | null>(null);
  const [rankModalLabel, setRankModalLabel] = useState<string>("");

  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [candidateDetails, setCandidateDetails] =
    useState<CandidateProfileDetails | null>(null);

  const [candidateProfileModalOpen, setCandidateProfileModalOpen] =
    useState(false);
  const [candidateProfileModalCandidate, setCandidateProfileModalCandidate] =
    useState<any>(null);

  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removeReasons, setRemoveReasons] = useState<string[]>([]);
  const [removeOtherReason, setRemoveOtherReason] = useState("");
  const [removeError, setRemoveError] = useState<string | null>(null);

  const [interestedModalOpen, setInterestedModalOpen] = useState(false);

  const [bulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
  const [bulkEmailCandidateRows, setBulkEmailCandidateRows] = useState<
    EmployerAutoMatchedCandidateRow[]
  >([]);
  const [bulkSending, setBulkSending] = useState(false);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const canFetch = Boolean(jobId);

  const selectedJob = useMemo(
    () => jobOptions.find((j) => j.id === jobId),
    [jobOptions, jobId],
  );

  const fetchEmailHistoryCounts = async (candidateUserIds: number[]) => {
    if (!jobId) return;
    if (candidateUserIds.length === 0) return;
    try {
      const uniqueIds = Array.from(new Set(candidateUserIds)).filter((n) =>
        Number.isFinite(n),
      );
      if (uniqueIds.length === 0) return;

      const res = await apiClient.request(
        `/employer/candidates/email-history-counts`,
        {
          method: "POST",
          body: JSON.stringify({
            job_id: jobId,
            candidate_user_ids: uniqueIds,
          }),
        },
      );

      const data = (res as any)?.data ?? [];
      const rows = Array.isArray(data) ? (data as EmailHistoryCountRow[]) : [];
      const next: Record<number, number> = {};
      for (const r of rows) next[r.candidate_user_id] = Number(r.count || 0);
      setHistoryCounts(next);
    } catch {
      // non-fatal
    }
  };

  const fetchRows = async (_opts?: { silent?: boolean }) => {
    if (!jobId) return [];

    setError(null);
    try {
      const res: any = await apiClient.request(
        `/jobs/${jobId}/autopilot-candidates`,
      );
      const data = (res as any)?.data ?? [];
      const nextRows = Array.isArray(data) ? data : [];
      setRows(nextRows);

      const candidateIds = nextRows
        .map((r: any) => Number(r?.candidate?.id))
        .filter((n: any) => Number.isFinite(n));
      void fetchEmailHistoryCounts(candidateIds);

      return nextRows;
    } catch (e: any) {
      const msg = e?.message || "Failed to load recommended candidates";
      setError(msg);
      setRows([]);
      return [];
    }
  };

  useEffect(() => {
    if (!jobId) return;

    // Load immediately when job changes, then do a single silent refresh after 90s.
    void fetchRows();

    const timeoutMs = 90_000;
    const timer = window.setTimeout(
      () => void fetchRows({ silent: true }),
      timeoutMs,
    );

    return () => {
      window.clearTimeout(timer);
      pollStartedAtRef.current = null;
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const getArticle = (roleName: string) => {
    const firstLetter = String(roleName || "").trim().charAt(0).toLowerCase();
    return ["a", "e", "i", "o", "u"].includes(firstLetter) ? "an" : "a";
  };

  const buildDefaultEmail = (candidateName: string) => {
    const roleName = jobTitle || selectedJob?.title || "{ROLE_NAME}";
    const subject = `Quick Intro for ${roleName} Role`;
    const body = `Hi ${candidateName || "{PERSON_NAME}"},

We came across your profile and thought you could be a great fit for the {ROLE_NAME} role at {COMPANY_NAME}. Could you please share the following details?

1) What are your salary expectations?
2) What is your work authorization status?

Cheers,
CardinalTalent.ai
`;

    return { subject, body };
  };

  const formatDateAdded = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    // Example: 01 Mar, 2026 07:52
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString(undefined, { month: "short" });
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month}, ${year} ${hh}:${mm}`;
  };

  const substituteCurlyPlaceholders = (
    template: string,
    vals: { personName: string; roleName: string; companyName: string },
  ) => {
    let out = template || "";
    out = out.replace(/\{PERSON_NAME\}/g, vals.personName);
    out = out.replace(/\{ROLE_NAME\}/g, vals.roleName);
    out = out.replace(/\{COMPANY_NAME\}/g, vals.companyName);
    return out;
  };

  const openHistoryModal = async (row: EmployerAutoMatchedCandidateRow) => {
    if (!row?.candidate?.id) return;
    if (!jobId) return;

    setActiveRow(row);
    setHistoryError(null);
    setEmailHistory([]);

    try {
      const qs = new URLSearchParams();
      qs.set("job_id", String(jobId));
      qs.set("candidate_user_id", String(row.candidate.id));

      const res = await apiClient.request(
        `/employer/candidates/email-history?${qs.toString()}`,
      );
      const data = (res as any)?.data ?? [];
      setEmailHistory(Array.isArray(data) ? data : []);
      setHistoryModalOpen(true);
    } catch (e: any) {
      setHistoryError(e?.message || "Failed to load email history");
      setEmailHistory([]);
      setHistoryModalOpen(true);
    }
  };

  const renderMatchDetails = (detailResponse: string) => {
    if (!detailResponse) return null;

    try {
      const parsed = JSON.parse(detailResponse);

      const summaryHtml =
        typeof parsed?.summary === "string" && parsed.summary.trim()
          ? parsed.summary
          : "N/A";

      const overallSummaryHtml =
        typeof parsed?.overall_summary === "string" &&
        parsed.overall_summary.trim()
          ? parsed.overall_summary.replace(/\n/g, "<br/>")
          : "N/A";

      return (
        <div className="space-y-4">
          <div className="text-base font-semibold">🎯 Overall Match</div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">{`Summary (Match Score : ${parsed?.score ?? "-"}%)`}</div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: summaryHtml }}
            />
          </div>

          <hr className="border-border/60" />

          <div className="space-y-2">
            <div className="text-sm font-semibold">Overall Score</div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: overallSummaryHtml }}
            />
          </div>
        </div>
      );
    } catch {
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: detailResponse }}
        />
      );
    }
  };

  const openMatchModal = (row: EmployerAutoMatchedCandidateRow) => {
    setActiveRow(row);
    setMatchDetailsHtml(row.detail_response || "");
    const score = Math.round(Number(row.match_score ?? 0));
    setMatchScoreLabel(`${score}%`);
    setMatchModalOpen(true);
  };

  const openRankModal = async (row: EmployerAutoMatchedCandidateRow) => {
    const c = row?.candidate;
    if (!c?.id) return;

    setRankModalError(null);
    setRankModalData(null);

    const rankScore = Math.round(Number(row.rank_score ?? 0));
    setRankModalLabel(`${rankScore}%`);

    try {
      const res: any = await apiClient.request(
        `/resumes/employer/candidate-profile/${c.id}`,
      );
      const d = (res as any)?.data ?? null;

      setRankModalData({
        rankScore: d?.rankScore ?? null,
        scoreCompany: d?.scoreCompany ?? null,
        scoreEdu: d?.scoreEdu ?? null,
        latestCompany: d?.latestCompany ?? null,
        latestSchool: d?.latestSchool ?? null,
      });
      setRankModalOpen(true);
    } catch (e: any) {
      setRankModalError(e?.message || "Failed to load rank score details");
      setRankModalOpen(true);
    }
  };

  const openCandidateModal = async (row: EmployerAutoMatchedCandidateRow) => {
    const c = row?.candidate;
    if (!c?.id) return;

    setCandidateProfileModalCandidate({
      id: String(row.id ?? ""),
      userId: String(c.id),
      name:
        c.first_name || c.last_name
          ? `${c.first_name || ""} ${c.last_name || ""}`.trim()
          : `Person ID: ${row.person_id}`,
      email: c.email ?? undefined,
      job: selectedJob?.title || jobTitle || "",
      matchScore: row.match_score ?? undefined,
      rankScore: row.rank_score ?? undefined,
      status: row.email_sent_at ? "Contacted" : "Sourced",
      resumeId: c.resume_id ?? undefined,
      resumeUrl: c.resume_url ?? undefined,
      appliedAt: formatDateAdded(row.created_at) || undefined,
    });

    setCandidateProfileModalOpen(true);
  };

  const markRowsAs = async (
    rowIds: number[],
    status: "contacted" | "not_interested",
    reason?: string[],
  ) => {
    if (!jobId) return;
    await apiClient.request(`/jobs/${jobId}/autopilot-candidates/bulk-update`, {
      method: "POST",
      body: JSON.stringify({ candidate_ids: rowIds, status, reason }),
    });
  };

  const toggleSelected = (rowId: number) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleSelectVisible = () => {
    const visibleIds = rows.map((r) => r.id);
    setSelectedRowIds((prev) => {
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const openRemoveSelected = () => {
    setRemoveReasons([]);
    setRemoveOtherReason("");
    setRemoveError(null);
    setRemoveModalOpen(true);
  };

  const confirmRemoveSelected = async () => {
    const ids = Array.from(selectedRowIds);
    if (ids.length === 0) return;

    if (removeReasons.length === 0) {
      setRemoveError("Please select at least one reason.");
      return;
    }
    if (removeReasons.includes("Other") && !removeOtherReason.trim()) {
      setRemoveError("Please provide a reason in the text box.");
      return;
    }

    const reason = [...removeReasons, removeOtherReason].filter((s) =>
      String(s).trim(),
    );
    try {
      await markRowsAs(ids, "not_interested", reason);
      setSelectedRowIds(new Set());
      setRemoveModalOpen(false);
      await fetchRows();
    } catch (e: any) {
      setRemoveError(e?.message || "Failed to update candidates");
    }
  };

  const openInterestedSelected = () => {
    setInterestedModalOpen(true);
  };

  const proceedInterestedToEmailTemplate = () => {
    const selected = rows.filter((r) => selectedRowIds.has(r.id));
    setBulkEmailCandidateRows(selected);
    setInterestedModalOpen(false);

    const first = selected[0];
    const firstName =
      first?.candidate?.first_name || first?.candidate?.last_name
        ? `${first?.candidate?.first_name || ""} ${first?.candidate?.last_name || ""}`.trim()
        : "";
    const tmpl = buildDefaultEmail(firstName);
    setEmailSubject(tmpl.subject);
    setEmailBody(tmpl.body);
    setBulkEmailModalOpen(true);
  };

  const sendBulkEmailAndMarkContacted = async () => {
    if (!jobId) return;
    if (bulkEmailCandidateRows.length === 0) return;
    if (!emailSubject.trim() || !emailBody.trim()) {
      setError("Subject and body are required");
      return;
    }

    const roleName = jobTitle || selectedJob?.title || "";
    // Use selected job title/company; if company isn't available in this view, keep it blank instead of the placeholder.
    const companyName = "";

    setBulkSending(true);

    try {
      for (const r of bulkEmailCandidateRows) {
        if (!r?.candidate?.email) continue;

        const personName =
          r.candidate.first_name || r.candidate.last_name
            ? `${r.candidate.first_name || ""} ${r.candidate.last_name || ""}`.trim()
            : "";

        const finalSubject = substituteCurlyPlaceholders(emailSubject, {
          personName: personName || "{PERSON_NAME}",
          roleName: roleName || "{ROLE_NAME}",
          companyName,
        });

        const finalBody = substituteCurlyPlaceholders(emailBody, {
          personName: personName || "{PERSON_NAME}",
          roleName: roleName || "{ROLE_NAME}",
          companyName,
        });

        // eslint-disable-next-line no-await-in-loop
        await apiClient.request("/employer/candidates/email", {
          method: "POST",
          body: JSON.stringify({
            to: r.candidate.email,
            subject: finalSubject,
            body: finalBody,
            job_id: jobId,
            candidate_user_id: r.candidate.id,
          }),
        });
      }

      await markRowsAs(
        bulkEmailCandidateRows.map((r) => r.id),
        "contacted",
      );

      setBulkEmailModalOpen(false);
      setBulkEmailCandidateRows([]);
      setSelectedRowIds(new Set());
      await fetchRows();

    } catch (e: any) {
      setError(e?.message || "Failed to send bulk email");
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Matched Candidates
          </h2>
          <p className="text-sm text-muted-foreground">
            Pick a job to view auto-matched candidates.
          </p>
        </div>

        <div className="w-full md:w-[360px]">
          <Select value={jobId} onValueChange={onJobChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              {jobOptions.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!canFetch ? (
        <div className="rounded-xl bg-secondary/30 p-6 text-sm text-muted-foreground">
          Select a job to load recommendations.
        </div>
      ) : error ? (
        <div className="rounded-xl bg-secondary/30 p-6 text-sm text-destructive">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl bg-secondary/30 p-6 text-sm text-muted-foreground space-y-2">
          <div>No recommendations yet.</div>
          <div className="text-xs">
            Autosourcing runs in the background. This list will auto-refresh in
            ~90 seconds.
          </div>
        </div>
      ) : (
        <>
          {/* Bulk actions header */}
          <div className="px-1 py-1 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={rows.length > 0 && rows.every((r) => selectedRowIds.has(r.id))}
                  onCheckedChange={() => toggleSelectVisible()}
                />
                <span className="text-sm text-muted-foreground">
                  Select visible
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedRowIds.size} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedRowIds.size === 0}
                onClick={openRemoveSelected}
              >
                Remove
              </Button>
              <Button
                size="sm"
                disabled={selectedRowIds.size === 0}
                onClick={openInterestedSelected}
              >
                Interested
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border/60 overflow-hidden bg-background shadow-sm">
            {/* Use fixed column widths so cells never wrap to a new line */}
            <div
              className="grid bg-secondary/30 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide items-center"
              style={{
                gridTemplateColumns:
                  "40px minmax(180px, 2.2fr) minmax(220px, 2.2fr) minmax(130px, 1.2fr) minmax(170px, 1.6fr) minmax(170px, 1.6fr) minmax(120px, 1.1fr) minmax(90px, 0.8fr) minmax(90px, 0.8fr) minmax(140px, 1.1fr)",
              }}
            >
              <div></div>
              <div>Name</div>
              <div>Email</div>
              <div>Date Added</div>
              <div>Current Company</div>
              <div>Current Position</div>
              <div>Status</div>
              <div>Rank Score</div>
              <div>Match Score</div>
              <div className="text-right">Email History</div>
            </div>

            <div className="divide-y divide-border/60">
              {rows.map((r, idx) => {
                const c = r.candidate;

                const name =
                  c?.first_name || c?.last_name
                    ? `${c?.first_name || ""} ${c?.last_name || ""}`.trim()
                    : `Person ID: ${r.person_id}`;

                const email = c?.email || "";
                const dateAdded = formatDateAdded(r.created_at);
                const score = Math.round(Number(r.match_score ?? 0));
                const rankScore = Math.round(Number(r.rank_score ?? 0));

                const linkedinUrl = c?.linkedin_profile_url || "";
                const resumeUrl = (c as any)?.resume_url || "";
                const historyCount = historyCounts[c?.id || 0] ?? 0;

                const status = r.email_sent_at
                  ? "Contacted"
                  : r.interested
                    ? "Interested"
                    : r.discarded_at
                      ? "Not Interested"
                      : "Sourced";

                const statusVariant =
                  status === "Contacted"
                    ? "secondary"
                    : status === "Interested"
                      ? "default"
                      : status === "Not Interested"
                        ? "destructive"
                        : "outline";

                return (
                  <div
                    key={r.id || idx}
                    className="px-5 py-3.5 hover:bg-secondary/15 transition-colors"
                  >
                    <div
                      className="grid items-center"
                      style={{
                        gridTemplateColumns:
                          "40px minmax(180px, 2.2fr) minmax(220px, 2.2fr) minmax(130px, 1.2fr) minmax(170px, 1.6fr) minmax(170px, 1.6fr) minmax(120px, 1.1fr) minmax(90px, 0.8fr) minmax(90px, 0.8fr) minmax(140px, 1.1fr)",
                      }}
                    >
                      <div className="flex justify-center">
                        <Checkbox
                          checked={selectedRowIds.has(r.id)}
                          onCheckedChange={() => toggleSelected(r.id)}
                          className="h-4 w-4"
                        />
                      </div>

                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            className="text-sm font-medium text-foreground truncate hover:underline text-left"
                            title="Open candidate details"
                            onClick={() => void openCandidateModal(r)}
                          >
                            {name}
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            {linkedinUrl ? (
                              <a
                                href={linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Open LinkedIn"
                                className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background p-1.5 hover:bg-secondary"
                              >
                                <img
                                  src={linkedInIcon}
                                  alt="LinkedIn"
                                  className="h-4 w-4"
                                />
                              </a>
                            ) : null}

                            {resumeUrl ? (
                              <a
                                href={resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Open Resume"
                                className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background p-1.5 hover:bg-secondary"
                              >
                                <FileText className="h-4 w-4" />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 pr-2">
                        <div className="text-sm text-foreground truncate" title={email}>
                          {email || "-"}
                        </div>
                      </div>

                      <div className="min-w-0 pr-2">
                        <div className="text-sm text-foreground whitespace-nowrap">
                          {dateAdded || "-"}
                        </div>
                      </div>

                      <div className="min-w-0 pr-2">
                        <div
                          className="text-sm text-foreground truncate"
                          title={c?.current_company || ""}
                        >
                          {c?.current_company || "-"}
                        </div>
                      </div>

                      <div className="min-w-0 pr-2">
                        <div
                          className="text-sm text-foreground truncate"
                          title={c?.current_position || ""}
                        >
                          {c?.current_position || "-"}
                        </div>
                      </div>

                      <div className="min-w-0 pr-2">
                        <Badge
                          variant={statusVariant as any}
                          className="whitespace-nowrap"
                        >
                          {status}
                        </Badge>
                      </div>

                      <div className="min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => void openRankModal(r)}
                          className="inline-flex"
                          title="Click to view rank score breakdown"
                        >
                          <Badge
                            variant="secondary"
                            className="whitespace-nowrap tabular-nums cursor-pointer"
                          >
                            {rankScore}%
                          </Badge>
                        </button>
                      </div>

                      <div className="min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => openMatchModal(r)}
                          className="inline-flex"
                          title="Click to view match explanation"
                        >
                          <Badge
                            variant="secondary"
                            className="whitespace-nowrap tabular-nums cursor-pointer"
                          >
                            {score}%
                          </Badge>
                        </button>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openHistoryModal(r)}
                          className="h-8 px-2 whitespace-nowrap"
                        >
                          Show ({historyCount})
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Confirm Interested Modal */}
          <Dialog open={interestedModalOpen} onOpenChange={setInterestedModalOpen}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Confirm Interested</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Are you sure you are{" "}
                  <span className="font-semibold text-foreground">
                    Interested
                  </span>{" "}
                  in the selected candidates?
                </div>
                <div className="text-sm text-muted-foreground">
                  Interested candidates will be contacted via email based on the
                  initial email template.
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setInterestedModalOpen(false)}
                  >
                    No
                  </Button>
                  <Button onClick={proceedInterestedToEmailTemplate}>Yes</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Email Template Modal */}
          <Dialog open={bulkEmailModalOpen} onOpenChange={setBulkEmailModalOpen}>
            <DialogContent className="sm:max-w-[760px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Send Email to Candidate(s)</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  You are sending an email to:{" "}
                  <span className="text-foreground">
                    {bulkEmailCandidateRows
                      .map((r) =>
                        r.candidate?.first_name || r.candidate?.last_name
                          ? `${r.candidate?.first_name || ""} ${r.candidate?.last_name || ""}`.trim()
                          : `Person ID: ${r.person_id}`,
                      )
                      .join(", ")}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={12}
                  />
                  <div className="text-xs text-muted-foreground">
                    Placeholders: {"{PERSON_NAME} {ROLE_NAME} {COMPANY_NAME}"}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setBulkEmailModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendBulkEmailAndMarkContacted}
                    disabled={bulkSending}
                  >
                    {bulkSending ? "Sending..." : "Send Email"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Remove (Not Interested) Modal */}
          <Dialog open={removeModalOpen} onOpenChange={setRemoveModalOpen}>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Confirm Action</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Are you sure you are{" "}
                  <span className="font-semibold text-foreground">
                    Not Interested
                  </span>{" "}
                  in the selected candidates?
                </div>
                <div className="text-sm text-muted-foreground">
                  Please provide us with a reason
                </div>

                {[
                  "Location does not match",
                  "Skills do not match",
                  "Experience does not match",
                  "Other",
                ].map((item) => {
                  const checked = removeReasons.includes(item);
                  return (
                    <label key={item} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setRemoveReasons((prev) => {
                            const next = new Set(prev);
                            if (isChecked) next.add(item);
                            else next.delete(item);
                            return Array.from(next);
                          });
                          setRemoveError(null);
                        }}
                      />
                      <span>{item}</span>
                    </label>
                  );
                })}

                {removeReasons.includes("Other") ? (
                  <Textarea
                    value={removeOtherReason}
                    onChange={(e) => setRemoveOtherReason(e.target.value)}
                    rows={3}
                    placeholder="Type your reason here..."
                  />
                ) : null}

                {removeError ? (
                  <div className="text-sm text-destructive">{removeError}</div>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setRemoveModalOpen(false)}
                  >
                    No
                  </Button>
                  <Button variant="destructive" onClick={confirmRemoveSelected}>
                    Yes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Match Score Explanation Modal */}
          <Dialog open={matchModalOpen} onOpenChange={setMatchModalOpen}>
            <DialogContent className="sm:max-w-[820px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{`Match Details ${matchScoreLabel ? `(${matchScoreLabel})` : ""}`}</DialogTitle>
              </DialogHeader>

              <div className="max-h-[60vh] overflow-y-auto pr-2">
                {!matchDetailsHtml ? (
                  <div className="text-sm text-muted-foreground">
                    No match explanation available.
                  </div>
                ) : (
                  renderMatchDetails(matchDetailsHtml)
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setMatchModalOpen(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Candidate Profile Modal (same as Candidates page) */}
          {candidateProfileModalCandidate && (
            <CandidateProfileModal
              open={candidateProfileModalOpen}
              onOpenChange={setCandidateProfileModalOpen}
              candidate={candidateProfileModalCandidate}
            />
          )}

          {/* Rank Score Breakdown Modal */}
          <Dialog open={rankModalOpen} onOpenChange={setRankModalOpen}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>{`Rank Score Details ${rankModalLabel ? `(${rankModalLabel})` : ""}`}</DialogTitle>
              </DialogHeader>

              {rankModalError ? (
                <div className="text-sm text-destructive">{rankModalError}</div>
              ) : !rankModalData ? (
                <div className="text-sm text-muted-foreground">
                  No rank score details available.
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rank Score</span>
                    <span className="font-medium">
                      {rankModalData.rankScore ?? "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Company Score</span>
                    <span className="font-medium">
                      {rankModalData.scoreCompany ?? "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Education Score</span>
                    <span className="font-medium">
                      {rankModalData.scoreEdu ?? "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Latest Company</span>
                    <span className="font-medium text-right max-w-[280px] truncate">
                      {rankModalData.latestCompany || "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Latest School</span>
                    <span className="font-medium text-right max-w-[280px] truncate">
                      {rankModalData.latestSchool || "-"}
                    </span>
                  </div>

                  <div className="pt-2 text-xs text-muted-foreground flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5" />
                    <span>
                      Rank score is derived from the candidate’s resume/profile
                      parsing and scoring components.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setRankModalOpen(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Candidate Details Modal */}
          <Dialog open={candidateModalOpen} onOpenChange={setCandidateModalOpen}>
            <DialogContent className="sm:max-w-[880px] max-h-[85vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Candidate Details</DialogTitle>
              </DialogHeader>

              <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
                {candidateError ? (
                  <div className="text-sm text-destructive">{candidateError}</div>
                ) : !candidateDetails ? (
                  <div className="text-sm text-muted-foreground">
                    No candidate details available.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-lg font-semibold text-foreground truncate">
                          {candidateDetails.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {candidateDetails.email || "-"}
                          {candidateDetails.location
                            ? ` • ${candidateDetails.location}`
                            : ""}
                        </div>
                      </div>

                      {candidateDetails.linkedinUrl ? (
                        <a
                          href={candidateDetails.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-secondary"
                        >
                          LinkedIn
                        </a>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-md border border-border/60 p-3">
                        <div className="text-xs text-muted-foreground">
                          Rank Score
                        </div>
                        <div className="text-sm font-medium">
                          {candidateDetails.rankScore ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-md border border-border/60 p-3">
                        <div className="text-xs text-muted-foreground">
                          Company Score
                        </div>
                        <div className="text-sm font-medium">
                          {candidateDetails.scoreCompany ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-md border border-border/60 p-3">
                        <div className="text-xs text-muted-foreground">
                          Education Score
                        </div>
                        <div className="text-sm font-medium">
                          {candidateDetails.scoreEdu ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-md border border-border/60 p-3">
                        <div className="text-xs text-muted-foreground">
                          Latest Company
                        </div>
                        <div className="text-sm font-medium truncate">
                          {candidateDetails.latestCompany || "-"}
                        </div>
                      </div>
                    </div>

                    {candidateDetails.summary ? (
                      <div>
                        <div className="text-sm font-semibold mb-1">Summary</div>
                        <div className="text-sm text-foreground whitespace-pre-wrap">
                          {candidateDetails.summary}
                        </div>
                      </div>
                    ) : null}

                    {candidateDetails.skills?.length ? (
                      <div>
                        <div className="text-sm font-semibold mb-1">Skills</div>
                        <div className="flex flex-wrap gap-2">
                          {candidateDetails.skills.map((s) => (
                            <Badge key={s} variant="secondary">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {candidateDetails.experiences?.length ? (
                      <div>
                        <div className="text-sm font-semibold mb-2">
                          Experience
                        </div>
                        <div className="space-y-3">
                          {candidateDetails.experiences.map((exp, i) => (
                            <div
                              key={`${exp.designation}-${exp.company_worked_at}-${i}`}
                              className="rounded-md border border-border/60 p-3"
                            >
                              <div className="text-sm font-medium">
                                {[exp.designation, exp.company_worked_at]
                                  .filter(Boolean)
                                  .join(" • ") || "Experience"}
                              </div>
                              {exp.years_of_experience ? (
                                <div className="text-xs text-muted-foreground">
                                  {exp.years_of_experience}
                                </div>
                              ) : null}
                              {exp.experience_details ? (
                                <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                                  {exp.experience_details}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {candidateDetails.education?.length ? (
                      <div>
                        <div className="text-sm font-semibold mb-2">
                          Education
                        </div>
                        <div className="space-y-2">
                          {candidateDetails.education.map((edu, i) => (
                            <div
                              key={`${edu.degree}-${edu.university}-${i}`}
                              className="rounded-md border border-border/60 p-3"
                            >
                              <div className="text-sm font-medium">
                                {[edu.degree, edu.university]
                                  .filter(Boolean)
                                  .join(" • ") || "Education"}
                              </div>
                              {(edu.from_year || edu.to_year) ? (
                                <div className="text-xs text-muted-foreground">
                                  {[edu.from_year, edu.to_year]
                                    .filter(Boolean)
                                    .join(" - ")}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {candidateDetails.certificates?.length ? (
                      <div>
                        <div className="text-sm font-semibold mb-1">
                          Certificates
                        </div>
                        <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
                          {candidateDetails.certificates.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {candidateDetails.languages?.length ? (
                      <div>
                        <div className="text-sm font-semibold mb-1">
                          Languages
                        </div>
                        <div className="text-sm text-foreground">
                          {candidateDetails.languages.join(", ")}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCandidateModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Email History Modal */}
          <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
            <DialogContent className="sm:max-w-[760px] max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Email History</DialogTitle>
              </DialogHeader>

              <div className="max-h-[65vh] overflow-y-auto pr-1">
                {historyError ? (
                  <div className="text-sm text-destructive">{historyError}</div>
                ) : emailHistory.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No emails found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emailHistory.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-lg border border-border/60 p-4"
                      >
                        <div className="text-xs text-muted-foreground">
                          <div>To: {h.to_email}</div>
                          <div>Sent: {new Date(h.sent_at).toLocaleString()}</div>
                        </div>
                        <div className="mt-2 text-sm font-medium">{h.subject}</div>
                        <div
                          className={cn(
                            "mt-2 text-sm text-foreground whitespace-pre-wrap",
                            "max-h-[240px] overflow-y-auto rounded-md border border-border/60 bg-secondary/10 p-3",
                          )}
                        >
                          {h.body}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
