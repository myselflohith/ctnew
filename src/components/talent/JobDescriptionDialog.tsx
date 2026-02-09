import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, DollarSign, Clock } from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "remote" | "hybrid" | "onsite";
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
}

const JobDescriptionDialog = ({
  open,
  onOpenChange,
  job,
}: JobDescriptionDialogProps) => {
  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{job.title}</DialogTitle>
          <DialogDescription className="text-base">
            {job.company}
          </DialogDescription>
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
            <Badge variant={job.type}>{job.type}</Badge>
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
