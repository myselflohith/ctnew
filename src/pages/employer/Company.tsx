import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

const EmployerCompany = () => {
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

          <Button variant="hero" size="lg">
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployerCompany;
