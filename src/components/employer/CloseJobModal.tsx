import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface CloseJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
  onClose: (reason: string) => Promise<void>;
}

const CloseJobModal = ({ open, onOpenChange, jobTitle, onClose }: CloseJobModalProps) => {
  const [reason, setReason] = useState("");
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    if (!reason.trim()) {
      return;
    }
    setClosing(true);
    try {
      await onClose(reason);
      setReason("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error closing job:", error);
    } finally {
      setClosing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Close Job</DialogTitle>
          <DialogDescription>
            Please provide a reason for closing "{jobTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="close-reason">Reason for Closing *</Label>
            <Textarea
              id="close-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Position filled, No longer hiring, Company restructuring..."
              rows={4}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleClose}
            disabled={!reason.trim() || closing}
          >
            {closing ? "Closing..." : "Close Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloseJobModal;
