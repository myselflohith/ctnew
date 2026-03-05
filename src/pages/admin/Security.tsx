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
  XCircle,
  Clock,
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
    event: "Failed Login Attempts",
    user: "All users",
    ip: "Multiple IPs",
    time: "Last 24 hours",
    severity: "warning",
  },
  {
    id: "2",
    event: "Password Changed",
    user: "Admin users",
    ip: "Various",
    time: "Last 7 days",
    severity: "info",
  },
  {
    id: "3",
    event: "New Admin Added",
    user: "Admin users",
    ip: "Various",
    time: "Last 30 days",
    severity: "info",
  },
  {
    id: "4",
    event: "Multiple Failed Login Attempts",
    user: "Admin users",
    ip: "Multiple IPs",
    time: "Last 24 hours",
    severity: "critical",
  },
];

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "critical":
      return <XCircle className="w-5 h-5 text-destructive" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
};

const AdminSecurity = () => {
  return (
    <DashboardLayout role="admin" navItems={navItems} userName="Admin User">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Audit
        </h1>
        <p className="text-muted-foreground">
          Review key security-related events across the platform.
        </p>
      </div>

      {/* Audit Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">23</p>
          <p className="text-sm text-muted-foreground">Failed Login Attempts</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">5</p>
          <p className="text-sm text-muted-foreground">Admin Password Changes</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">2</p>
          <p className="text-sm text-muted-foreground">New Admins Added</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">3</p>
          <p className="text-sm text-muted-foreground">Multiple Failed Admin Logins</p>
        </div>
      </div>

      {/* Audit Events */}
      <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Audit Events
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
    </DashboardLayout>
  );
};

export default AdminSecurity;
