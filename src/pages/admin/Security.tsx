import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  Key,
  Eye,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Building2, label: "Organizations", path: "/admin/organizations" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Shield, label: "Security", path: "/admin/security" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

const mockSecurityLogs = [
  {
    id: "1",
    event: "Failed login attempt",
    user: "unknown@email.com",
    ip: "192.168.1.100",
    time: "10 minutes ago",
    severity: "warning",
  },
  {
    id: "2",
    event: "Password changed",
    user: "jane@techcorp.ai",
    ip: "10.0.0.45",
    time: "2 hours ago",
    severity: "info",
  },
  {
    id: "3",
    event: "New admin added",
    user: "admin@cardinaltalent.com",
    ip: "10.0.0.1",
    time: "1 day ago",
    severity: "info",
  },
  {
    id: "4",
    event: "Multiple failed login attempts",
    user: "test@test.com",
    ip: "203.0.113.50",
    time: "2 days ago",
    severity: "critical",
  },
];

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "critical":
      return <XCircle className="w-5 h-5 text-destructive" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case "info":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
};

const AdminSecurity = () => {
  return (
    <DashboardLayout role="admin" navItems={navItems} userName="Admin User">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Security
        </h1>
        <p className="text-muted-foreground">
          Monitor security events and manage platform security settings.
        </p>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">99.9%</p>
          <p className="text-sm text-muted-foreground">Uptime</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">0</p>
          <p className="text-sm text-muted-foreground">Active Threats</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">23</p>
          <p className="text-sm text-muted-foreground">Failed Logins (24h)</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">2FA</p>
          <p className="text-sm text-muted-foreground">Enforced</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Security Settings */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            Security Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Enforce 2FA</p>
                  <p className="text-sm text-muted-foreground">
                    Require two-factor authentication for all users
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Password Policy</p>
                  <p className="text-sm text-muted-foreground">
                    Require strong passwords (12+ characters)
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Session Timeout</p>
                  <p className="text-sm text-muted-foreground">
                    Auto-logout after 30 minutes of inactivity
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Login Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Email users about new login locations
                  </p>
                </div>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Security Logs */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Security Logs
            </h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {mockSecurityLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30"
              >
                {getSeverityIcon(log.severity)}
                <div className="flex-1">
                  <p className="font-medium text-foreground">{log.event}</p>
                  <p className="text-sm text-muted-foreground">{log.user}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>IP: {log.ip}</span>
                    <span>{log.time}</span>
                  </div>
                </div>
                <Badge
                  variant={
                    log.severity === "critical"
                      ? "destructive"
                      : log.severity === "warning"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {log.severity}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSecurity;
