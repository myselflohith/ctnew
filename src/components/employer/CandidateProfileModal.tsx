import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Mail, GraduationCap, Briefcase, Award, Globe, Linkedin } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
    rankScore?: number | null;
    status?: string;
    resumeId?: string;
    resumeUrl?: string;
    appliedAt?: string;
    userId?: string;
  } | null;
}

const CandidateProfileModal = ({
  open,
  onOpenChange,
  candidate,
}: CandidateProfileModalProps) => {
  if (!candidate) return null;

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{
    summary: string | null;
    rankScore: number | null;
    scoreEdu: number | null;
    scoreCompany: number | null;
    latestCompany: string | null;
    latestSchool: string | null;
    skills: string[];
    education: { degree?: string; university?: string; from_year?: string; to_year?: string }[];
    experiences: { designation?: string; company_worked_at?: string; years_of_experience?: string; experience_details?: string }[];
    certificates: string[];
    languages: string[];
    linkedinUrl: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!open || !candidate?.userId) return;
      let toastId: string | number | undefined;
      try {
        toastId = toast.loading("Loading candidate profile…");
        setLoading(true);
        const res = await apiClient.getEmployerCandidateProfile(candidate.userId);
        if (!cancelled && res?.success && res.data) {
          const d = res.data as any;
          setProfile({
            summary: d.summary ?? null,
            rankScore: d.rankScore ?? null,
            scoreEdu: d.scoreEdu ?? null,
            scoreCompany: d.scoreCompany ?? null,
            latestCompany: d.latestCompany ?? null,
            latestSchool: d.latestSchool ?? null,
            skills: Array.isArray(d.skills) ? d.skills : [],
            education: Array.isArray(d.education) ? d.education : [],
            experiences: Array.isArray(d.experiences) ? d.experiences : [],
            certificates: Array.isArray(d.certificates) ? d.certificates : [],
            languages: Array.isArray(d.languages) ? d.languages : [],
            linkedinUrl: d.linkedinUrl ?? null,
          });
        }
      } catch (e) {
        console.error("[CandidateProfileModal] Failed to load profile", e);
        toast.error("Failed to load candidate profile", { id: toastId });
      } finally {
        if (!cancelled) setLoading(false);
        if (toastId !== undefined) toast.dismiss(toastId);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, candidate?.userId]);

  const handleDownloadResume = () => {
    if (candidate.resumeId) {
      const url = apiClient.getResumeDownloadUrl(candidate.resumeId);
      window.open(url, "_blank");
      return;
    }
    // Fallback: resume_url sometimes exists in the row payload
    const resumeUrl = (candidate as any)?.resumeUrl as string | undefined;
    if (resumeUrl) window.open(resumeUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
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
              <div className="flex flex-wrap gap-2 mt-2">
                {typeof candidate.matchScore === "number" && (
                  <Badge
                    variant={
                      candidate.matchScore >= 90
                        ? "excellent"
                        : candidate.matchScore >= 80
                        ? "good"
                        : "fair"
                    }
                  >
                    Match {Math.round(candidate.matchScore)}%
                  </Badge>
                )}
                {typeof candidate.rankScore === "number" && (
                  <Badge
                    variant={
                      candidate.rankScore >= 90
                        ? "excellent"
                        : candidate.rankScore >= 80
                        ? "good"
                        : "secondary"
                    }
                  >
                    Rank {Math.round(candidate.rankScore)}%
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Resume Section */}
          {(candidate.resumeId || (candidate as any)?.resumeUrl) && (
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
                  Open CV
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
            {profile?.latestCompany && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Latest company:</span>
                <span className="text-sm font-medium">
                  {profile.latestCompany}
                </span>
              </div>
            )}
            {profile?.latestSchool && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Latest school:</span>
                <span className="text-sm font-medium">
                  {profile.latestSchool}
                </span>
              </div>
            )}
          </div>

          {/* Summary from parse_resume_json / resume_text */}
          <div className="border-t border-border pt-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Summary
            </h4>
            {!loading && profile?.summary && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {profile.summary}
              </p>
            )}
            {!loading && !profile?.summary && (
              <p className="text-sm text-muted-foreground">
                No additional summary available yet for this candidate.
              </p>
            )}
          </div>

          {/* Skills from parse_resume_json */}
          {!loading && profile?.skills?.length > 0 && (
            <div className="border-t border-border pt-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Education from parse_resume_json */}
          {!loading && profile?.education?.length > 0 && (
            <div className="border-t border-border pt-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Education
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {profile.education.map((e, i) => (
                  <li key={i} className="flex flex-col">
                    {e.degree && <span className="font-medium text-foreground">{e.degree}</span>}
                    {e.university && <span>{e.university}</span>}
                    {(e.from_year || e.to_year) && (
                      <span className="text-xs">
                        {[e.from_year, e.to_year].filter(Boolean).join(" – ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Experience from parse_resume_json */}
          {!loading && profile?.experiences?.length > 0 && (
            <div className="border-t border-border pt-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Experience
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {profile.experiences.map((exp, i) => (
                  <li key={i} className="flex flex-col gap-0.5">
                    {(exp.designation || exp.company_worked_at) && (
                      <span className="font-medium text-foreground">
                        {[exp.designation, exp.company_worked_at].filter(Boolean).join(" at ")}
                      </span>
                    )}
                    {exp.years_of_experience && (
                      <span className="text-xs">{exp.years_of_experience}</span>
                    )}
                    {exp.experience_details && (
                      <p className="whitespace-pre-line text-xs mt-1">{exp.experience_details}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Certificates & Languages */}
          {!loading && ((profile?.certificates?.length ?? 0) > 0 || (profile?.languages?.length ?? 0) > 0) && (
            <div className="border-t border-border pt-4 space-y-2">
              {profile?.certificates?.length ? (
                <>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Certificates
                  </h4>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {profile.certificates.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {profile?.languages?.length ? (
                <>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-2">
                    <Globe className="w-4 h-4" />
                    Languages
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {profile.languages.join(", ")}
                  </p>
                </>
              ) : null}
            </div>
          )}

          {/* LinkedIn */}
          {!loading && profile?.linkedinUrl && (
            <div className="border-t border-border pt-4">
              <a
                href={profile.linkedinUrl.startsWith("http") ? profile.linkedinUrl : `https://${profile.linkedinUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
              >
                <Linkedin className="w-4 h-4" />
                {profile.linkedinUrl}
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CandidateProfileModal;
