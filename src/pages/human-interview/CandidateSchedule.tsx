import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeSlotCalendar, type SelectedSlot } from "@/components/human-interview/TimeSlotCalendar";

type SlotDraft = { start: string; end: string };

type HumanInterviewRequest = {
  id: number;
  candidate_name: string;
  candidate_email: string;
  status: string;
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

const CandidateSchedule = () => {
  const { jobId, personId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [request, setRequest] = useState<HumanInterviewRequest | null>(null);

  const candidateTimeZone = "PT";

  const [slots, setSlots] = useState<SlotDraft[]>([
    { start: "", end: "" },
    { start: "", end: "" },
    { start: "", end: "" },
  ]);

  const [calendarSlots, setCalendarSlots] = useState<SelectedSlot[]>([]);

  const apiBase = useMemo(() => "", []);

  const fetchRequest = async () => {
    if (!jobId || !personId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/human-interview/public/candidate/${jobId}/${personId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load request");
      setRequest(json.data);

      // Pre-fill with existing legacy slots if present (keep old inputs in sync as fallback)
      const slotTimes: string[] =
        (json.data?.slot_times as string[] | undefined) ||
        String(json.data?.time_slot_candidate || "")
          .split("*")
          .map((s: string) => s.trim())
          .filter(Boolean);

      if (slotTimes.length > 0) {
        // Prefill calendar and fallback inputs from legacy encoded slots:
        // "YYYY-MM-DD~HH:mm~HH:mm~TZ" (asterisk-separated).
        const parsed = slotTimes
          .map((s) => parseLegacySlotToSelectedSlot(s))
          .filter((s): s is SelectedSlot => Boolean(s))
          .slice(0, 3);

        if (parsed.length > 0) {
          setCalendarSlots(parsed);

          setSlots(() => {
            const next: SlotDraft[] = [{ start: "", end: "" }, { start: "", end: "" }, { start: "", end: "" }];
            for (let i = 0; i < parsed.length; i++) {
              next[i] = {
                start: toLocalDateTimeInputValue(parsed[i].startISO),
                end: toLocalDateTimeInputValue(parsed[i].endISO),
              };
            }
            return next;
          });
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load interview request");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, personId]);

  // If employer requested new availability (?new=1), clear any previously selected calendar slots.
  // If invite email contains employer-preselected slots (?prefillSlots=JSON), prefill the calendar.
  // Back-compat: if email contains a single slot prefill (?slotStart=...&slotEnd=...), prefill 1 slot.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("new") === "1") {
      setCalendarSlots([]);
      setSlots([
        { start: "", end: "" },
        { start: "", end: "" },
        { start: "", end: "" },
      ]);
      return;
    }

    // Preferred: prefillSlots=[{start,end},{start,end},{start,end}]
    const prefillSlotsRaw = params.get("prefillSlots");
    if (prefillSlotsRaw) {
      try {
        const decoded = decodeURIComponent(prefillSlotsRaw);
        const parsed = JSON.parse(decoded) as Array<{ start?: string; end?: string }>;
        const selected: SelectedSlot[] = (Array.isArray(parsed) ? parsed : [])
          .filter((s) => s?.start && s?.end)
          .slice(0, 3)
          .map((s, idx) => {
            const start = new Date(String(s.start));
            const end = new Date(String(s.end));
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

            return {
              id: `prefill_${idx}_${start.toISOString()}`,
              date: start.toISOString().slice(0, 10),
              startTime: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              endTime: end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              timeZone: "PT",
              startISO: start.toISOString(),
              endISO: end.toISOString(),
            } as SelectedSlot;
          })
          .filter((x): x is SelectedSlot => Boolean(x));

        if (selected.length) {
          setCalendarSlots(selected);
          setSlots(() => {
            const next: SlotDraft[] = [{ start: "", end: "" }, { start: "", end: "" }, { start: "", end: "" }];
            for (let i = 0; i < selected.length; i++) {
              next[i] = {
                start: toLocalDateTimeInputValue(selected[i].startISO),
                end: toLocalDateTimeInputValue(selected[i].endISO),
              };
            }
            return next;
          });
          return;
        }
      } catch {
        // ignore malformed prefillSlots
      }
    }

    // Back-compat: single slot prefill
    const slotStart = params.get("slotStart");
    const slotEnd = params.get("slotEnd");
    if (slotStart && slotEnd) {
      const start = new Date(slotStart);
      const end = new Date(slotEnd);

      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
        const prefilled: SelectedSlot = {
          id: `prefill_${start.toISOString()}`,
          date: start.toISOString().slice(0, 10),
          startTime: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          endTime: end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timeZone: "PT",
          startISO: start.toISOString(),
          endISO: end.toISOString(),
        };

        setCalendarSlots([prefilled]);
        setSlots([
          { start: toLocalDateTimeInputValue(prefilled.startISO), end: toLocalDateTimeInputValue(prefilled.endISO) },
          { start: "", end: "" },
          { start: "", end: "" },
        ]);
      }
    }
  }, []);

  const isConfirmed = request?.status === "confirmed";
  const isCancelled = request?.status === "cancelled";

  const handleSlotChange = (idx: number, key: keyof SlotDraft, value: string) => {
    setSlots((prev) => {
      const next = prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s));

      // Two-way sync: if user edits fallback datetime-local inputs, reflect in calendar.
      // We rebuild calendarSlots from the 1..3 filled pairs.
      const rebuilt: SelectedSlot[] = next
        .map((s, i) => {
          const startRaw = s.start?.trim();
          const endRaw = s.end?.trim();
          if (!startRaw || !endRaw) return null;

          const start = new Date(startRaw);
          const end = new Date(endRaw);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

          return {
            id: `manual_${i}_${start.toISOString()}`,
            date: start.toISOString().slice(0, 10),
            startTime: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            endTime: end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timeZone: "PT",
            startISO: start.toISOString(),
            endISO: end.toISOString(),
          };
        })
        .filter((x): x is SelectedSlot => Boolean(x))
        .slice(0, 3);

      setCalendarSlots(rebuilt);

      return next;
    });
  };

  const submit = async () => {
    if (!jobId || !personId) return;

    // Prefer calendar-based selection (ch-job-marketplace-like UX)
    const cleaned =
      calendarSlots.length > 0
        ? calendarSlots.map((s) => ({ start: s.startISO, end: s.endISO }))
        : slots.map((s) => ({ start: s.start.trim(), end: s.end.trim() })).filter((s) => s.start && s.end);

    if (cleaned.length === 0) {
      toast.error("Please add at least 1 availability slot");
      return;
    }
    if (cleaned.length > 3) {
      toast.error("Max 3 slots");
      return;
    }

    // Validate ordering
    for (const s of cleaned) {
      const start = new Date(s.start);
      const end = new Date(s.end);
      if (!(start instanceof Date) || isNaN(start.getTime()) || !(end instanceof Date) || isNaN(end.getTime())) {
        toast.error("Invalid slot time");
        return;
      }
      if (end <= start) {
        toast.error("End time must be after start time");
        return;
      }
    }

    setSaving(true);
    try {
      // Match ch-job-marketplace contract exactly:
      // POST body { slots: [{ id, date: "YYYY-MM-DD", startTime: "hh:mm A", endTime: "hh:mm A", timeZone: "PT" }, ...] }
      const payload = {
        slots: (calendarSlots.length > 0 ? calendarSlots : []).map((s) => ({
          id: s.id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          timeZone: "PT",
        })),
      };

      const res = await fetch(
        `${apiBase}/api/human-interview/public/candidate/${jobId}/${personId}/availability`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to submit availability");
      setRequest(json.data);
      toast.success("Availability sent to employer");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit availability");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Interview Availability</h1>
        <p className="text-sm text-muted-foreground">
          Please provide <span className="font-semibold">three time slots</span> when you are available. The hiring team
          will confirm one.
        </p>
        <p className="text-xs text-muted-foreground mt-1">Tip: click+drag on the calendar to select, drag to adjust.</p>
        {new URLSearchParams(window.location.search).get("new") === "1" && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
            The hiring team requested new availability. Please choose 3 new time slots and submit again.
          </div>
        )}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-6 space-y-2 lg:col-span-1">
            <div className="text-sm text-muted-foreground">Candidate</div>
            <div className="text-foreground font-semibold">{request.candidate_name}</div>
            <div className="text-xs text-muted-foreground">{request.candidate_email}</div>
            <div className="mt-3 text-xs">
              Status: <span className="font-semibold">{request.status}</span>
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

            {isCancelled && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="font-semibold text-foreground">This request was cancelled.</div>
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-4 lg:col-span-2">
            <div>
              <div className="font-semibold text-foreground">Calendar (PT)</div>
              <p className="text-xs text-muted-foreground">
                Select up to 3 slots. Dates must be tomorrow or later.
              </p>

              <div className="mt-3">
                <TimeSlotCalendar
                  maxSlots={3}
                  disabled={isConfirmed || isCancelled}
                  initialSlots={calendarSlots}
                  onSlotsSelected={(selected) => {
                    // If calendar emits full selection set, just store it.
                    // TimeSlotCalendar already supports ✕ remove; this keeps state in sync.
                    setCalendarSlots(selected);

                    // keep fallback inputs in sync, but do not override filled slots with empty ones
                    setSlots((prev) => {
                      const next = [...prev];

                      const mapped: SlotDraft[] = selected.slice(0, 3).map((s) => ({
                        start: toLocalDateTimeInputValue(s.startISO),
                        end: toLocalDateTimeInputValue(s.endISO),
                      }));

                      // place mapped values into Slot 1..3
                      for (let i = 0; i < 3; i++) {
                        next[i] = mapped[i] ?? { start: "", end: "" };
                      }

                      return next;
                    });
                  }}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4 lg:col-span-3">
            <div className="space-y-3">
              {slots.map((s, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Slot {idx + 1} - Start (fallback)
                    </label>
                    <Input
                      type="datetime-local"
                      value={s.start}
                      onChange={(e) => handleSlotChange(idx, "start", e.target.value)}
                      disabled={isConfirmed || isCancelled}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Slot {idx + 1} - End (fallback)
                    </label>
                    <Input
                      type="datetime-local"
                      value={s.end}
                      onChange={(e) => handleSlotChange(idx, "end", e.target.value)}
                      disabled={isConfirmed || isCancelled}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={submit} disabled={saving || isConfirmed || isCancelled}>
                {saving ? "Sending…" : "Send availability"}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">Powered by CardinalTalent</div>
          </Card>
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

function parseLegacySlotToSelectedSlot(input: string): SelectedSlot | null {
  const raw = String(input || "").trim();
  if (!raw) return null;

  // Format: YYYY-MM-DD~HH:mm~HH:mm~TZ
  const parts = raw.split("~").map((p) => p.trim());
  if (parts.length < 3) return null;

  const [date, start, end, tz = "UTC"] = parts;

  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const timeOk = /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end);
  if (!dateOk || !timeOk) return null;

  // We don't have a reliable TZ -> offset mapping here.
  // Treat the stored HH:mm as local wall-clock time (browser local) so user sees "prefilled" slots.
  const startLocal = new Date(`${date}T${start}:00`);
  const endLocal = new Date(`${date}T${end}:00`);
  if (Number.isNaN(startLocal.getTime()) || Number.isNaN(endLocal.getTime()) || endLocal <= startLocal) return null;

  return {
    id: `legacy_${raw}`,
    date,
    startTime: start,
    endTime: end,
    timeZone: tz || "UTC",
    startISO: startLocal.toISOString(),
    endISO: endLocal.toISOString(),
  };
}

function toLocalDateTimeInputValue(iso: string) {
  // Convert ISO to "YYYY-MM-DDTHH:mm" for datetime-local input in local time
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default CandidateSchedule;
