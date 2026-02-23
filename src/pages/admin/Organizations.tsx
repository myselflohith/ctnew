import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Building2, label: "Organizations", path: "/admin/organizations" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Shield, label: "Security", path: "/admin/security" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

const defaultCreateForm = {
  name: "",
  industry: "",
  description: "",
  location: "",
  website_url: "",
};

type OrgRow = { id: string; name?: string | null; company_name?: string | null; industry?: string | null; description?: string | null; location?: string | null; website_url?: string | null; user_count?: number; job_count?: number; created_at?: string };

const AdminOrganizations = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial">("all");
  const [viewOrg, setViewOrg] = useState<OrgRow | null>(null);
  const [editingOrg, setEditingOrg] = useState<OrgRow | null>(null);
  const [editForm, setEditForm] = useState(defaultCreateForm);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAllOrganizations();
      if (response.success && response.data && Array.isArray(response.data)) {
        setOrganizations(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching organizations:", error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = createForm.name.trim();
    if (!name) {
      toast({
        title: "Name required",
        description: "Organization name is required.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.saveOrganization({
        name,
        industry: createForm.industry.trim() || undefined,
        description: createForm.description.trim() || undefined,
        location: createForm.location.trim() || undefined,
        website_url: createForm.website_url.trim() || undefined,
      });
      if (res.success && res.data) {
        toast({
          title: "Organization created",
          description: `${name} has been added.`,
        });
        setCreateOpen(false);
        setCreateForm(defaultCreateForm);
        fetchOrganizations();
      } else {
        throw new Error("Failed to create organization");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create organization.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (org: OrgRow) => {
    setEditingOrg(org);
    setEditForm({
      name: (org.name ?? org.company_name ?? "").toString(),
      industry: (org.industry ?? "").toString(),
      description: (org.description ?? "").toString(),
      location: (org.location ?? "").toString(),
      website_url: (org.website_url ?? "").toString(),
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg?.id) return;
    const name = editForm.name.trim();
    if (!name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.saveOrganization({
        id: editingOrg.id,
        name,
        industry: editForm.industry.trim() || undefined,
        description: editForm.description.trim() || undefined,
        location: editForm.location.trim() || undefined,
        website_url: editForm.website_url.trim() || undefined,
      });
      if (res.success && res.data) {
        toast({ title: "Organization updated", description: `${name} has been updated.` });
        setEditingOrg(null);
        fetchOrganizations();
      } else {
        throw new Error("Failed to update");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update organization.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleManageUsers = (org: OrgRow) => {
    const name = org.name ?? org.company_name ?? "";
    navigate(`/admin/users?organization=${encodeURIComponent(org.id)}&organizationName=${encodeURIComponent(String(name))}`);
  };

  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch = !searchQuery
      ? true
      : (() => {
          const q = searchQuery.toLowerCase();
          const name = (org.name ?? org.company_name ?? "").toString().toLowerCase();
          const industry = (org.industry ?? "").toString().toLowerCase();
          const description = (org.description ?? "").toString().toLowerCase();
          const location = (org.location ?? "").toString().toLowerCase();
          return (
            name.includes(q) ||
            industry.includes(q) ||
            description.includes(q) ||
            location.includes(q)
          );
        })();
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && (org.user_count ?? 0) > 0) ||
      (statusFilter === "trial" && (org.user_count ?? 0) === 0);
    return matchesSearch && matchesStatus;
  });

  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((org) => (org.user_count ?? 0) > 0).length;
  const trialOrgs = organizations.filter((org) => (org.user_count ?? 0) === 0).length;
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
        <Button variant="hero" onClick={() => setCreateOpen(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Add Organization
        </Button>
      </div>

      {/* Create Organization Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>
              Create a new organization. Names must be unique (duplicates are not allowed). Employers can then select this company when signing up or setting their company.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Name *</Label>
              <Input
                id="org-name"
                placeholder="e.g. Acme Inc"
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-industry">Industry</Label>
              <Input
                id="org-industry"
                placeholder="e.g. Technology"
                value={createForm.industry}
                onChange={(e) => setCreateForm((p) => ({ ...p, industry: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-description">Description</Label>
              <Input
                id="org-description"
                placeholder="Brief description"
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-location">Location</Label>
              <Input
                id="org-location"
                placeholder="e.g. San Francisco, CA"
                value={createForm.location}
                onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-website">Website URL</Label>
              <Input
                id="org-website"
                type="url"
                placeholder="https://..."
                value={createForm.website_url}
                onChange={(e) => setCreateForm((p) => ({ ...p, website_url: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={saving}>
                {saving ? "Creating…" : "Create Organization"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Organization Dialog */}
      <Dialog open={!!viewOrg} onOpenChange={(open) => !open && setViewOrg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{viewOrg ? (viewOrg.name ?? viewOrg.company_name ?? "Organization") : ""}</DialogTitle>
            <DialogDescription>Organization details</DialogDescription>
          </DialogHeader>
          {viewOrg && (
            <div className="space-y-3 text-sm">
              {(viewOrg.industry || viewOrg.location) && (
                <p className="text-muted-foreground">
                  {[viewOrg.industry, viewOrg.location].filter(Boolean).join(" · ")}
                </p>
              )}
              {viewOrg.description && (
                <p className="text-foreground">{viewOrg.description}</p>
              )}
              {viewOrg.website_url && (
                <p>
                  <a href={viewOrg.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {viewOrg.website_url}
                  </a>
                </p>
              )}
              <p className="text-muted-foreground">
                {viewOrg.user_count ?? 0} users · {viewOrg.job_count ?? 0} jobs
              </p>
              {viewOrg.created_at && (
                <p className="text-muted-foreground text-xs">
                  Created {formatDistanceToNow(new Date(viewOrg.created_at), { addSuffix: true })}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update organization details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-org-name">Name *</Label>
              <Input
                id="edit-org-name"
                placeholder="e.g. Acme Inc"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-org-industry">Industry</Label>
              <Input
                id="edit-org-industry"
                placeholder="e.g. Technology"
                value={editForm.industry}
                onChange={(e) => setEditForm((p) => ({ ...p, industry: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-org-description">Description</Label>
              <Input
                id="edit-org-description"
                placeholder="Brief description"
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-org-location">Location</Label>
              <Input
                id="edit-org-location"
                placeholder="e.g. San Francisco, CA"
                value={editForm.location}
                onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-org-website">Website URL</Label>
              <Input
                id="edit-org-website"
                type="url"
                placeholder="https://..."
                value={editForm.website_url}
                onChange={(e) => setEditForm((p) => ({ ...p, website_url: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingOrg(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name, industry, description, or location..."
            className="pl-12 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="lg">
              <Filter className="w-4 h-4 mr-2" />
              {statusFilter === "all" ? "Status: All" : statusFilter === "active" ? "Active" : "Trial"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("active")}>
              Active (has users)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("trial")}>
              Trial (no users)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                    <h3 className="font-medium text-foreground">{org.name ?? org.company_name ?? "—"}</h3>
                    {(org.industry || org.location) && (
                      <p className="text-sm text-muted-foreground">
                        {[org.industry, org.location].filter(Boolean).join(" · ")}
                      </p>
                    )}
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
                      <DropdownMenuItem onClick={() => setViewOrg(org)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(org)}>
                        Edit Organization
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleManageUsers(org)}>
                        Manage Users
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>Change Plan</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" disabled>Suspend</DropdownMenuItem>
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
