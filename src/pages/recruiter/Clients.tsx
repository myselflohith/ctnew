import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  Plus,
  ArrowRight,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/recruiter/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/recruiter/jobs" },
  { icon: Users, label: "Candidates", path: "/recruiter/candidates" },
  { icon: Building2, label: "Clients", path: "/recruiter/clients" },
  { icon: Settings, label: "Settings", path: "/recruiter/settings" },
];

const mockClients = [
  {
    id: "1",
    name: "TechCorp AI",
    industry: "Artificial Intelligence",
    activeJobs: 5,
    placements: 12,
    revenue: "$24,000",
    status: "Active",
  },
  {
    id: "2",
    name: "StartupXYZ",
    industry: "SaaS",
    activeJobs: 3,
    placements: 8,
    revenue: "$16,000",
    status: "Active",
  },
  {
    id: "3",
    name: "Enterprise Inc",
    industry: "Enterprise Software",
    activeJobs: 8,
    placements: 24,
    revenue: "$48,000",
    status: "Active",
  },
  {
    id: "4",
    name: "DataFlow Labs",
    industry: "Data Analytics",
    activeJobs: 2,
    placements: 5,
    revenue: "$10,000",
    status: "Active",
  },
];

const RecruiterClients = () => {
  return (
    <DashboardLayout
      role="recruiter"
      navItems={navItems}
      userName="Mike Johnson"
      companyName="Elite Staffing"
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Clients
          </h1>
          <p className="text-muted-foreground">
            Manage your client organizations and relationships.
          </p>
        </div>
        <Button variant="hero">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {mockClients.map((client) => (
          <div
            key={client.id}
            className="glass rounded-2xl p-6 hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{client.name}</h3>
                  <p className="text-sm text-muted-foreground">{client.industry}</p>
                </div>
              </div>
              <Badge variant="excellent">{client.status}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
                <p className="text-lg font-semibold text-foreground">{client.activeJobs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Placements</p>
                <p className="text-lg font-semibold text-foreground">{client.placements}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-semibold text-foreground">{client.revenue}</p>
              </div>
            </div>

            <Button variant="ghost" size="sm" className="w-full group">
              View Details
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default RecruiterClients;
