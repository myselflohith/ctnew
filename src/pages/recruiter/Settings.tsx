import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  Linkedin,
} from "lucide-react";
import { apiClient } from "@/lib/api";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/recruiter/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/recruiter/jobs" },
  { icon: Users, label: "Candidates", path: "/recruiter/candidates" },
  { icon: Building2, label: "Clients", path: "/recruiter/clients" },
  { icon: Settings, label: "Settings", path: "/recruiter/settings" },
];

type User = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string;
  company_name?: string | null;
};

const RecruiterSettings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getCurrentUser()
      .then((res: any) => {
        if (cancelled) return;
        if (res.success && res.user) setUser(res.user);
      })
      .finally(() => {
        if (!cancelled) setLoadingUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || "Recruiter"
    : "Recruiter";

  return (
    <DashboardLayout
      role="recruiter"
      navItems={navItems}
      userName={displayName}
      companyName={user?.company_name ?? undefined}
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sidebar Navigation */}
        <div className="glass rounded-2xl p-4">
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary font-medium">
              <User className="w-5 h-5" />
              Profile
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 transition-colors">
              <Bell className="w-5 h-5" />
              Notifications
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 transition-colors">
              <Shield className="w-5 h-5" />
              Security
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 transition-colors">
              <CreditCard className="w-5 h-5" />
              Billing
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
                    <Input id="firstName" value={user?.first_name ?? ""} readOnly className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={user?.last_name ?? ""} readOnly className="bg-muted/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={user?.email ?? ""} readOnly className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input id="phone_number" type="tel" placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn URL
                  </Label>
                  <Input id="linkedin" type="url" placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={user?.company_name ?? ""} readOnly className="bg-muted/50" />
                </div>
              </div>
            )}
            <Button variant="hero" className="mt-6" disabled={loadingUser}>
              Save Changes
            </Button>
          </div>

          {/* Notification Preferences */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Notification Preferences
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about new candidates
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">New Applications</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when candidates apply to your jobs
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Weekly Digest</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly summary of your activity
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RecruiterSettings;
