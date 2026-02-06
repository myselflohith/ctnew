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
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/recruiter/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/recruiter/jobs" },
  { icon: Users, label: "Candidates", path: "/recruiter/candidates" },
  { icon: Building2, label: "Clients", path: "/recruiter/clients" },
  { icon: Settings, label: "Settings", path: "/recruiter/settings" },
];

const mockCandidates = [
  {
    id: "1",
    name: "Alex Rivera",
    title: "Senior Data Engineer",
    location: "San Francisco, CA",
    experience: "8 years",
    education: "Stanford University",
    status: "Available",
    matchScore: 94,
  },
  {
    id: "2",
    name: "Jordan Lee",
    title: "ML Engineer",
    location: "Seattle, WA",
    experience: "6 years",
    education: "MIT",
    status: "Open to offers",
    matchScore: 91,
  },
  {
    id: "3",
    name: "Sam Chen",
    title: "Full Stack Developer",
    location: "Austin, TX",
    experience: "5 years",
    education: "UC Berkeley",
    status: "Available",
    matchScore: 88,
  },
  {
    id: "4",
    name: "Taylor Morgan",
    title: "DevOps Engineer",
    location: "Denver, CO",
    experience: "7 years",
    education: "Georgia Tech",
    status: "Interviewing",
    matchScore: 85,
  },
];

const RecruiterCandidates = () => {
  return (
    <DashboardLayout
      role="recruiter"
      navItems={navItems}
      userName="Mike Johnson"
      companyName="Elite Staffing"
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Candidates
        </h1>
        <p className="text-muted-foreground">
          Browse and manage your candidate pipeline.
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, skills, or location..."
            className="pl-12 h-12"
          />
        </div>
        <Button variant="outline" size="lg">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="space-y-4">
          {mockCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber to-gold flex items-center justify-center text-white font-semibold">
                  {candidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{candidate.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {candidate.title} • {candidate.location}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {candidate.experience} exp • {candidate.education}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  variant={
                    candidate.status === "Available"
                      ? "excellent"
                      : candidate.status === "Open to offers"
                      ? "good"
                      : "secondary"
                  }
                >
                  {candidate.status}
                </Badge>
                <Button variant="outline" size="sm">
                  View Profile
                </Button>
                <Button size="sm">Match to Job</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RecruiterCandidates;
