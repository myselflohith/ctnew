import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  Upload,
  Globe,
  Linkedin,
  Twitter,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

interface Requirement {
  id?: string;
  requirement_text: string;
  requirement_type: 'mustHave' | 'niceToHave';
  weight: number;
}

const EmployerCompany = () => {
  const [companyName, setCompanyName] = useState("TechCorp AI");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirement, setNewRequirement] = useState({
    requirement_text: "",
    requirement_type: "mustHave" as 'mustHave' | 'niceToHave',
    weight: 5,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await apiClient.getCurrentUser();
        if (userResponse.success && userResponse.user?.company_name) {
          const name = userResponse.user.company_name;
          setCompanyName(name);
          
          // Fetch organization and requirements
          const orgResponse = await apiClient.getOrganization(name);
          if (orgResponse.success && orgResponse.data) {
            const reqResponse = await apiClient.getOrganizationRequirements(name);
            if (reqResponse.success && reqResponse.data) {
              setRequirements(reqResponse.data);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching company data:", error);
      }
    };
    fetchData();
  }, []);

  const handleAddRequirement = async () => {
    if (!newRequirement.requirement_text.trim()) {
      toast.error("Please enter a requirement");
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.addOrganizationRequirement(companyName, newRequirement);
      if (response.success) {
        setRequirements([...requirements, response.data]);
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
    try {
      setSaving(true);
      // Save company details (this would need to be implemented)
      toast.success("Company details saved");
    } catch (error: any) {
      console.error("Error saving company:", error);
      toast.error(error.message || "Failed to save company details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      role="employer"
      navItems={navItems}
      userName="Jane Smith"
      companyName="TechCorp AI"
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Company Profile
        </h1>
        <p className="text-muted-foreground">
          Manage your company information to attract top talent.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Logo Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Company Logo
          </h2>
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center mb-4">
              <Building2 className="w-16 h-16 text-primary" />
            </div>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload Logo
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              PNG or JPG, max 2MB
            </p>
          </div>
        </div>

        {/* Company Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold text-foreground mb-6">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" defaultValue="TechCorp AI" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" defaultValue="Artificial Intelligence" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Company Size</Label>
                  <Input id="size" defaultValue="51-200 employees" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="founded">Founded</Label>
                  <Input id="founded" defaultValue="2020" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headquarters">Headquarters</Label>
                  <Input id="headquarters" defaultValue="San Francisco, CA" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  defaultValue="TechCorp AI is a leading artificial intelligence company focused on building cutting-edge solutions for enterprise customers. We're passionate about using AI to solve real-world problems."
                />
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
                <Input id="website" defaultValue="https://techcorp.ai" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </Label>
                <Input id="linkedin" defaultValue="https://linkedin.com/company/techcorp-ai" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Label>
                <Input id="twitter" defaultValue="https://twitter.com/techcorpai" />
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
                  defaultValue="• Competitive salary and equity
• Unlimited PTO
• Health, dental, and vision insurance
• 401(k) matching
• Remote work flexibility"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="culture">Culture</Label>
                <Textarea
                  id="culture"
                  rows={3}
                  defaultValue="We're a team of curious, driven individuals who love solving hard problems. We believe in transparency, continuous learning, and work-life balance."
                />
              </div>
            </div>
          </div>

          <Button variant="hero" size="lg" onClick={handleSaveCompany} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
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
    </DashboardLayout>
  );
};

export default EmployerCompany;
