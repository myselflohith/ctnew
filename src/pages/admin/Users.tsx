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
  Mail,
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

const mockUsers = [
  {
    id: "1",
    name: "Jane Smith",
    email: "jane@techcorp.ai",
    role: "Employer",
    organization: "TechCorp AI",
    status: "active",
    lastActive: "2 hours ago",
  },
  {
    id: "2",
    name: "John Doe",
    email: "john.doe@email.com",
    role: "Talent",
    organization: null,
    status: "active",
    lastActive: "1 day ago",
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike@elitestaffing.com",
    role: "Recruiter",
    organization: "Elite Staffing",
    status: "active",
    lastActive: "5 hours ago",
  },
  {
    id: "4",
    name: "Sarah Chen",
    email: "sarah@startupxyz.com",
    role: "Employer",
    organization: "StartupXYZ",
    status: "active",
    lastActive: "3 days ago",
  },
  {
    id: "5",
    name: "Alex Rivera",
    email: "alex.rivera@email.com",
    role: "Talent",
    organization: null,
    status: "suspended",
    lastActive: "1 week ago",
  },
];

const getRoleColor = (role: string) => {
  switch (role) {
    case "Employer":
      return "excellent";
    case "Recruiter":
      return "good";
    case "Talent":
      return "secondary";
    case "Admin":
      return "destructive";
    default:
      return "outline";
  }
};

const AdminUsers = () => {
  return (
    <DashboardLayout role="admin" navItems={navItems} userName="Admin User">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Users
          </h1>
          <p className="text-muted-foreground">
            Manage all users across the platform.
          </p>
        </div>
        <Button variant="hero">
          <Plus className="w-5 h-5 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search users by name or email..." className="pl-12 h-12" />
        </div>
        <Button variant="outline" size="lg">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">12.4K</p>
          <p className="text-sm text-muted-foreground">Total Users</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">8.2K</p>
          <p className="text-sm text-muted-foreground">Talent</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">3.1K</p>
          <p className="text-sm text-muted-foreground">Employers</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">980</p>
          <p className="text-sm text-muted-foreground">Recruiters</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">12</p>
          <p className="text-sm text-muted-foreground">Admins</p>
        </div>
      </div>

      {/* Users List */}
      <div className="glass rounded-2xl p-6">
        <div className="space-y-4">
          {mockUsers.map((user) => (
            <div
              key={user.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cardinal to-amber flex items-center justify-center text-white font-semibold shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.organization && (
                    <p className="text-xs text-muted-foreground">{user.organization}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Active {user.lastActive}
                </p>
                <Badge variant={getRoleColor(user.role)}>{user.role}</Badge>
                <Badge variant={user.status === "active" ? "active" : "destructive"}>
                  {user.status}
                </Badge>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>Edit User</DropdownMenuItem>
                      <DropdownMenuItem>Reset Password</DropdownMenuItem>
                      <DropdownMenuItem>Impersonate</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        {user.status === "active" ? "Suspend" : "Reactivate"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
