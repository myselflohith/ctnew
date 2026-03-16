import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type HumanInterviewRequest = {
  id: number;
  candidate_name: string;
  candidate_email: string;
  status?: string; // may be missing in Rails-compatible row
  job_id: number | null;

  // legacy ch-job-marketplace format
  time_slot_candidate?: string | null;
  selected_time_slot?: string | null;
  slot_times?: string[];

  // older ctnew fields (may still exist in DB for a while)
  selected_slot_start: string | null;
  selected_slot_end: string | null;
  slots?: Array<{ id: number; slot_start: string; slot_end: string; time_zone?: string | null }>;
};

const EmployerManage = () => {
  const { jobId, personId } = useParams();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [request, setRequest] = useState<HumanInterviewRequest | null>(null);
  const [message, setMessage] = useState("");

  const apiBase = useMemo(() => "", []);

  const fetchRequest = async () => {
    if (!jobId || !personId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/human-interview/public/employer/${jobId}/${personId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load request");
      setRequest(json.data);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load request");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, personId]);

  const confirm = async (time_slot: string) => {
    if (!jobId || !personId) return;
    setActing(true);
    try {
      const res = await fetch(`${apiBase}/api/human-interview/public/employer/${jobId}/${personId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time_slot }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to confirm");
      setRequest(json.data);
      toast.success("Slot confirmed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to confirm");
    } finally {
      setActing(false);
    }
  };

  const requestNew = async () => {
    if (!jobId || !personId) return;
    setActing(true);
    try {
      const res = await fetch(`${apiBase}/api/human-interview/public/employer/${jobId}/${personId}/request-new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to request new availability");
      setRequest(json.data);
      toast.success("Requested new availability from candidate");
    } catch (e: any) {
      toast.error(e?.message || "Failed to request new availability");
    } finally {
      setActing(false);
    }
  };

  const derivedStatus = useMemo(() => {
    if (!request) return "";
    // For Rails-compatible flow, status is derived from fields:
    // - confirmed: selected_time_slot exists
    // - candidate_submitted: time_slot_candidate exists
    // - requested: none yet
    if (String(request.selected_time_slot || "").trim()) return "confirmed";
    if (String(request.time_slot_candidate || "").trim()) return "candidate_submitted";
    return request.status || "requested";
  }, [request]);

  const isConfirmed = derivedStatus === "confirmed";
  const slotTimes =
    request?.slot_times ||
    String(request?.time_slot_candidate || "")
      .split("*")
      .map((s) => s.trim())
      .filter(Boolean);

  const hasSlots = slotTimes.length > 0;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Manage Interview Availability</h1>
        <p className="text-sm text-muted-foreground">
          Review candidate availability slots and confirm one.
        </p>
      </div>

      {loading ? (
        <Card className="p-6">Loading…</Card>
      ) : !request ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Request not found.</p>
          <div className="mt-4">
            <Link to="/" className="text-emerald-600 hover:underline">
              Go home
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-6 space-y-2">
            <div className="text-sm text-muted-foreground">Candidate</div>
            <div className="text-foreground font-semibold">{request.candidate_name}</div>
            <div className="text-xs text-muted-foreground">{request.candidate_email}</div>
            <div className="mt-3 text-xs">
              Status: <span className="font-semibold">{derivedStatus}</span>
            </div>

            {isConfirmed && (request.selected_time_slot || (request.selected_slot_start && request.selected_slot_end)) && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="font-semibold text-foreground">Confirmed time</div>
                {request.selected_time_slot ? (
                  <div className="text-sm text-foreground">{request.selected_time_slot}</div>
                ) : (
                  <div className="text-sm text-foreground">
                    {formatLocal(request.selected_slot_start!)} – {formatLocal(request.selected_slot_end!)}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <div className="font-semibold text-foreground">Availability slots</div>

            {!hasSlots ? (
              <div className="text-sm text-muted-foreground">
                Candidate has not submitted availability yet.
              </div>
            ) : (
              <div className="space-y-2">
                {slotTimes.map((s) => (
                  <div
                    key={s}
                    className="flex items-center justify-between bg-secondary/30 rounded-xl p-3"
                  >
                    <div className="text-sm text-foreground">{s}</div>
                    <Button
                      onClick={() => confirm(s)}
                      disabled={acting || isConfirmed}
                      variant={isConfirmed ? "outline" : "default"}
                    >
                      Confirm
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-3">
              <div className="font-semibold text-foreground">Request new availability</div>
              <Textarea
                placeholder="Optional note to candidate (e.g. Please provide slots next week in the afternoons)."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={acting || isConfirmed}
              />
              <div className="flex justify-end">
                <Button onClick={requestNew} disabled={acting || isConfirmed} variant="outline">
                  Request new availability
                </Button>
              </div>
            </div>
          </Card>

          <div className="text-xs text-muted-foreground">Powered by CardinalTalent</div>
        </div>
      )}
    </div>
  );
};

function formatLocal(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default EmployerManage;
