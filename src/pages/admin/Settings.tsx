import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LayoutDashboard, Building2, Users, Settings, Shield } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Building2, label: "Organizations", path: "/admin/organizations" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Shield, label: "Security", path: "/admin/security" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

const AdminSettings = () => {
  return (
    <DashboardLayout role="admin" navItems={navItems} userName="Admin User">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Platform Settings
        </h1>
        <p className="text-muted-foreground">
          Configure global platform settings and preferences.
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* General Settings */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            General Settings
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Platform Name</Label>
              <Input id="siteName" defaultValue="CardinalTalent" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">Platform URL</Label>
              <Input id="siteUrl" defaultValue="https://cardinaltalent.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input id="supportEmail" defaultValue="support@cardinaltalent.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Platform Description</Label>
              <Textarea
                id="description"
                rows={3}
                defaultValue="AI-powered talent acquisition platform connecting top candidates with leading companies."
              />
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            Feature Toggles
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div>
                <p className="font-medium text-foreground">AI Matching</p>
                <p className="text-sm text-muted-foreground">
                  Enable AI-powered candidate matching
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div>
                <p className="font-medium text-foreground">Auto Apply</p>
                <p className="text-sm text-muted-foreground">
                  Allow premium users to auto-apply to jobs
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div>
                <p className="font-medium text-foreground">AI Interviews</p>
                <p className="text-sm text-muted-foreground">
                  Enable AI-generated interview questions
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div>
                <p className="font-medium text-foreground">Public Job Board</p>
                <p className="text-sm text-muted-foreground">
                  Allow non-registered users to browse jobs
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div>
                <p className="font-medium text-foreground">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable platform access
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        <Button variant="hero" size="lg">
          Save All Settings
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
