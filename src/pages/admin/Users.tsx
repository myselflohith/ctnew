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
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Building2, label: "Organizations", path: "/admin/organizations" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Shield, label: "Security", path: "/admin/security" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

const getRoleColor = (role: string) => {
  switch (role) {
    case "employer":
      return "excellent";
    case "recruiter":
      return "good";
    case "talent":
      return "secondary";
    case "admin":
      return "destructive";
    default:
      return "outline";
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case "employer":
      return "Employer";
    case "recruiter":
      return "Recruiter";
    case "talent":
      return "Talent";
    case "admin":
      return "Admin";
    default:
      return role;
  }
};

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getAllUsers();
        if (response.success && response.data) {
          setUsers(response.data);
        }
      } catch (error: any) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
    return (
      fullName.includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.company_name?.toLowerCase().includes(query)
    );
  });

  const totalUsers = users.length;
  const talentUsers = users.filter((u) => u.role === "talent").length;
  const employerUsers = users.filter((u) => u.role === "employer").length;
  const recruiterUsers = users.filter((u) => u.role === "recruiter").length;
  const adminUsers = users.filter((u) => u.role === "admin").length;

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
          <Input 
            placeholder="Search users by name or email..." 
            className="pl-12 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="lg">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
          <p className="text-sm text-muted-foreground">Total Users</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{talentUsers}</p>
          <p className="text-sm text-muted-foreground">Talent</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{employerUsers}</p>
          <p className="text-sm text-muted-foreground">Employers</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{recruiterUsers}</p>
          <p className="text-sm text-muted-foreground">Recruiters</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{adminUsers}</p>
          <p className="text-sm text-muted-foreground">Admins</p>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="glass rounded-2xl p-6">
          <div className="space-y-4">
            {filteredUsers.map((user) => {
              const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown";
              return (
                <div
                  key={user.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cardinal to-amber flex items-center justify-center text-white font-semibold shrink-0">
                      {fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{fullName}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.company_name && (
                        <p className="text-xs text-muted-foreground">{user.company_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      {user.last_active 
                        ? `Active ${formatDistanceToNow(new Date(user.last_active), { addSuffix: true })}`
                        : "Never active"}
                    </p>
                    <Badge variant={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                    <Badge variant={user.email_verified ? "active" : "pending"}>
                      {user.email_verified ? "verified" : "unverified"}
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
                            Suspend
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            {searchQuery ? "No users found" : "No users yet"}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery 
              ? "Try adjusting your search criteria."
              : "Users will appear here once they sign up."}
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminUsers;
