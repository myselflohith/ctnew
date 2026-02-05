import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  Eye,
  ArrowRight,
  MoreVertical,
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

// Mock data
const mockJobs = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    status: "active",
    applicants: 45,
    newApplicants: 8,
    views: 234,
    postedAt: "3 days ago",
  },
  {
    id: "2",
    title: "Product Manager",
    status: "active",
    applicants: 32,
    newApplicants: 5,
    views: 189,
    postedAt: "1 week ago",
  },
  {
    id: "3",
    title: "UX Designer",
    status: "paused",
    applicants: 28,
    newApplicants: 0,
    views: 156,
    postedAt: "2 weeks ago",
  },
];

const mockCandidates = [
  {
    id: "1",
    name: "Sarah Chen",
    role: "Senior Frontend Developer",
    matchScore: 95,
    rank: 1,
    status: "Interview Scheduled",
  },
  {
    id: "2",
    name: "Michael Park",
    role: "Senior Frontend Developer",
    matchScore: 91,
    rank: 2,
    status: "Under Review",
  },
  {
    id: "3",
    name: "Emily Johnson",
    role: "Product Manager",
    matchScore: 88,
    rank: 1,
    status: "New",
  },
];

const EmployerDashboard = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout
      role="employer"
      navItems={navItems}
      userName="Jane Smith"
      companyName="TechCorp AI"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Employer Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your jobs and find the best candidates.
          </p>
        </div>
        <Button variant="hero" onClick={() => navigate("/employer/jobs/new")}>
          <Plus className="w-5 h-5 mr-2" />
          Post New Job
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Active Jobs"
          value={12}
          change="+2 this month"
          changeType="positive"
          icon={<Briefcase className="w-6 h-6" />}
          variant="cardinal"
        />
        <MetricCard
          title="Total Applicants"
          value={284}
          change="+48 this week"
          changeType="positive"
          icon={<Users className="w-6 h-6" />}
          variant="amber"
        />
        <MetricCard
          title="Interviews Scheduled"
          value={8}
          change="3 today"
          changeType="neutral"
          icon={<Clock className="w-6 h-6" />}
          variant="success"
        />
        <MetricCard
          title="Hires This Month"
          value={4}
          change="+1 from last month"
          changeType="positive"
          icon={<CheckCircle className="w-6 h-6" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Active Jobs */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Your Jobs
            </h2>
            <Button variant="ghost" size="sm" className="group">
              View All
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="space-y-4">
            {mockJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-foreground">{job.title}</h3>
                    <Badge variant={job.status === "active" ? "active" : "closed"}>
                      {job.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {job.applicants} applicants
                      {job.newApplicants > 0 && (
                        <span className="text-primary ml-1">
                          (+{job.newApplicants} new)
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {job.views} views
                    </span>
                  </div>
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
                    <DropdownMenuItem>Pause Job</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>

        {/* Top Candidates */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Top Candidates
            </h2>
            <Button variant="ghost" size="sm" className="group">
              View All
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="space-y-4">
            {mockCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cardinal to-amber flex items-center justify-center text-white font-semibold">
                    {candidate.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{candidate.name}</h3>
                    <p className="text-sm text-muted-foreground">{candidate.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge
                      variant={
                        candidate.matchScore >= 90
                          ? "excellent"
                          : candidate.matchScore >= 80
                          ? "good"
                          : "fair"
                      }
                    >
                      {candidate.matchScore}% Match
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rank #{candidate.rank}
                    </p>
                  </div>
                  <Badge variant="outline">{candidate.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployerDashboard;
