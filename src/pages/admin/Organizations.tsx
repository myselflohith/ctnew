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

const AdminOrganizations = () => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getAllOrganizations();
        if (response.success && response.data) {
          setOrganizations(response.data);
        }
      } catch (error: any) {
        console.error("Error fetching organizations:", error);
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const filteredOrganizations = organizations.filter((org) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      org.name?.toLowerCase().includes(query) ||
      org.company_name?.toLowerCase().includes(query) ||
      org.industry?.toLowerCase().includes(query)
    );
  });

  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((org) => org.user_count > 0).length;
  const trialOrgs = organizations.filter((org) => org.user_count === 0).length;
  const suspendedOrgs = 0; // Not implemented yet

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
          <Input 
            placeholder="Search organizations..." 
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalOrgs}</p>
          <p className="text-sm text-muted-foreground">Total Organizations</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{activeOrgs}</p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{trialOrgs}</p>
          <p className="text-sm text-muted-foreground">Trial</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{suspendedOrgs}</p>
          <p className="text-sm text-muted-foreground">Suspended</p>
        </div>
      </div>

      {/* Organizations List */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      ) : filteredOrganizations.length > 0 ? (
        <div className="glass rounded-2xl p-6">
          <div className="space-y-4">
            {filteredOrganizations.map((org) => (
              <div
                key={org.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{org.name || org.company_name}</h3>
                    <p className="text-sm text-muted-foreground">{org.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {org.created_at ? formatDistanceToNow(new Date(org.created_at), { addSuffix: true }) : "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    <span>{org.user_count || 0} users</span>
                    <span className="mx-2">•</span>
                    <span>{org.job_count || 0} jobs</span>
                  </div>
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
                      <DropdownMenuItem>Change Plan</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Suspend</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            {searchQuery ? "No organizations found" : "No organizations yet"}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery 
              ? "Try adjusting your search criteria."
              : "Organizations will appear here once employers sign up."}
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminOrganizations;
