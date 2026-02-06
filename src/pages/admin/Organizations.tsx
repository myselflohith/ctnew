import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  Shield,
  Search,
  Plus,
  MoreVertical,
  Filter,
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

const mockOrganizations = [
  {
    id: "1",
    name: "TechCorp AI",
    email: "admin@techcorp.ai",
    users: 45,
    jobs: 12,
    status: "active",
    plan: "Enterprise",
    createdAt: "Jan 15, 2024",
  },
  {
    id: "2",
    name: "StartupXYZ",
    email: "hello@startupxyz.com",
    users: 12,
    jobs: 5,
    status: "active",
    plan: "Professional",
    createdAt: "Feb 8, 2024",
  },
  {
    id: "3",
    name: "Enterprise Inc",
    email: "hr@enterprise.com",
    users: 120,
    jobs: 34,
    status: "active",
    plan: "Enterprise",
    createdAt: "Dec 1, 2023",
  },
  {
    id: "4",
    name: "NewCo",
    email: "team@newco.io",
    users: 3,
    jobs: 1,
    status: "trial",
    plan: "Starter",
    createdAt: "Mar 1, 2024",
  },
  {
    id: "5",
    name: "DataFlow Labs",
    email: "contact@dataflow.ai",
    users: 28,
    jobs: 8,
    status: "active",
    plan: "Professional",
    createdAt: "Feb 20, 2024",
  },
];

const AdminOrganizations = () => {
  return (
    <DashboardLayout role="admin" navItems={navItems} userName="Admin User">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Organizations
          </h1>
          <p className="text-muted-foreground">
            Manage all registered organizations on the platform.
          </p>
        </div>
        <Button variant="hero">
          <Plus className="w-5 h-5 mr-2" />
          Add Organization
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search organizations..." className="pl-12 h-12" />
        </div>
        <Button variant="outline" size="lg">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">156</p>
          <p className="text-sm text-muted-foreground">Total Organizations</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">142</p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">8</p>
          <p className="text-sm text-muted-foreground">Trial</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">6</p>
          <p className="text-sm text-muted-foreground">Suspended</p>
        </div>
      </div>

      {/* Organizations List */}
      <div className="glass rounded-2xl p-6">
        <div className="space-y-4">
          {mockOrganizations.map((org) => (
            <div
              key={org.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{org.name}</h3>
                  <p className="text-sm text-muted-foreground">{org.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {org.createdAt}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  <span>{org.users} users</span>
                  <span className="mx-2">•</span>
                  <span>{org.jobs} jobs</span>
                </div>
                <Badge variant={org.status === "active" ? "active" : "pending"}>
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
                    <DropdownMenuItem>Change Plan</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Suspend</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminOrganizations;
