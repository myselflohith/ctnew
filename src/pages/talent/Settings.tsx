import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Linkedin, Download, Trash2, Upload, Camera, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useResumes } from "@/hooks/useResumes";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";
import { getCurrentUser, setCachedCurrentUser, type User } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

const TalentSettings = () => {
  const { resumes, loading, uploadResume, setDefaultResume, deleteResume } =
    useResumes();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    apiClient.getTalentProfile().then((res) => {
      if (res?.user) {
        const u = res.user as User;
        setCurrentUser(u);
        setCachedCurrentUser(u);
      }
    }).catch(() => {
      getCurrentUser({ force: true }).then(setCurrentUser);
    });
  }, []);

  const displayName = useMemo(() => {
    if (!currentUser) return "User";
    const byParts = [currentUser.first_name, currentUser.last_name]
      .filter(Boolean)
      .join(" ");
    return byParts || currentUser.email || "User";
  }, [currentUser]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");

  const [jobType, setJobType] = useState<"full_time" | "contract" | "">("");
  const [workType, setWorkType] = useState<"all_types" | "remote" | "hybrid" | "onsite" | "">("");
  const [daysInOfficePerWeek, setDaysInOfficePerWeek] = useState<string>("");

  const [pictureUrl, setPictureUrl] = useState<string>("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [salaryExpectations, setSalaryExpectations] = useState("");
  const [remoteInterest, setRemoteInterest] = useState<"any" | "remote">("any");

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [extractingSkills, setExtractingSkills] = useState(false);

  const MAX_SKILLS = 100;

  const normalizeSkill = (s: string) => s.trim().replace(/\s+/g, " ");
  const uniqueSkills = (list: string[]) =>
    Array.from(
      new Map(
        list
          .map((s) => normalizeSkill(String(s)))
          .filter(Boolean)
          .map((s) => [s.toLowerCase(), s] as const)
      ).values()
    ).slice(0, MAX_SKILLS);
  const addSkillsFromInput = async () => {
    const raw = skillInput.trim();
    if (!raw) return;

    const parts = raw
      .split(/[,;\n]/g)
      .map(normalizeSkill)
      .filter(Boolean);

    if (!parts.length) return;

    const merged = uniqueSkills([...skills, ...parts]);

    setSkills(merged);
    setSkillInput("");
    await persistSkills(merged);
  };

  const removeSkill = async (skill: string) => {
    const next = skills.filter((s) => s !== skill);
    setSkills(next);
    await persistSkills(next);
  };

  const persistSkills = async (nextSkills: string[]) => {
    try {
      const saved = await apiClient.updateTalentProfile({ skills: nextSkills });
      setCurrentUser(saved.user as User);
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save skills");
    }
  };

  useEffect(() => {
    setFirstName(currentUser?.first_name ?? "");
    setLastName(currentUser?.last_name ?? "");
    setEmail(currentUser?.email ?? "");

    // Optional profile fields (may be null/undefined)
    setPhoneNumber((currentUser as any)?.phone_number ?? "");
    setLocation((currentUser as any)?.location ?? "");
    setLinkedInUrl((currentUser as any)?.linkedin_profile_url ?? "");
    setPictureUrl((currentUser as any)?.picture_url ?? "");
    const wt = (currentUser as any)?.work_type;
    setWorkType(
      wt === "all_types" || wt === "remote" || wt === "hybrid" || wt === "onsite"
        ? wt
        : ""
    );
    const jt = (currentUser as any)?.job_type;
    setJobType(jt === "full_time" || jt === "contract" ? jt : "");
    const dio = (currentUser as any)?.days_in_office;
    setDaysInOfficePerWeek(
      dio != null && dio !== "" ? String(dio) : ""
    );
    setRemoteInterest(
      (currentUser as any)?.remote_interest === "remote" ||
        (currentUser as any)?.remote_interest === true ||
        (currentUser as any)?.remote_interest === "true" ||
        wt === "remote"
        ? "remote"
        : "any"
    );
    setSalaryExpectations((currentUser as any)?.salary_expectations ?? "");
    setSkills(((currentUser as any)?.skills as string[]) ?? []);
  }, [currentUser]);

  const refreshCurrentUser = async () => {
    try {
      sessionStorage.removeItem("ct.currentUser");
    } catch {
      // ignore
    }
    try {
      const res = await apiClient.getTalentProfile();
      if (res?.user) {
        const u = res.user as User;
        setCurrentUser(u);
        setCachedCurrentUser(u);
        await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        return;
      }
    } catch {
      // fallback to auth/me
    }
    const fresh = await getCurrentUser({ force: true });
    setCurrentUser(fresh);
    await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF, DOC, or DOCX file");
      return;
    }

    await uploadResume(file);

    // Call RESUME_PARSER_API + RESUME_SCORE_API (same as ch-job-marketplace) and log to console
    try {
      const parseResult = await apiClient.parseResumeWithParser(file);
      const data = parseResult.data as { parse?: unknown; rank?: unknown; rankError?: string } | undefined;
      console.log("[Resume Parser API] Parsed output:", data?.parse ?? parseResult.data);
      if (data?.rank != null) {
        console.log("[Resume Score/Rank API] Rank output:", data.rank);
      }
      if (data?.rankError) {
        console.warn("[Resume Score/Rank API] Error (rank not available):", data.rankError);
      }
    } catch (err) {
      console.warn("[Resume Parser/Rank API] Request failed (resume still saved):", err);
    }

    // After upload, refresh resumes list and user profile (city_state/linkedin may be enriched server-side)
    await queryClient.invalidateQueries({ queryKey: ["resumes"] });
    await refreshCurrentUser();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteResume = async () => {
    if (!resumeToDelete) return;

    const resume = resumes.find((r) => r.id === resumeToDelete);
    if (resume) {
      await deleteResume(resume);
      setDeleteDialogOpen(false);
      setResumeToDelete(null);
    }
  };

  const handleDownloadResume = (resumeId: string) => {
    const url = apiClient.getResumeDownloadUrl(resumeId);
    window.open(url, "_blank");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic guard; server should enforce too
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    try {
      const res = await apiClient.uploadTalentPhoto(file);

      setPictureUrl(res.url);
      setCurrentUser(res.user as User);
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      toast.success("Profile photo uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload photo");
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleExtractSkills = async () => {
    try {
      const defaultResume = resumes.find((r) => r.is_default) || resumes[0];
      if (!defaultResume) {
        toast.error("Upload a resume first");
        return;
      }

      setExtractingSkills(true);
      const t = toast.loading("Extracting skills from resume...");

      const res = await apiClient.extractResumeSkills(defaultResume.id);
      const extractedSkills = res?.data?.skills || [];

      if (!extractedSkills.length) {
        toast.error("No skills found", {
          id: t,
          description:
            "Could not extract skills from resume. The resume parser service may be unreachable or misconfigured. If you are running locally, configure a reachable DATASORT_API/DATASORT_API_TOKEN or set OPENAI_API_KEY for fallback extraction.",
        });
        return;
      }

      const mergedSkills = uniqueSkills([...skills, ...(extractedSkills as string[])]);

      setSkills(mergedSkills);

      // Persist skills only. Backend `PUT /api/profile` was fixed to not blank other fields
      // when only `skills` is provided.
      const saved = await apiClient.updateTalentProfile({ skills: mergedSkills });
      setCurrentUser(saved.user as User);
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      // After extraction, overwrite phone/location/linkedin ONLY if server returned a value.
      // If server returned null/empty, keep user's current input.
      const phoneFromServer = (saved.user as any)?.phone_number;
      const locationFromServer = (saved.user as any)?.location;
      const linkedInFromServer = (saved.user as any)?.linkedin_profile_url;

      if (typeof phoneFromServer === "string" && phoneFromServer.trim() !== "") {
        setPhoneNumber(phoneFromServer);
      }
      if (typeof locationFromServer === "string" && locationFromServer.trim() !== "") {
        setLocation(locationFromServer);
      }
      if (typeof linkedInFromServer === "string" && linkedInFromServer.trim() !== "") {
        setLinkedInUrl(linkedInFromServer);
      }

      toast.success("Skills extracted", {
        id: t,
        description: `Added ${extractedSkills.length} skill${
          extractedSkills.length !== 1 ? "s" : ""
        } from your resume.`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Extraction failed", {
        description: "Failed to extract skills from resume. Please try again.",
      });
    } finally {
      setExtractingSkills(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await apiClient.updateTalentProfile({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        location: location || null,
        linkedin_profile_url: linkedInUrl || null,
        picture_url: pictureUrl || null,
        remote_interest: remoteInterest,
        salary_expectations: salaryExpectations || null,
        skills,
        job_type: jobType || null,
        work_type: workType || null,
        days_in_office:
          workType === "hybrid" && daysInOfficePerWeek
            ? parseInt(daysInOfficePerWeek, 10)
            : null,
      });

      // Refresh caches so navbar + form reflect latest values everywhere
      const updatedUser = res.user as User;
      setCurrentUser(updatedUser);
      setCachedCurrentUser(updatedUser);
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      toast.success("Profile saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile");
    }
  };

  const handleUpgradeToPremium = () => {
    // Until we port the full premium offering page into ctnew,
    // open the existing offering in the legacy app.
    window.open("https://ch-job-marketplace.cardinaltalent.ai/premium", "_blank");
  };

  return (
    <DashboardLayout role="talent" userName={displayName}>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Profile
        </h1>
        <p className="text-muted-foreground">Manage your profile and resume.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            Profile Information
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-secondary/40 overflow-hidden flex items-center justify-center">
              {pictureUrl ? (
                <img
                  src={pictureUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">
                  {displayName.charAt(0)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={phoneNumber}
                  placeholder="(optional)"
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobType">Job Type</Label>
                <Select
                  value={jobType || undefined}
                  onValueChange={(v) => setJobType((v || "") as "full_time" | "contract")}
                >
                  <SelectTrigger id="jobType">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workType">Work Type</Label>
                <Select
                  value={workType || undefined}
                  onValueChange={(v) => {
                    const val = (v || "") as "all_types" | "remote" | "hybrid" | "onsite";
                    setWorkType(val);
                    setRemoteInterest(val === "remote" ? "remote" : "any");
                    if (val !== "hybrid") setDaysInOfficePerWeek("");
                  }}
                >
                  <SelectTrigger id="workType">
                    <SelectValue placeholder="Select work type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_types">All Types</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-Site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {workType === "hybrid" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daysInOffice">Days in office per week</Label>
                  <Select
                    value={daysInOfficePerWeek || undefined}
                    onValueChange={(v) => setDaysInOfficePerWeek(v || "")}
                  >
                    <SelectTrigger id="daysInOffice">
                      <SelectValue placeholder="Select days" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? "day" : "days"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location-hybrid">Office location</Label>
                  <Input
                    id="location-hybrid"
                    value={location}
                    placeholder="e.g. San Francisco, CA"
                    onChange={(e) => setLocation(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Where you’d go in for hybrid work
                  </p>
                </div>
              </div>
            )}

            {workType !== "hybrid" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    placeholder="(optional)"
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryExpectations">Minimum Salary Expectations</Label>
                  <Input
                    id="salaryExpectations"
                    type="text"
                    placeholder="e.g. $120,000"
                    value={salaryExpectations}
                    onChange={(e) => setSalaryExpectations(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for job matching / auto-apply thresholds
                  </p>
                </div>
              </div>
            )}

            {workType === "hybrid" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaryExpectations">Minimum Salary Expectations</Label>
                  <Input
                    id="salaryExpectations"
                    type="text"
                    placeholder="e.g. $120,000"
                    value={salaryExpectations}
                    onChange={(e) => setSalaryExpectations(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for job matching / auto-apply thresholds
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2">
                <Linkedin className="w-4 h-4" />
                LinkedIn URL
              </Label>
              <Input
                id="linkedin"
                type="url"
                value={linkedInUrl}
                placeholder="https://linkedin.com/in/yourprofile"
                onChange={(e) => setLinkedInUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button variant="hero" onClick={handleSaveProfile}>
              Save Changes
            </Button>
          </div>
        </div>

        {/* Resume Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            Resume
          </h2>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-6">
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">
              Upload your resume
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              PDF, DOC, or DOCX up to 5MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </Button>
          </div>

          {/* Resume List */}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading resumes...</p>
          ) : resumes.length > 0 ? (
            <div className="space-y-3">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 text-primary flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
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
                  </div>

                  <div className="flex items-center gap-2">
                    {!resume.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultResume(resume.id)}
                        title="Make Default"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadResume(resume.id)}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setResumeToDelete(resume.id);
                        setDeleteDialogOpen(true);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No resumes uploaded yet
            </p>
          )}
        </div>

        {/* Skills Section */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Skills
            </h2>
            <Button
              variant="outline"
              onClick={handleExtractSkills}
              disabled={extractingSkills}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {extractingSkills ? "Extracting..." : "Extract Skills from Resume"}
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={skillInput}
                placeholder="Add a skill (press Enter or use commas)..."
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    await addSkillsFromInput();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const raw = skillInput.trim();
                  if (!raw) return;
                  const parts = raw
                    .split(/[,;\n]/g)
                    .map(normalizeSkill)
                    .filter(Boolean);

                  const merged = uniqueSkills([...skills, ...parts]);
                  setSkills(merged);
                  setSkillInput("");
                  await persistSkills(merged);
                }}
                disabled={!skillInput.trim()}
              >
                Add
              </Button>
            </div>

            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-secondary/40 border border-border"
                  >
                    {s}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeSkill(s)}
                      aria-label={`Remove ${s}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No skills yet. Click “Extract Skills from Resume” or add skills manually.
              </p>
            )}
          </div>
        </div>

        {/* Auto Apply */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Auto Apply
              </h2>
              <p className="text-sm text-muted-foreground">
                Automatically apply to matching jobs
              </p>
            </div>
            <Badge variant="secondary">Premium Feature</Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div>
                <p className="font-medium text-foreground">Enabe Auto Apply</p>
                <p className="text-sm text-muted-foreground">
                  We'll apply to jobs with 85%+ match score
                </p>
              </div>
              <Switch disabled />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="hero" onClick={handleUpgradeToPremium}>
              Upgrade to Premium
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resume? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteResume}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default TalentSettings;
