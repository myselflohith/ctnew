import DashboardLayout from "@/components/layout/DashboardLayout";
import { employerNavItems } from "@/components/layout/navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Building2,
  Upload,
  Globe,
  Linkedin,
  Twitter,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface Requirement {
  id?: string;
  requirement_text: string;
  requirement_type: 'mustHave' | 'niceToHave';
  weight: number;
}

interface OrganizationData {
  id: string;
  name: string | null;
  description: string | null;
  industry: string | null;
  location: string | null;
  website_url: string | null;
  image_url: string | null;
  company_size: number | null;
}

const emptyOrg: OrganizationData = {
  id: "",
  name: "",
  description: "",
  industry: "",
  location: "",
  website_url: "",
  image_url: "",
  company_size: null,
};

const EmployerCompany = () => {
  const [user, setUser] = useState<{ first_name?: string | null; last_name?: string | null; company_name?: string | null; organization_id?: string | null } | null>(null);
  const [org, setOrg] = useState<OrganizationData | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [orgIdentifier, setOrgIdentifier] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirement, setNewRequirement] = useState({
    requirement_text: "",
    requirement_type: "mustHave" as 'mustHave' | 'niceToHave',
    weight: 5,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Fields not in API – kept on frontend only, not sent to backend
  const [localOnly, setLocalOnly] = useState({
    founded: "",
    headquarters: "",
    linkedin: "",
    twitter: "",
    benefits: "",
    culture: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true);
        const userResponse = await apiClient.getCurrentUser();
        if (!userResponse.success || !userResponse.user) {
          setFetching(false);
          return;
        }
        const u = userResponse.user;
        setUser(u);
        const nameOrId = u.organization_id || u.company_name || null;
        if (!nameOrId) {
          setCompanyName(u.company_name || "");
          setFetching(false);
          return;
        }
        setOrgIdentifier(nameOrId);
        setCompanyName(u.company_name || "");

        const orgResponse = await apiClient.getOrganization(nameOrId);
        if (orgResponse.success && orgResponse.data) {
          const d = orgResponse.data as Record<string, unknown>;
          setOrg({
            id: String(d.id ?? ""),
            name: d.name != null ? String(d.name) : "",
            description: d.description != null ? String(d.description) : "",
            industry: d.industry != null ? String(d.industry) : "",
            location: d.location != null ? String(d.location) : "",
            website_url: d.website_url != null ? String(d.website_url) : "",
            image_url: d.image_url != null ? String(d.image_url) : "",
            company_size: typeof d.company_size === "number" ? d.company_size : null,
          });
          setCompanyName(d.name != null ? String(d.name) : u.company_name ?? "");
        }

        const reqResponse = await apiClient.getOrganizationRequirements(nameOrId);
        if (reqResponse.success && Array.isArray(reqResponse.data)) {
          setRequirements(reqResponse.data as Requirement[]);
        }
      } catch (error) {
        console.error("Error fetching company data:", error);
        toast.error("Failed to load company data");
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, []);

  const handleAddRequirement = async () => {
    if (!newRequirement.requirement_text.trim()) {
      toast.error("Please enter a requirement");
      return;
    }
    if (!orgIdentifier) {
      toast.error("No company linked. Save company details first.");
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.addOrganizationRequirement(orgIdentifier, newRequirement);
      if (response.success && response.data) {
        const added = response.data as Requirement;
        setRequirements([...requirements, added]);
        setNewRequirement({ requirement_text: "", requirement_type: "mustHave", weight: 5 });
        toast.success("Requirement added");
      }
    } catch (error: any) {
      console.error("Error adding requirement:", error);
      toast.error(error.message || "Failed to add requirement");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequirement = async (requirementId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.deleteOrganizationRequirement(requirementId);
      if (response.success) {
        setRequirements(requirements.filter(r => r.id !== requirementId));
        toast.success("Requirement deleted");
      }
    } catch (error: any) {
      console.error("Error deleting requirement:", error);
      toast.error(error.message || "Failed to delete requirement");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!org) {
      toast.error("No company data to save");
      return;
    }
    try {
      setSaving(true);
      const response = await apiClient.saveOrganization({
        id: org.id,
        name: org.name || companyName,
        description: org.description || null,
        industry: org.industry || null,
        location: org.location || null,
        website_url: org.website_url || null,
        image_url: org.image_url || null,
        company_size: org.company_size ?? null,
      });
      if (response.success && response.data) {
        const data = response.data as Partial<OrganizationData>;
        setOrg((prev) => (prev && data ? { ...prev, ...data } : prev));
        toast.success("Company details saved");
      }
    } catch (error: any) {
      console.error("Error saving company:", error);
      toast.error(error.message || "Failed to save company details");
    } finally {
      setSaving(false);
    }
  };

  const updateOrg = (updates: Partial<OrganizationData>) => {
    setOrg((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleLogoButtonClick = () => {
    if (!org) {
      toast.error("Please load and save company details first.");
      return;
    }
    logoInputRef.current?.click();
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!org) {
      toast.error("No company loaded.");
      return;
    }

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Please upload a PNG or JPG image.");
      e.target.value = "";
      return;
    }
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("Logo must be 2MB or smaller.");
      e.target.value = "";
      return;
    }

    try {
      setUploadingLogo(true);
      const response = await apiClient.uploadCompanyLogo(file, org.id);
      if (response.success && response.url) {
        updateOrg({ image_url: response.url });
        toast.success("Logo uploaded");
      }
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  if (fetching) {
    return (
      <DashboardLayout role="employer" navItems={employerNavItems}>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Company Profile</h1>
          <p className="text-muted-foreground">Loading company data...</p>
        </div>
      </DashboardLayout>
    );
  }

  const orgData = org ?? emptyOrg;

  return (
    <DashboardLayout
      role="employer"
      navItems={employerNavItems}
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Company Profile
        </h1>
        <p className="text-muted-foreground">
          Manage your company information to attract top talent.
        </p>
      </div>

      <div className="space-y-6">
        <div className="glass rounded-2xl p-6">
          {/* Logo control row sits above details to avoid empty left-column space */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-border">
            <div className="shrink-0 mx-auto sm:mx-0">
              {orgData.image_url ? (
                <img
                  src={orgData.image_url}
                  alt="Company logo"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center">
                  <Building2 className="w-12 h-12 sm:w-14 sm:h-14 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h2 className="font-display text-lg font-semibold text-foreground">Company Logo</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-3">PNG or JPG, max 2MB</p>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleLogoFileChange}
              />
              <Button variant="outline" size="sm" onClick={handleLogoButtonClick} disabled={uploadingLogo}>
                <Upload className="w-4 h-4 mr-2" />
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </Button>
            </div>
          </div>

          <div className="pt-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={orgData.name ?? ""}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={orgData.industry ?? ""}
                    onChange={(e) => updateOrg({ industry: e.target.value })}
                    placeholder="e.g. Technology"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Company Size</Label>
                  <Input
                    id="size"
                    type="number"
                    min={1}
                    value={orgData.company_size ?? ""}
                    onChange={(e) => updateOrg({ company_size: e.target.value ? parseInt(e.target.value, 10) : null })}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="founded">Founded</Label>
                  <Input
                    id="founded"
                    value={localOnly.founded}
                    onChange={(e) => setLocalOnly((p) => ({ ...p, founded: e.target.value }))}
                    placeholder="e.g. 2020"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headquarters">Headquarters</Label>
                  <Input
                    id="headquarters"
                    value={orgData.location ?? ""}
                    onChange={(e) => updateOrg({ location: e.target.value })}
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={orgData.description ?? ""}
                  onChange={(e) => updateOrg({ description: e.target.value })}
                  placeholder="Describe your company..."
                />
              </div>
            </div>
          </div>
        </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold text-foreground mb-6">
              Social Links
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={orgData.website_url ?? ""}
                  onChange={(e) => updateOrg({ website_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  value={localOnly.linkedin}
                  onChange={(e) => setLocalOnly((p) => ({ ...p, linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Label>
                <Input
                  id="twitter"
                  value={localOnly.twitter}
                  onChange={(e) => setLocalOnly((p) => ({ ...p, twitter: e.target.value }))}
                  placeholder="https://twitter.com/..."
                />
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold text-foreground mb-6">
              Benefits & Culture
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="benefits">Benefits</Label>
                <Textarea
                  id="benefits"
                  rows={3}
                  value={localOnly.benefits}
                  onChange={(e) => setLocalOnly((p) => ({ ...p, benefits: e.target.value }))}
                  placeholder="List benefits (e.g. health insurance, 401k, remote work...)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="culture">Culture</Label>
                <Textarea
                  id="culture"
                  rows={3}
                  value={localOnly.culture}
                  onChange={(e) => setLocalOnly((p) => ({ ...p, culture: e.target.value }))}
                  placeholder="Describe your company culture..."
                />
              </div>
            </div>
          </div>

          <Button variant="hero" size="lg" onClick={handleSaveCompany} disabled={saving || !org}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
      </div>

      {/* Must Have Job Requirements */}
      <div className="glass rounded-2xl p-6 mt-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-6">
          Must Have Job Requirements
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          These requirements will automatically be copied to every new job you create.
        </p>

        {/* Add New Requirement */}
        <div className="space-y-4 mb-6 p-4 bg-secondary/30 rounded-xl">
          <div className="space-y-2">
            <Label htmlFor="requirement-text">Requirement Text</Label>
            <Textarea
              id="requirement-text"
              value={newRequirement.requirement_text}
              onChange={(e) => setNewRequirement({ ...newRequirement, requirement_text: e.target.value })}
              placeholder="e.g. Minimum 5 years of experience in React"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requirement-type">Type</Label>
              <select
                id="requirement-type"
                value={newRequirement.requirement_type}
                onChange={(e) => setNewRequirement({ ...newRequirement, requirement_type: e.target.value as 'mustHave' | 'niceToHave' })}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              >
                <option value="mustHave">Must Have</option>
                <option value="niceToHave">Nice to Have</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="requirement-weight">Weight (1-10)</Label>
              <Input
                id="requirement-weight"
                type="number"
                min="1"
                max="10"
                value={newRequirement.weight}
                onChange={(e) => setNewRequirement({ ...newRequirement, weight: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>
          <Button onClick={handleAddRequirement} disabled={loading} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Requirement
          </Button>
        </div>

        {/* Requirements List */}
        <div className="space-y-3">
          {requirements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No requirements added yet. Add your first requirement above.
            </p>
          ) : (
            requirements.map((req) => (
              <div
                key={req.id}
                className="flex items-start justify-between p-4 bg-secondary/30 rounded-xl"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={req.requirement_type === "mustHave" ? "destructive" : "secondary"}>
                      {req.requirement_type === "mustHave" ? "Must Have" : "Nice to Have"}
                    </Badge>
                    <Badge variant="outline">Weight: {req.weight}</Badge>
                  </div>
                  <p className="text-foreground">{req.requirement_text}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => req.id && handleDeleteRequirement(req.id)}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 mt-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-2">
          Notification preferences
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Choose what you want to be notified about.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">New applications</p>
              <p className="text-sm text-muted-foreground">
                When candidates apply to your jobs
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">Interview reminders</p>
              <p className="text-sm text-muted-foreground">
                Before scheduled interviews
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">Weekly digest</p>
              <p className="text-sm text-muted-foreground">
                Summary of hiring activity
              </p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">AI recommendations</p>
              <p className="text-sm text-muted-foreground">
                High-match candidate alerts
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployerCompany;
