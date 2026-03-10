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
// import resumeIcon from "@/assets/theme/icons/resume-icon.svg";

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

  // Not always present; if backend returns it, we can show a resume icon.
  resume_url?: string | null;
}

interface EmployerAutoMatchedCandidateRow {
  id: number;
  person_id: number;
  job_id: number;
  match_score: number | null;
  score_summary: string | null;
  detail_response: string | null;
  source_type: string | null;
  interested: number;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <div className="col-span-4">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-1">Rank</div>
                <div className="col-span-2">Score</div>
              </div>

              <div className="divide-y divide-border/60">
                {rows.map((r, idx) => {
                  const name =
                    r.candidate?.first_name || r.candidate?.last_name
                      ? `${r.candidate?.first_name || ""} ${r.candidate?.last_name || ""}`.trim()
                      : `Person ID: ${r.person_id}`;

                  const email = r.candidate?.email || "";
                  const phone = (r.candidate as any)?.phone_number || "";
                  const rank = idx + 1;
                  const score = Math.round(Number(r.match_score ?? 0));

                  const linkedinUrl = r.candidate?.linkedin_profile_url || "";
                  // const resumeUrl = (r.candidate as any)?.resume_url || "";

                  return (
                    <div key={r.id} className="px-5 py-3.5 hover:bg-secondary/15 transition-colors">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-4 min-w-0">
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
                                  <img
                                    src={linkedInIcon}
                                    alt="LinkedIn"
                                    className="h-4 w-4"
                                  />
                                </a>
                              ) : null}

                              {/* {resumeUrl ? (
                                <a
                                  href={resumeUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open Resume"
                                  className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background p-1.5 hover:bg-secondary"
                                >
                                  <img
                                    src={resumeIcon}
                                    alt="Resume"
                                    className="h-4 w-4 object-contain"
                                  />
                                </a>
                              ) : null} */}
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
                          <Badge variant="outline" className="whitespace-nowrap">
                            #{rank}
                          </Badge>
                        </div>

                        <div className="col-span-2">
                          <Badge
                            variant="secondary"
                            className="whitespace-nowrap tabular-nums"
                          >
                            {score}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
