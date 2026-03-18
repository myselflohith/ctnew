import React, { useCallback, useMemo, useRef, useState } from "react";
import { Calendar, momentLocalizer, type SlotInfo, type EventProps } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";

import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

type CalendarEvent = { id: string; start: Date; end: Date };

export type SelectedSlot = {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // hh:mm A
  endTime: string; // hh:mm A
  timeZone: string; // e.g., "PT"
  startISO: string; // UTC ISO
  endISO: string; // UTC ISO
};

const DEFAULT_TIMEZONE = "PT";

export function TimeSlotCalendar({
  maxSlots = 3,
  onSlotsSelected,
  disabled,
  initialSlots,
}: {
  maxSlots?: number;
  onSlotsSelected?: (slots: SelectedSlot[]) => void;
  disabled?: boolean;
  initialSlots?: SelectedSlot[];
}) {
  const minDate = useMemo(() => moment().add(1, "day").startOf("day"), []);
  const isDraggingRef = useRef(false);

  const handleDragEnd = () => {
    // small delay to avoid immediate selection being blocked (matches ch-job-marketplace behavior)
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  const [calendarKey, setCalendarKey] = useState(0);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allSlots, setAllSlots] = useState<SelectedSlot[]>([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [slotInfo, setSlotInfo] = useState<{ start: Date; end: Date } | null>(null);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertText, setAlertText] = useState("");

  const syncParent = useCallback(
    (slots: SelectedSlot[]) => {
      onSlotsSelected?.(slots);
    },
    [onSlotsSelected]
  );

  const showAlert = (text: string) => {
    setAlertText(text);
    setAlertOpen(true);
  };

  const handleSelectSlot = ({ start, end }: SlotInfo) => {
    if (disabled) return;
    if (isDraggingRef.current) return;

    const s = start instanceof Date ? start : new Date(start as any);
    const e = end instanceof Date ? end : new Date(end as any);

    if (moment(s).isBefore(minDate, "day")) {
      showAlert("Please select a date that is tomorrow or later.");
      return;
    }

    if (events.length >= maxSlots) {
      showAlert(`You can select a maximum of ${maxSlots} slots.`);
      return;
    }

    const overlaps = events.some((ev) => moment(s).isBefore(ev.end) && moment(e).isAfter(ev.start));
    if (overlaps) return;

    setSlotInfo({ start: s, end: e });
    setConfirmOpen(true);
  };

  const addSlot = () => {
    if (!slotInfo) return;

    // crypto.randomUUID is not supported in some browsers / insecure contexts.
    // Fallback to a timestamp-based id so "Add Slot" always works.
    const id =
      typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
        ? (crypto as any).randomUUID()
        : `slot_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const start = slotInfo.start;
    const end = slotInfo.end;

    const newEvent: CalendarEvent = { id, start, end };

    const newSlot: SelectedSlot = {
      id,
      date: moment(start).format("YYYY-MM-DD"),
      startTime: moment(start).format("hh:mm A"),
      endTime: moment(end).format("hh:mm A"),
      timeZone: DEFAULT_TIMEZONE,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    };

    const updatedSlots = [...allSlots, newSlot];

    setEvents((prev) => [...prev, newEvent]);
    setAllSlots(updatedSlots);
    setConfirmOpen(false);
    setSlotInfo(null);

    syncParent(updatedSlots);
  };

  const deleteSlot = (id: string) => {
    const updatedEvents = events.filter((ev) => ev.id !== id);
    const updatedSlots = allSlots.filter((s) => s.id !== id);

    setEvents(updatedEvents);
    setAllSlots(updatedSlots);
    isDraggingRef.current = false;
    setCalendarKey((k) => k + 1);

    syncParent(updatedSlots);
  };

  const handleDragStart = () => {
    if (disabled) return;
    isDraggingRef.current = true;
  };


  const moveEvent = useCallback(
    ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
      if (disabled) return;
      const s = start instanceof Date ? start : new Date(start as any);
      const e = end instanceof Date ? end : new Date(end as any);

      if (moment(s).isBefore(minDate, "day")) {
        showAlert("Cannot move slot into past date.");
        return;
      }

      setEvents((prev) => prev.map((ev) => (ev.id === event.id ? { ...ev, start: s, end: e } : ev)));

      setAllSlots((prev) => {
        const updated = prev.map((slot) =>
          slot.id === event.id
            ? {
                ...slot,
                date: moment(s).format("YYYY-MM-DD"),
                startTime: moment(s).format("hh:mm A"),
                endTime: moment(e).format("hh:mm A"),
                startISO: s.toISOString(),
                endISO: e.toISOString(),
              }
            : slot
        );
        syncParent(updated);
        return updated;
      });

      isDraggingRef.current = false;
    },
    [disabled, minDate, syncParent]
  );

  const EventBox = ({ event }: EventProps<CalendarEvent>) => (
    <div style={{ padding: "2px 4px", position: "relative" }}>
      <button
        type="button"
        title="Remove slot"
        aria-label="Remove slot"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) deleteSlot(event.id);
        }}
        disabled={disabled}
        style={{
          position: "absolute",
          top: 2,
          right: 2,
          width: 18,
          height: 18,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          fontWeight: 900,
          fontSize: 14,
          color: "white",
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.45)",
          borderRadius: 9999,
          padding: 0,
          opacity: disabled ? 0.6 : 1,
          lineHeight: 1,
          pointerEvents: "auto",
          zIndex: 5,
        }}
      >
        ×
      </button>

      <div style={{ fontSize: "12px", color: "white", paddingRight: 20 }}>
        {moment(event.start).format("hh:mm A")} – {moment(event.end).format("hh:mm A")}
      </div>
    </div>
  );

  React.useEffect(() => {
    if (!initialSlots || initialSlots.length === 0) return;

    const nextEvents: CalendarEvent[] = initialSlots.map((s) => ({
      id: s.id,
      start: new Date(s.startISO),
      end: new Date(s.endISO),
    }));

    setEvents(nextEvents);
    setAllSlots(initialSlots);
    syncParent(initialSlots);
    setCalendarKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSlots?.length]);

  return (
    <>
      <div className={disabled ? "pointer-events-none opacity-70" : ""}>
        <DnDCalendar
          key={calendarKey}
          localizer={localizer}
          events={events}
          views={["week", "day"]}
          defaultView="week"
          selectable={"ignoreEvents" as any}
          onSelecting={() => true}
          onSelectSlot={handleSelectSlot}
          onEventDrop={moveEvent as any}
          onDragStart={handleDragStart}
          // react-big-calendar DnD typings don't expose onDragEnd consistently; keep the handler but bypass TS.
          {...({ onDragEnd: handleDragEnd } as any)}
          draggableAccessor={() => true}
          components={{ event: EventBox as any }}
          resizable={false}
          step={30}
          timeslots={2}
          style={{ height: 650 }}
        />
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Confirm Slot</DialogTitle>
          </DialogHeader>

          <div className="text-sm">
            <div>
              <span className="font-semibold">Date:</span>{" "}
              {slotInfo ? moment(slotInfo.start).format("MMMM DD, YYYY") : ""}
            </div>
            <div className="mt-2">
              <span className="font-semibold">Time:</span>{" "}
              {slotInfo
                ? `${moment(slotInfo.start).format("hh:mm A")} - ${moment(slotInfo.end).format("hh:mm A")}`
                : ""}
            </div>
            <div className="mt-2 text-muted-foreground">Time Zone: {DEFAULT_TIMEZONE}</div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addSlot}>Add Slot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <div className="text-sm">{alertText}</div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
