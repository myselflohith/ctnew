import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  Search,
  Filter,
  Mail,
  Calendar,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

const mockCandidates = [
  {
    id: "1",
    name: "Sarah Chen",
    title: "Senior Frontend Developer",
    job: "Senior Frontend Developer",
    matchScore: 95,
    rank: 1,
    status: "Interview Scheduled",
    appliedAt: "2 days ago",
    education: "Stanford University",
    experience: "8 years",
  },
  {
    id: "2",
    name: "Michael Park",
    title: "Full Stack Engineer",
    job: "Senior Frontend Developer",
    matchScore: 91,
    rank: 2,
    status: "Under Review",
    appliedAt: "3 days ago",
    education: "MIT",
    experience: "6 years",
  },
  {
    id: "3",
    name: "Emily Johnson",
    title: "Product Manager",
    job: "Product Manager",
    matchScore: 88,
    rank: 1,
    status: "New",
    appliedAt: "1 day ago",
    education: "Harvard Business School",
    experience: "5 years",
  },
  {
    id: "4",
    name: "David Kim",
    title: "UX Designer",
    job: "UX Designer",
    matchScore: 84,
    rank: 1,
    status: "Phone Screen",
    appliedAt: "5 days ago",
    education: "RISD",
    experience: "4 years",
  },
  {
    id: "5",
    name: "Jessica Liu",
    title: "Backend Engineer",
    job: "Backend Engineer",
    matchScore: 92,
    rank: 1,
    status: "New",
    appliedAt: "1 day ago",
    education: "UC Berkeley",
    experience: "7 years",
  },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Interview Scheduled":
      return "excellent";
    case "Phone Screen":
      return "good";
    case "Under Review":
      return "secondary";
    case "New":
      return "outline";
    default:
      return "secondary";
  }
};

const EmployerCandidates = () => {
  return (
    <DashboardLayout
      role="employer"
      navItems={navItems}
      userName="Jane Smith"
      companyName="TechCorp AI"
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Candidates
        </h1>
        <p className="text-muted-foreground">
          Review and manage applicants across all your jobs.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search candidates by name or skills..." className="pl-12 h-12" />
        </div>
        <Button variant="outline" size="lg">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Candidates List */}
      <div className="glass rounded-2xl p-6">
        <div className="space-y-4">
          {mockCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cardinal to-amber flex items-center justify-center text-white font-semibold shrink-0">
                  {candidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{candidate.name}</h3>
                  <p className="text-sm text-muted-foreground">{candidate.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {candidate.experience} exp • {candidate.education}
                  </p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="text-sm">
                  <p className="text-muted-foreground">Applied for</p>
                  <p className="text-foreground font-medium">{candidate.job}</p>
                </div>
                <div className="flex items-center gap-2">
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
                  <span className="text-xs text-muted-foreground">Rank #{candidate.rank}</span>
                </div>
                <Badge variant={getStatusVariant(candidate.status)}>{candidate.status}</Badge>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Calendar className="w-4 h-4" />
                  </Button>
                  <Button size="sm">View Profile</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployerCandidates;
