import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { employerNavItems } from "@/components/layout/navItems";
import { setCachedCurrentUser, type User } from "@/lib/auth";

/**
 * Personal profile for the signed-in employer (human), not company/org settings.
 */
const EmployerProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [pictureUrl, setPictureUrl] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.getTalentProfile();
        if (cancelled || !res?.user) return;
        const u = res.user as User;
        setCurrentUser(u);
        setFirstName(u.first_name ?? "");
        setLastName(u.last_name ?? "");
        setEmail(u.email ?? "");
        setPhoneNumber(u.phone_number ?? "");
        setLocation(u.location ?? "");
        setLinkedInUrl(u.linkedin_profile_url ?? "");
        setPictureUrl(
          typeof u.picture_url === "string" ? u.picture_url : (u.picture_url as any) ? String(u.picture_url) : ""
        );
      } catch {
        toast.error("Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || email || "You";

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const maxBytes = 1 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("Profile picture must be under 1 MB.");
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }
    try {
      setUploadingAvatar(true);
      const res = await apiClient.uploadTalentPhoto(file);
      setPictureUrl(res.url);
      const u = res.user as User;
      setCurrentUser(u);
      setCachedCurrentUser(u);
      try {
        window.dispatchEvent(new CustomEvent("ct.currentUser.updated", { detail: u }));
        sessionStorage.setItem("ct.currentUser", JSON.stringify(u));
      } catch {
        /* ignore */
      }
      toast.success("Profile photo updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload photo");
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    try {
      setSaving(true);
      const res = await apiClient.updateTalentProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim() || null,
        location: location.trim() || null,
        linkedin_profile_url: linkedInUrl.trim() || null,
      });
      if (res?.user) {
        const u = res.user as User;
        setCurrentUser(u);
        setCachedCurrentUser(u);
        try {
          window.dispatchEvent(new CustomEvent("ct.currentUser.updated", { detail: u }));
          sessionStorage.setItem("ct.currentUser", JSON.stringify(u));
        } catch {
          /* ignore */
        }
        toast.success("Profile saved");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const roleStr = currentUser?.role != null ? String(currentUser.role) : "";
  const roleLabel =
    roleStr === "employer" || roleStr === "5"
      ? "Employer"
      : roleStr
        ? roleStr.charAt(0).toUpperCase() + roleStr.slice(1).replace(/_/g, " ")
        : "";

  return (
    <DashboardLayout role="employer" navItems={employerNavItems}>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Your profile</h1>
        <p className="text-muted-foreground">
          Your personal account details and photo. Company information is managed on the{" "}
          <Link to="/employer/company" className="text-primary underline-offset-4 hover:underline">
            Company
          </Link>{" "}
          page.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="w-full max-w-none">
          <div className="glass rounded-2xl p-6 w-full">
            {/* Photo + upload directly above personal details — one row, no empty sidebar column */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-border">
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden bg-gradient-to-br from-cardinal to-amber flex items-center justify-center text-white text-2xl font-semibold shrink-0 mx-auto sm:mx-0">
                {pictureUrl ? (
                  <img src={pictureUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h2 className="font-display text-lg font-semibold text-foreground">Profile photo</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-3">JPG or PNG, max 1 MB.</p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {uploadingAvatar ? "Uploading…" : "Upload or change picture"}
                </Button>
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Personal details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emp-first">First name</Label>
                  <Input id="emp-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-last">Last name</Label>
                  <Input id="emp-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-email">Email</Label>
                <Input id="emp-email" type="email" value={email} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-phone">Phone</Label>
                <Input
                  id="emp-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-location">Location</Label>
                <Input
                  id="emp-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, region, or country"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-li">LinkedIn profile URL</Label>
                <Input
                  id="emp-li"
                  type="url"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/…"
                />
              </div>
              {roleLabel && (
                <div className="space-y-2">
                  <Label>Account type</Label>
                  <Input value={roleLabel} readOnly className="bg-muted/50" />
                </div>
              )}
              {currentUser?.company_name && (
                <div className="space-y-2">
                  <Label>Organization (read-only)</Label>
                  <Input value={currentUser.company_name} readOnly className="bg-muted/50" />
                </div>
              )}
              <Button variant="hero" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EmployerProfile;
