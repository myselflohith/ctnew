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
<<<<<<< Updated upstream
import {
  LayoutDashboard,
  Search,
  FileText,
  Heart,
  Settings,
  Upload,
  Linkedin,
  Download,
  Trash2,
  Star,
  Calendar,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
=======
import { Linkedin, Download, Trash2, Star, Upload, Camera } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
>>>>>>> Stashed changes
import { useResumes } from "@/hooks/useResumes";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";
<<<<<<< Updated upstream
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent/dashboard" },
  { icon: Search, label: "Find Jobs", path: "/talent/jobs" },
  { icon: Heart, label: "Saved Jobs", path: "/talent/saved" },
  { icon: FileText, label: "Applications", path: "/talent/applications" },
  { icon: Calendar, label: "Interviews", path: "/talent/interviews" },
  { icon: Settings, label: "Settings", path: "/talent/settings" },
];
=======
import { getCurrentUser, type User } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
>>>>>>> Stashed changes

type User = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string;
  company_name?: string | null;
  role?: string;
};

const TalentSettings = () => {
  const { resumes, loading, uploadResume, setDefaultResume, deleteResume } = useResumes();
<<<<<<< Updated upstream
  const { toast: toastHook } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
=======
  const queryClient = useQueryClient();
>>>>>>> Stashed changes
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

<<<<<<< Updated upstream
  useEffect(() => {
    let cancelled = false;
    apiClient
      .getCurrentUser()
      .then((res: any) => {
        if (cancelled) return;
        if (res.success && res.user) {
          setUser(res.user);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toastHook({
        title: "Name required",
        description: "First name and last name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res: any = await apiClient.updateCurrentUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (res.success && res.user) {
        setUser(res.user);
        toastHook({
          title: "Saved",
          description: "Your profile has been updated.",
        });
      } else {
        throw new Error(res?.error || "Failed to save changes");
      }
    } catch (error: any) {
      toastHook({
        title: "Error saving changes",
        description: error?.message || "Unable to update your profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
=======
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    getCurrentUser({ force: true }).then(setCurrentUser);
  }, []);

  const displayName = useMemo(() => {
    if (!currentUser) return "User";
    const byParts = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ");
    return byParts || currentUser.email || "User";
  }, [currentUser]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Optional fields (blank unless resume parsed / user explicitly fills)
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState(""); // city_state on backend
  const [linkedInUrl, setLinkedInUrl] = useState(""); // linkedin_profile_url on backend

  const [photoUrl, setPhotoUrl] = useState<string>("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [skills, setSkills] = useState<string[]>([]);
  const [extractingSkills, setExtractingSkills] = useState(false);

  useEffect(() => {
    setFirstName(currentUser?.first_name ?? "");
    setLastName(currentUser?.last_name ?? "");
    setEmail(currentUser?.email ?? "");

    // Optional profile fields (may be null/undefined)
    setPhone((currentUser as any)?.phone ?? "");
    setLocation((currentUser as any)?.city_state ?? "");
    setLinkedInUrl((currentUser as any)?.linkedin_profile_url ?? "");
    setPhotoUrl((currentUser as any)?.photo_url ?? "");
    setSkills(((currentUser as any)?.skills as string[]) ?? []);
  }, [currentUser]);

  const refreshCurrentUser = async () => {
    // Clear cached user so we definitely re-fetch latest profile from server
    try {
      sessionStorage.removeItem("ct.currentUser");
    } catch {
      // ignore
    }
    const fresh = await getCurrentUser({ force: true });
    setCurrentUser(fresh);
    await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
>>>>>>> Stashed changes
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic guard; server should enforce too
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    try {
      const res = await apiClient.uploadTalentPhoto(file);

      setPhotoUrl(res.url);
      setCurrentUser(res.user as User);
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      toast.success("Profile photo uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload photo");
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = "";
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
      toast.message("Extracting skills...");

      const res = await apiClient.extractResumeSkills(defaultResume.id);
      const extractedSkills = res?.data?.skills || [];

      if (!extractedSkills.length) {
        toast.error("No skills found in resume");
        return;
      }

      setSkills(extractedSkills);

      // Persist skills immediately so refresh/nav/etc show latest
      const saved = await apiClient.updateTalentProfile({ skills: extractedSkills });
      setCurrentUser(saved.user as User);
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      toast.success("Skills extracted from resume");
    } catch (err) {
      console.error(err);
      toast.error("Failed to extract skills");
    } finally {
      setExtractingSkills(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await apiClient.updateTalentProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        city_state: location || null,
        linkedin_profile_url: linkedInUrl || null,
        photo_url: photoUrl || null,
        skills,
      });

      // Refresh caches so navbar + form reflect latest values everywhere
      setCurrentUser(res.user as User);
      try {
        sessionStorage.setItem("ct.currentUser", JSON.stringify(res.user));
      } catch {
        // ignore
      }
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

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || "Talent"
    : "Talent";

  return (
<<<<<<< Updated upstream
    <DashboardLayout role="talent" navItems={navItems} userName={displayName}>
=======
    <DashboardLayout role="talent" userName={displayName}>
>>>>>>> Stashed changes
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Profile</h1>
        <p className="text-muted-foreground">Manage your profile and resume.</p>
      </div>

      <div className="space-y-6">
<<<<<<< Updated upstream
          {/* Profile Section */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Profile Information
            </h2>
            {loadingUser ? (
              <p className="text-sm text-muted-foreground">Loading profile...</p>
            ) : (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email ?? ""}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn URL
                  </Label>
                  <Input id="linkedin" type="url" placeholder="https://linkedin.com/in/yourprofile" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" placeholder="e.g. City, Country" />
                </div>
              </div>
            )}
            <Button
              variant="hero"
              className="mt-6"
              disabled={loadingUser || saving}
              onClick={handleSaveProfile}
            >
              {saving ? "Saving…" : "Save Changes"}
=======
        {/* Profile Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            Profile Information
          </h2>

          {/* Photo */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-secondary/40 overflow-hidden flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">
                  {displayName.charAt(0)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <Button variant="outline" onClick={() => photoInputRef.current?.click()}>
                <Camera className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                placeholder="(optional)"
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                placeholder="(optional)"
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button variant="hero" onClick={handleSaveProfile}>
              Save Changes
>>>>>>> Stashed changes
            </Button>
          </div>
        </div>

        {/* Resume Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">Resume</h2>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-6">
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">Upload your resume</p>
            <p className="text-sm text-muted-foreground mb-4">PDF, DOC, or DOCX up to 5MB</p>
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
                      <p className="font-medium text-foreground truncate">{resume.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(resume.file_size)} • {format(new Date(resume.created_at), "MMM d, yyyy")}
                        {resume.is_default && <span className="ml-2 text-primary">• Default</span>}
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
                        <Star className="w-4 h-4" />
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
            <p className="text-sm text-muted-foreground text-center py-4">No resumes uploaded yet</p>
          )}
        </div>

        {/* Skills Section */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-display text-xl font-semibold text-foreground">Skills</h2>
            <Button variant="outline" onClick={handleExtractSkills} disabled={extractingSkills}>
              {extractingSkills ? "Extracting..." : "Extract from Resume"}
            </Button>
          </div>

          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-full text-sm bg-secondary/40 border border-border"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No skills yet. Click “Extract from Resume” to parse your uploaded resume.
            </p>
          )}
        </div>

        {/* Auto Apply */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Auto Apply</h2>
              <p className="text-sm text-muted-foreground">Automatically apply to matching jobs</p>
            </div>
            <Badge variant="secondary">Premium Feature</Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div>
                <p className="font-medium text-foreground">Enable Auto Apply</p>
                <p className="text-sm text-muted-foreground">We'll apply to jobs with 85%+ match score</p>
              </div>
              <Switch disabled />
            </div>
<<<<<<< Updated upstream
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div>
                  <p className="font-medium text-foreground">Enable Auto Apply</p>
                  <p className="text-sm text-muted-foreground">
                    We'll apply to jobs with 85%+ match score
                  </p>
                </div>
                <Switch 
                  checked={autoApplyEnabled} 
                  onCheckedChange={setAutoApplyEnabled}
                  disabled={!isPremium}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div>
                  <p className="font-medium text-foreground">Job Type</p>
                  <p className="text-sm text-muted-foreground">
                    Filter by work location preference
                  </p>
                </div>
                <Select>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote Only</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div>
                  <p className="font-medium text-foreground">Minimum Salary Expectations</p>
                  <p className="text-sm text-muted-foreground">
                    Only auto-apply to jobs above this amount
                  </p>
                </div>
                <Input 
                  type="text" 
                  placeholder="e.g. $120,000" 
                  className="w-[160px]"
                />
=======

            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div>
                <p className="font-medium text-foreground">Job Type</p>
                <p className="text-sm text-muted-foreground">Filter by work location preference</p>
              </div>
              <Select defaultValue="remote" disabled>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote Only</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">Onsite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div>
                <p className="font-medium text-foreground">Minimum Salary Expectations</p>
                <p className="text-sm text-muted-foreground">Only auto-apply to jobs above this amount</p>
>>>>>>> Stashed changes
              </div>
              <Input
                type="text"
                placeholder="e.g. $120,000"
                defaultValue="$120,000"
                className="w-[160px]"
                disabled
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="hero" onClick={handleUpgradeToPremium}>
              Upgrade to Premium
            </Button>
          </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resume? This action cannot be undone.
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
