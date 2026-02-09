import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Mail } from "lucide-react";
import { apiClient } from "@/lib/api";

interface CandidateProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: {
    id: string;
    name: string;
    email?: string;
    title?: string;
    job?: string;
    matchScore?: number;
    status?: string;
    resumeId?: string;
    appliedAt?: string;
  } | null;
}

const CandidateProfileModal = ({
  open,
  onOpenChange,
  candidate,
}: CandidateProfileModalProps) => {
  if (!candidate) return null;

  const handleDownloadResume = () => {
    if (candidate.resumeId) {
      const url = apiClient.getResumeDownloadUrl(candidate.resumeId);
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{candidate.name}</DialogTitle>
          <DialogDescription>
            {candidate.title || candidate.job || "Candidate Profile"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Candidate Info */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cardinal to-amber flex items-center justify-center text-white font-semibold text-xl">
              {candidate.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-foreground">{candidate.name}</h3>
              {candidate.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="w-4 h-4" />
                  {candidate.email}
                </p>
              )}
              {candidate.matchScore && (
                <Badge
                  variant={
                    candidate.matchScore >= 90
                      ? "excellent"
                      : candidate.matchScore >= 80
                      ? "good"
                      : "fair"
                  }
                  className="mt-2"
                >
                  {candidate.matchScore}% Match
                </Badge>
              )}
            </div>
          </div>

          {/* Resume Section */}
          {candidate.resumeId && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Resume</p>
                    <p className="text-sm text-muted-foreground">Available for download</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleDownloadResume}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}

          {/* Application Details */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Applied for:</span>
              <span className="text-sm font-medium">{candidate.job || "Unknown"}</span>
            </div>
            {candidate.appliedAt && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Applied:</span>
                <span className="text-sm font-medium">{candidate.appliedAt}</span>
              </div>
            )}
            {candidate.status && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="secondary">{candidate.status}</Badge>
              </div>
            )}
          </div>

          {/* Note: Person description would come from user profile or resume parsing */}
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Full candidate profile and description will be available after resume parsing integration.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CandidateProfileModal;
