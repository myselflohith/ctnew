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
  MapPin,
  Clock,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/recruiter/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/recruiter/jobs" },
  { icon: Users, label: "Candidates", path: "/recruiter/candidates" },
  { icon: Building2, label: "Clients", path: "/recruiter/clients" },
  { icon: Settings, label: "Settings", path: "/recruiter/settings" },
];

const mockJobs = [
  {
    id: "1",
    title: "Senior Data Engineer",
    company: "TechCorp AI",
    location: "San Francisco, CA",
    type: "Hybrid",
    applicants: 24,
    status: "Active",
    posted: "2 days ago",
  },
  {
    id: "2",
    title: "ML Engineer",
    company: "StartupXYZ",
    location: "Seattle, WA",
    type: "Remote",
    applicants: 18,
    status: "Active",
    posted: "5 days ago",
  },
  {
    id: "3",
    title: "Backend Developer",
    company: "Enterprise Inc",
    location: "New York, NY",
    type: "Onsite",
    applicants: 32,
    status: "Active",
    posted: "1 week ago",
  },
];

const RecruiterJobs = () => {
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
            Jobs
          </h1>
          <p className="text-muted-foreground">
            Manage job postings across all your client organizations.
          </p>
        </div>
        <Button variant="hero">
          <Plus className="w-4 h-4 mr-2" />
          Post New Job
        </Button>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="space-y-4">
          {mockJobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {job.posted}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline">{job.type}</Badge>
                <Badge variant="secondary">{job.applicants} applicants</Badge>
                <Badge variant="excellent">{job.status}</Badge>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RecruiterJobs;
