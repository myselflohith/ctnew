import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useResumes, Resume } from "@/hooks/useResumes";
import { FileText, Upload, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
  company: string;
  onApply: (resumeId: string) => void;
}

const ApplyModal = ({
  open,
  onOpenChange,
  jobTitle,
  company,
  onApply,
}: ApplyModalProps) => {
  const { resumes, loading, uploadResume } = useResumes();
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return;
    }

    setUploading(true);
    const newResume = await uploadResume(file);
    if (newResume) {
      setSelectedResumeId(newResume.id);
    }
    setUploading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleApply = async () => {
    if (!selectedResumeId) return;
    
    setApplying(true);
    onApply(selectedResumeId);
    setApplying(false);
    onOpenChange(false);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply to {jobTitle}</DialogTitle>
          <DialogDescription>
            at {company} — Select a resume to apply with
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {resumes.length > 0 && (
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-3 block">
                    Select from saved resumes
                  </Label>
                  <RadioGroup
                    value={selectedResumeId}
                    onValueChange={setSelectedResumeId}
                    className="space-y-3"
                  >
                    {resumes.map((resume) => (
                      <div
                        key={resume.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedResumeId === resume.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedResumeId(resume.id)}
                      >
                        <RadioGroupItem value={resume.id} id={resume.id} />
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-8 h-8 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {resume.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(resume.file_size)} •{" "}
                              {format(new Date(resume.created_at), "MMM d, yyyy")}
                              {resume.is_default && (
                                <span className="ml-2 text-primary">• Default</span>
                              )}
                            </p>
                          </div>
                          {selectedResumeId === resume.id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <Label className="text-sm font-medium mb-3 block">
                  {resumes.length > 0 ? "Or upload a new resume" : "Upload a resume"}
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full h-20 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-5 h-5 mr-2" />
                  )}
                  {uploading ? "Uploading..." : "Upload Resume (PDF, DOC, DOCX)"}
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="hero"
            onClick={handleApply}
            disabled={!selectedResumeId || applying}
          >
            {applying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Applying...
              </>
            ) : (
              "Apply Now"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyModal;
