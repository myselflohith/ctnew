import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "remote" | "hybrid" | "onsite";
  salary?: string;
  match_score?: number;
  skills?: string[];
  description?: string;
}

interface EditJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  onSave: (jobId: string, jobData: Partial<Job>) => Promise<void>;
}

const EditJobModal = ({ open, onOpenChange, job, onSave }: EditJobModalProps) => {
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    type: "remote" as "remote" | "hybrid" | "onsite",
    salary: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  // Update form data when job changes
  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || "",
        location: job.location || "",
        type: job.type || "remote",
        salary: job.salary || "",
        description: job.description || "",
      });
    }
  }, [job]);

  if (!job) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(job.id, formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving job:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
          <DialogDescription>
            Update the job details below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Job Title</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Job Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "remote" | "hybrid" | "onsite") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">Onsite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-salary">Salary</Label>
            <Input
              id="edit-salary"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              placeholder="e.g. $120k - $150k"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="hero" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditJobModal;
