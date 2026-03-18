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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Building2, label: "Organizations", path: "/admin/organizations" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Shield, label: "Security", path: "/admin/security" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch organizations
        const orgResponse = await apiClient.getAllOrganizations();
        if (orgResponse.success && orgResponse.data) {
          setOrganizations(orgResponse.data);
        }

        // Fetch users
        const usersResponse = await apiClient.getAllUsers();
        if (usersResponse.success && usersResponse.data) {
          setUsers(usersResponse.data);
        }

        // Fetch jobs
        const jobsResponse = await apiClient.getAllJobs();
        if (jobsResponse.success && jobsResponse.data) {
          setJobs(jobsResponse.data);
        }
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const visibleOrganizations = organizations.filter((org) => {
    const s = (org?.status ?? "").toString().toLowerCase();
    return s === "approved" || s === "active";
  });

  const totalOrgs = visibleOrganizations.length;
  const totalUsers = users.length;
  const activeJobs = jobs.filter((job) => job.status === "active").length;
  const systemHealth = "99.9%"; // Placeholder

  const recentOrgs = visibleOrganizations.slice(0, 5);

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
          value={loading ? "..." : totalOrgs}
          change=""
          changeType="neutral"
          icon={<Building2 className="w-6 h-6" />}
          variant="cardinal"
        />
        <MetricCard
          title="Total Users"
          value={loading ? "..." : totalUsers.toLocaleString()}
          change=""
          changeType="neutral"
          icon={<Users className="w-6 h-6" />}
          variant="amber"
        />
        <MetricCard
          title="Active Jobs"
          value={loading ? "..." : activeJobs.toLocaleString()}
          change=""
          changeType="neutral"
          icon={<Activity className="w-6 h-6" />}
          variant="success"
        />
        <MetricCard
          title="System Health"
          value={systemHealth}
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="group"
              onClick={() => navigate("/admin/organizations")}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : recentOrgs.length > 0 ? (
            <div className="space-y-3">
              {recentOrgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{org.name || org.company_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {org.user_count || 0} users • {org.job_count || 0} jobs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={org.user_count > 0 ? "active" : "pending"}>
                      {org.user_count > 0 ? "active" : "trial"}
                    </Badge>
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
          ) : (
            <p className="text-muted-foreground text-center py-8">No organizations yet</p>
          )}
        </div>

        {/* Recent Activity - Placeholder */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            Recent Activity
          </h2>
          <p className="text-muted-foreground text-center py-8">
            Activity logs will appear here
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
