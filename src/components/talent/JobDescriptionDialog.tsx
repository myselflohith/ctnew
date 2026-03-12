import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, DollarSign, Clock, Pencil } from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type?: "remote" | "hybrid" | "onsite" | null;
  salary?: string;
  postedAt: string;
  matchScore?: number;
  skills?: string[];
  description?: string;
}

interface JobDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  /** When provided, shows an "Edit Job" button in the header that calls this with the job (e.g. employer Jobs) */
  onEditJob?: (job: Job) => void;
}

const JobDescriptionDialog = ({
  open,
  onOpenChange,
  job,
  onEditJob,
}: JobDescriptionDialogProps) => {
  if (!job) return null;

  const handleEdit = () => {
    onOpenChange(false);
    onEditJob?.(job);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <DialogTitle className="text-2xl">{job.title}</DialogTitle>
              <DialogDescription className="text-base">
                {job.company}
              </DialogDescription>
            </div>
            {onEditJob && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="shrink-0"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Job
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Job Details */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {job.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {job.location}
            </span>
            {job.type && <Badge variant={job.type}>{job.type}</Badge>}
            {job.salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {job.salary}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {job.postedAt}
            </span>
            {job.matchScore && (
              <Badge variant="excellent">{job.matchScore}% Match</Badge>
            )}
          </div>

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Job Description</h3>
              <p className="text-muted-foreground whitespace-pre-line">
                {job.description}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobDescriptionDialog;
