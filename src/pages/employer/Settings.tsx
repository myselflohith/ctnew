import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Database,
  Building2,
  Settings,
  Calendar,
  User,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { User as AuthUser } from "@/lib/auth";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Database, label: "Resume Database", path: "/employer/resume-database" },
  { icon: Calendar, label: "Interviews", path: "/employer/interviews" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

const EmployerSettings = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getCurrentUser()
      .then((res) => {
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

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Name required",
        description: "First name and last name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await apiClient.updateCurrentUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (res.success && res.user) {
        setUser(res.user);
        toast({
          title: "Saved",
          description: "Your name has been updated.",
        });
      } else {
        throw new Error(res.error || "Failed to save changes");
      }
    } catch (error: any) {
      toast({
        title: "Error saving changes",
        description: error?.message || "Unable to update your name.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout
      role="employer"
      navItems={navItems}
      userName={
        user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : "Employer"
      }
      companyName={user?.company_name ?? undefined}
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account, team, and preferences.
        </p>
      </div>

      {/* Main Content (no left nav) */}
      <div className="space-y-6">
          {/* Account Section */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Account Information
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={user?.company_name ?? ""}
                  readOnly
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}
                  readOnly
                />
              </div>
            </div>
            <Button variant="hero" className="mt-6" onClick={handleSave} disabled={loadingUser}>
              Save Changes
            </Button>
          </div>

          {/* Notifications */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Notification Preferences
            </h2>
            <div className="space-y-4">
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
                  <p className="font-medium text-foreground">Interview Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders before scheduled interviews
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Weekly Digest</p>
                  <p className="text-sm text-muted-foreground">
                    Summary of your hiring activity
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">AI Recommendations</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified about high-match candidates
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

      </div>
    </DashboardLayout>
  );
};

export default EmployerSettings;
