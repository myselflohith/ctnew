import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  Shield,
  TrendingUp,
  Activity,
  Server,
  ArrowRight,
  Plus,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Building2, label: "Organizations", path: "/admin/organizations" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Shield, label: "Security", path: "/admin/security" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

// Mock data
const mockOrganizations = [
  {
    id: "1",
    name: "TechCorp AI",
    users: 45,
    jobs: 12,
    status: "active",
    plan: "Enterprise",
  },
  {
    id: "2",
    name: "StartupXYZ",
    users: 12,
    jobs: 5,
    status: "active",
    plan: "Professional",
  },
  {
    id: "3",
    name: "Enterprise Inc",
    users: 120,
    jobs: 34,
    status: "active",
    plan: "Enterprise",
  },
  {
    id: "4",
    name: "NewCo",
    users: 3,
    jobs: 1,
    status: "trial",
    plan: "Starter",
  },
];

const mockRecentActivity = [
  {
    id: "1",
    action: "New organization registered",
    target: "NewCo",
    time: "2 hours ago",
  },
  {
    id: "2",
    action: "User upgraded plan",
    target: "StartupXYZ → Professional",
    time: "5 hours ago",
  },
  {
    id: "3",
    action: "Job posted",
    target: "Senior Engineer at TechCorp AI",
    time: "1 day ago",
  },
];

const AdminDashboard = () => {
  return (
    <DashboardLayout role="admin" navItems={navItems} userName="Admin User">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Platform overview and management.
          </p>
        </div>
        <Button variant="hero">
          <Plus className="w-5 h-5 mr-2" />
          Add Organization
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Organizations"
          value={156}
          change="+12 this month"
          changeType="positive"
          icon={<Building2 className="w-6 h-6" />}
          variant="cardinal"
        />
        <MetricCard
          title="Total Users"
          value="12.4K"
          change="+8% this week"
          changeType="positive"
          icon={<Users className="w-6 h-6" />}
          variant="amber"
        />
        <MetricCard
          title="Active Jobs"
          value="3.2K"
          change="+245 this week"
          changeType="positive"
          icon={<Activity className="w-6 h-6" />}
          variant="success"
        />
        <MetricCard
          title="System Health"
          value="99.9%"
          change="All systems operational"
          changeType="positive"
          icon={<Server className="w-6 h-6" />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Organizations */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Organizations
            </h2>
            <Button variant="ghost" size="sm" className="group">
              View All
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="space-y-3">
            {mockOrganizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{org.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {org.users} users • {org.jobs} jobs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge
                    variant={org.status === "active" ? "active" : "pending"}
                  >
                    {org.status}
                  </Badge>
                  <Badge variant="outline">{org.plan}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit Organization</DropdownMenuItem>
                      <DropdownMenuItem>Manage Users</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Suspend
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            Recent Activity
          </h2>

          <div className="space-y-4">
            {mockRecentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="text-sm text-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.target}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
