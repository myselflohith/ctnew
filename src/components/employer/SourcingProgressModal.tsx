import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  jobTitle: string;
  targetCount: number;

  /** ch-job-marketplace parity: animate for ~2 minutes */
  durationMs?: number;

  /** Called when animation finishes OR user clicks "View Recommendations" */
  onDone: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// same style as many easing snippets used for "count up"
function easeOutQuad(t: number) {
  return t * (2 - t);
}

export default function SourcingProgressModal({
  open,
  onOpenChange,
  jobTitle,
  targetCount,
  durationMs = 45_000,
  onDone,
}: Props) {
  const [currentCount, setCurrentCount] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const pct = useMemo(() => {
    if (!targetCount || targetCount <= 0) return 0;
    return clamp(Math.round((currentCount / targetCount) * 100), 0, 100);
  }, [currentCount, targetCount]);

  useEffect(() => {
    if (!open) return;

    setCurrentCount(0);
    startRef.current = Date.now();

    const tick = () => {
      const start = startRef.current ?? Date.now();
      const elapsed = Date.now() - start;
      const progress = clamp(elapsed / durationMs, 0, 1);
      const eased = easeOutQuad(progress);
      const nextCount = clamp(Math.floor(eased * targetCount), 0, targetCount);
      setCurrentCount(nextCount);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        onDone();
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startRef.current = null;
    };
  }, [open, durationMs, targetCount, onDone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Autosourcing candidates…</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            We’re sourcing and ranking candidates for <span className="font-medium text-foreground">{jobTitle}</span>.
          </div>

          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-semibold text-foreground">{currentCount}</div>
              <div className="text-sm text-muted-foreground">of {targetCount}</div>
            </div>

            <div className="mt-3">
              <Progress value={pct} />
              <div className="mt-1 text-xs text-muted-foreground">{pct}%</div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  // keep modal open/close decision to parent
                  onDone();
                }}
              >
                View Recommendations
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Autosourcing runs in the background. You can close this and come back later from the dashboard.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
