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
  Eye,
  MoreVertical,
  MapPin,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

const mockJobs = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    location: "San Francisco, CA",
    type: "Hybrid",
    status: "active",
    applicants: 45,
    newApplicants: 8,
    views: 234,
    postedAt: "3 days ago",
  },
  {
    id: "2",
    title: "Product Manager",
    location: "New York, NY",
    type: "Remote",
    status: "active",
    applicants: 32,
    newApplicants: 5,
    views: 189,
    postedAt: "1 week ago",
  },
  {
    id: "3",
    title: "UX Designer",
    location: "Austin, TX",
    type: "Onsite",
    status: "paused",
    applicants: 28,
    newApplicants: 0,
    views: 156,
    postedAt: "2 weeks ago",
  },
  {
    id: "4",
    title: "Backend Engineer",
    location: "Seattle, WA",
    type: "Remote",
    status: "active",
    applicants: 52,
    newApplicants: 12,
    views: 298,
    postedAt: "5 days ago",
  },
  {
    id: "5",
    title: "Data Scientist",
    location: "Boston, MA",
    type: "Hybrid",
    status: "closed",
    applicants: 67,
    newApplicants: 0,
    views: 412,
    postedAt: "1 month ago",
  },
];

const EmployerJobs = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout
      role="employer"
      navItems={navItems}
      userName="Jane Smith"
      companyName="TechCorp AI"
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Jobs
          </h1>
          <p className="text-muted-foreground">
            Manage all your job postings in one place.
          </p>
        </div>
        <Button variant="hero" onClick={() => navigate("/employer/jobs/new")}>
          <Plus className="w-5 h-5 mr-2" />
          Post New Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{mockJobs.length}</p>
          <p className="text-sm text-muted-foreground">Total Jobs</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {mockJobs.filter((j) => j.status === "active").length}
          </p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">
            {mockJobs.reduce((sum, j) => sum + j.applicants, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Total Applicants</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">
            {mockJobs.reduce((sum, j) => sum + j.newApplicants, 0)}
          </p>
          <p className="text-sm text-muted-foreground">New This Week</p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="glass rounded-2xl p-6">
        <div className="space-y-4">
          {mockJobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-foreground">{job.title}</h3>
                    <Badge
                      variant={
                        job.status === "active"
                          ? "active"
                          : job.status === "paused"
                          ? "secondary"
                          : "closed"
                      }
                    >
                      {job.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                    <span>{job.type}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {job.postedAt}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {job.applicants} applicants
                    {job.newApplicants > 0 && (
                      <span className="text-primary ml-1">(+{job.newApplicants} new)</span>
                    )}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {job.views} views
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Candidates</DropdownMenuItem>
                    <DropdownMenuItem>Edit Job</DropdownMenuItem>
                    <DropdownMenuItem>
                      {job.status === "active" ? "Pause Job" : "Activate Job"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Close Job</DropdownMenuItem>
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

export default EmployerJobs;
