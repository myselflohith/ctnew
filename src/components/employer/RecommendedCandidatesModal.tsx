import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";

import linkedInIcon from "@/assets/theme/icons/linkedin-icon.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface CandidateProfile {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  location: string | null;
  linkedin_profile_url: string | null;
  picture_url: string | null;
  skills: string[] | null;
  created_at: string;
  updated_at: string;

  // Public URL to resume file (if present)
  resume_url?: string | null;
}

interface EmployerAutoMatchedCandidateRow {
  id: number;
  person_id: number;
  job_id: number;
  match_score: number | null;
  detail_response: string | null;
  interested: number | null;
  email_sent_at: string | null;
  discarded_at: string | null;
  created_at: string;
  updated_at: string;

  candidate?: CandidateProfile | null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string | null;
  jobTitle?: string;
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

/**
 * DEPRECATED:
 * The Recommended Candidates view now lives on the Jobs page as a tab:
 * `ctnew/src/components/employer/RecommendedCandidatesTab.tsx`.
 *
 * This modal remains only as legacy code and should not be used by new flows.
 */
export default function RecommendedCandidatesModal({
  open,
  onOpenChange,
  jobId,
  jobTitle,
}: Props) {
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const pollStartedAtRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EmployerAutoMatchedCandidateRow[]>([]);

  // (Per-row send removed; we send via bulk Interested flow)
  const [sendingForRowId, setSendingForRowId] = useState<number | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [interestedModalOpen, setInterestedModalOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<EmployerAutoMatchedCandidateRow | null>(null);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());

  const [removeReasons, setRemoveReasons] = useState<string[]>([]);
  const [removeOtherReason, setRemoveOtherReason] = useState("");
  const [removeError, setRemoveError] = useState<string | null>(null);

  const [bulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
  const [bulkEmailCandidateRows, setBulkEmailCandidateRows] = useState<EmployerAutoMatchedCandidateRow[]>([]);
  const [bulkSending, setBulkSending] = useState(false);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const [historyLoading, setHistoryLoading] = useState(false);
  const [emailHistory, setEmailHistory] = useState<EmailHistoryRow[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchDetailsHtml, setMatchDetailsHtml] = useState<string>("");
  const [matchScoreLabel, setMatchScoreLabel] = useState<string>("");

  const [historyCounts, setHistoryCounts] = useState<Record<number, number>>({});

  const fetchEmailHistoryCounts = async (candidateUserIds: number[]) => {
    if (candidateUserIds.length === 0) return;
    try {
      const uniqueIds = Array.from(new Set(candidateUserIds)).filter((n) => Number.isFinite(n));
      if (uniqueIds.length === 0) return;

      const res = await apiClient.request(`/employer/candidates/email-history-counts`, {
        method: "POST",
        body: JSON.stringify({ job_id: jobId, candidate_user_ids: uniqueIds }),
      });

      const data = (res as any)?.data ?? [];
      const rows = Array.isArray(data) ? (data as EmailHistoryCountRow[]) : [];
      const next: Record<number, number> = {};
      for (const r of rows) next[r.candidate_user_id] = Number(r.count || 0);
      setHistoryCounts(next);
    } catch {
      // non-fatal; UI can still show the Mail icon based on email_sent_at
    }
  };

  const fetchRows = async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const token = apiClient.getToken();
      if (!token) {
        setError("Not authenticated");
        setRows([]);
        return;
      }
      const res = await apiClient.request(`/jobs/${jobId}/autopilot-candidates`);
      const data = (res as any)?.data ?? [];
      const nextRows = Array.isArray(data) ? data : [];
      setRows(nextRows);

      // prefetch history counts so we can display “Show (N)” on each row
      const candidateIds = nextRows
        .map((r: any) => Number(r?.candidate?.id))
        .filter((n: any) => Number.isFinite(n));
      void fetchEmailHistoryCounts(candidateIds);

      return nextRows;
    } catch (e: any) {
      setError(e?.message || "Failed to load recommended candidates");
      setRows([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    // Start polling on open (ch-job-marketplace parity: recommendations appear async)
    const startPolling = () => {
      // reset timers when opening for a new job
      pollStartedAtRef.current = Date.now();

      const tick = async () => {
        const latest = await fetchRows();

        // Stop polling once we have recommendations, or after timeout (90s)
        const elapsed = pollStartedAtRef.current ? Date.now() - pollStartedAtRef.current : 0;
        const timeoutMs = 90_000;

        if (latest.length > 0) {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          return;
        }

        if (elapsed >= timeoutMs) {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };

      // immediate fetch then every 4s
      void tick();
      pollingRef.current = window.setInterval(() => void tick(), 4000);
    };

    startPolling();

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      pollingRef.current = null;
      pollStartedAtRef.current = null;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobId]);

  const getArticle = (roleName: string) => {
    const firstLetter = String(roleName || "").trim().charAt(0).toLowerCase();
    return ["a", "e", "i", "o", "u"].includes(firstLetter) ? "an" : "a";
  };

  const buildDefaultEmail = (candidateName: string) => {
    const roleName = jobTitle || "role";
    const article = getArticle(roleName);

    const subject = `Quick Intro for ${article} ${roleName} Role`;
    const body = `Hi ${candidateName || "{PERSON_NAME}"},
    
I’m reaching out because your profile appears to be a strong fit for ${article} ${roleName} role we’re currently hiring for.

If you're open to a short conversation, I'd be happy to share more context with you and see if it's relevant.

Cheers,
`;

    return { subject, body };
  };


  const fetchEmailHistory = async (row: EmployerAutoMatchedCandidateRow) => {
    if (!row?.candidate?.id) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const qs = new URLSearchParams();
      if (jobId) qs.set("job_id", String(jobId));
      qs.set("candidate_user_id", String(row.candidate.id));

      const res = await apiClient.request(`/employer/candidates/email-history?${qs.toString()}`);
      const data = (res as any)?.data ?? [];
      setEmailHistory(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setHistoryError(e?.message || "Failed to load email history");
      setEmailHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryModal = (row: EmployerAutoMatchedCandidateRow) => {
    setActiveRow(row);
    setHistoryModalOpen(true);
    void fetchEmailHistory(row);
  };

  const markRowsAs = async (rowIds: number[], status: "contacted" | "not_interested", reason?: string[]) => {
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
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
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

    const reason = [...removeReasons, removeOtherReason].filter((s) => String(s).trim());
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

    // Prefill template (use first candidate name for greeting; still works for multi)
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

    setBulkSending(true);
    try {
      // Send one-by-one via existing endpoint so we keep email history per candidate.
      for (const r of bulkEmailCandidateRows) {
        if (!r?.candidate?.email) continue;
        // eslint-disable-next-line no-await-in-loop
        await apiClient.request("/employer/candidates/email", {
          method: "POST",
          body: JSON.stringify({
            to: r.candidate.email,
            subject: emailSubject,
            body: emailBody,
            job_id: jobId,
            candidate_user_id: r.candidate.id,
          }),
        });
      }

      await markRowsAs(
        bulkEmailCandidateRows.map((r) => r.id),
        "contacted"
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

  const renderMatchDetails = (detailResponse: string) => {
    if (!detailResponse) return null;

    // Legacy sometimes returns JSON (stringified) not HTML
    // If it's JSON: parse and render like ch-job-marketplace (Overall Match modal)
    try {
      const parsed = JSON.parse(detailResponse);

      const summaryHtml =
        typeof parsed?.summary === "string" && parsed.summary.trim()
          ? parsed.summary
          : "N/A";

      const overallSummaryHtml =
        typeof parsed?.overall_summary === "string" && parsed.overall_summary.trim()
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
      // If not JSON, treat as HTML content and render directly (current behavior)
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

  const onDialogChange = (next: boolean) => {
    // reset nested modals when closing
    if (!next) {
      setEmailModalOpen(false);
      setHistoryModalOpen(false);
      setRemoveModalOpen(false);
      setInterestedModalOpen(false);
      setBulkEmailModalOpen(false);
      setMatchModalOpen(false);

      setActiveRow(null);
      setEmailHistory([]);
      setHistoryError(null);
      setSelectedRowIds(new Set());
      setMatchDetailsHtml("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={onDialogChange}>
      <DialogContent className="sm:max-w-[960px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5 bg-gradient-to-b from-secondary/30 to-background">
          <DialogTitle className="text-xl">
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent font-semibold">
              Recommended Candidates
            </span>
            {jobTitle ? (
              <span className="text-muted-foreground font-normal">{` — ${jobTitle}`}</span>
            ) : null}
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            Ranked by AI match score. Click icon to open LinkedIn.
          </div>
        </DialogHeader>

        {rows.length > 0 ? (
          <div className="px-6 py-3 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={rows.length > 0 && rows.every((r) => selectedRowIds.has(r.id))}
                  onCheckedChange={() => toggleSelectVisible()}
                />
                <span className="text-sm text-muted-foreground">Select visible</span>
              </div>
              <span className="text-sm text-muted-foreground">{selectedRowIds.size} selected</span>
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
        ) : null}


        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading recommendations…
          </div>
        ) : error ? (
          <div className="py-6 text-sm text-destructive">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground space-y-2">
            <div>No recommendations yet.</div>
            <div className="text-xs">
              Autosourcing runs in the background. This list will auto-refresh for ~90 seconds.
            </div>
          </div>
        ) : (
          <div className="px-6 py-5">
            <div className="rounded-xl border border-border/60 overflow-hidden bg-background shadow-sm">
              <div className="grid grid-cols-12 gap-3 bg-secondary/30 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div className="col-span-1 w-8"></div>
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Score</div>
                <div className="col-span-1">Email History</div>
              </div>

              <div className="divide-y divide-border/60">
                {rows.map((r, idx) => {
                  const name =
                    r.candidate?.first_name || r.candidate?.last_name
                      ? `${r.candidate?.first_name || ""} ${r.candidate?.last_name || ""}`.trim()
                      : `Person ID: ${r.person_id}`;

                  const email = r.candidate?.email || "";
                  const phone = (r.candidate as any)?.phone_number || "";
                  const score = Math.round(Number(r.match_score ?? 0));

                  const linkedinUrl = r.candidate?.linkedin_profile_url || "";
                  const resumeUrl = (r.candidate as any)?.resume_url || "";
                  const historyCount = historyCounts[r.candidate?.id || 0] ?? 0;

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
                    <div key={r.id} className="px-5 py-3.5 hover:bg-secondary/15 transition-colors">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-1 flex justify-center">
                          <Checkbox
                            checked={selectedRowIds.has(r.id)}
                            onCheckedChange={() => toggleSelected(r.id)}
                            className="h-4 w-4"
                          />
                        </div>

                        <div className="col-span-3 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {name}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {linkedinUrl ? (
                                <a
                                  href={linkedinUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open LinkedIn"
                                  className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background p-1.5 hover:bg-secondary"
                                >
                                  <img src={linkedInIcon} alt="LinkedIn" className="h-4 w-4" />
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

                        <div className="col-span-3 min-w-0">
                          <div className="text-sm text-foreground break-all">{email}</div>
                        </div>

                        <div className="col-span-2 min-w-0">
                          <div className="text-sm text-foreground break-all">{phone}</div>
                        </div>

                        <div className="col-span-1">
                          <Badge variant={statusVariant as any} className="whitespace-nowrap">
                            {status}
                          </Badge>
                        </div>

                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => openMatchModal(r)}
                            className="inline-flex"
                            title="Click to view match explanation"
                          >
                            <Badge variant="secondary" className="whitespace-nowrap tabular-nums cursor-pointer">
                              {score}%
                            </Badge>
                          </button>
                        </div>

                        <div className="col-span-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openHistoryModal(r)}
                            className="h-8 px-2"
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
          </div>
        )}

        {/* Confirm Interested Modal */}
        <Dialog open={interestedModalOpen} onOpenChange={setInterestedModalOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Confirm Interested</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Are you sure you are <span className="font-semibold text-foreground">Interested</span> in the selected
                candidates?
              </div>
              <div className="text-sm text-muted-foreground">
                Interested candidates will be contacted via email based on the initial email template.
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setInterestedModalOpen(false)}>
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
                        : `Person ID: ${r.person_id}`
                    )
                    .join(", ")}
                </span>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={12} />
                <div className="text-xs text-muted-foreground">
                  Placeholders: {"{PERSON_NAME} {ROLE_NAME} {COMPANY_NAME}"}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBulkEmailModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={sendBulkEmailAndMarkContacted} disabled={bulkSending}>
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
                Are you sure you are <span className="font-semibold text-foreground">Not Interested</span> in the selected
                candidates?
              </div>
              <div className="text-sm text-muted-foreground">Please provide us with a reason</div>

              {["Location does not match", "Skills do not match", "Experience does not match", "Other"].map((item) => {
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

              {removeError ? <div className="text-sm text-destructive">{removeError}</div> : null}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRemoveModalOpen(false)}>
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
                <div className="text-sm text-muted-foreground">No match explanation available.</div>
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

        {/* Email History Modal */}
        <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
          <DialogContent className="sm:max-w-[760px] max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Email History</DialogTitle>
            </DialogHeader>

            <div className="max-h-[65vh] overflow-y-auto pr-1">
              {historyLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : historyError ? (
                <div className="text-sm text-destructive">{historyError}</div>
              ) : emailHistory.length === 0 ? (
                <div className="text-sm text-muted-foreground">No emails found.</div>
              ) : (
                <div className="space-y-4">
                  {emailHistory.map((h) => (
                    <div key={h.id} className="rounded-lg border border-border/60 p-4">
                      <div className="text-xs text-muted-foreground">
                        <div>To: {h.to_email}</div>
                        <div>Sent: {new Date(h.sent_at).toLocaleString()}</div>
                      </div>
                      <div className="mt-2 text-sm font-medium">{h.subject}</div>
                      <div
                        className={cn(
                          "mt-2 text-sm text-foreground whitespace-pre-wrap",
                          "max-h-[240px] overflow-y-auto rounded-md border border-border/60 bg-secondary/10 p-3"
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
      </DialogContent>
    </Dialog>
  );
}
