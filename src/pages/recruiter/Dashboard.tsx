import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
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
  TrendingUp,
  DollarSign,
  Target,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/recruiter/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/recruiter/jobs" },
  { icon: Users, label: "Candidates", path: "/recruiter/candidates" },
  { icon: Building2, label: "Clients", path: "/recruiter/clients" },
  { icon: Settings, label: "Settings", path: "/recruiter/settings" },
];

// Mock data
const mockOrganizations = [
  { id: "1", name: "TechCorp AI", activeJobs: 5, placements: 12 },
  { id: "2", name: "StartupXYZ", activeJobs: 3, placements: 8 },
  { id: "3", name: "Enterprise Inc", activeJobs: 8, placements: 24 },
];

const mockSearchResults = [
  {
    id: "1",
    name: "Alex Rivera",
    title: "Senior Data Engineer",
    location: "San Francisco, CA",
    experience: "8 years",
    education: "Stanford University",
    matchScore: 94,
  },
  {
    id: "2",
    name: "Jordan Lee",
    title: "ML Engineer",
    location: "Seattle, WA",
    experience: "6 years",
    education: "MIT",
    matchScore: 91,
  },
];

const RecruiterDashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedMatchScore, setSelectedMatchScore] = useState<number | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      setShowResults(true);
    }
  };

  return (
    <DashboardLayout
      role="recruiter"
      navItems={navItems}
      userName="Mike Johnson"
      companyName="Elite Staffing"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Recruiter Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage placements across all your client organizations.
        </p>
      </div>

      {/* AI Search */}
      <div className="glass rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-amber" />
          <h2 className="font-display text-xl font-semibold text-foreground">
            AI Candidate Search
          </h2>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Search for candidates using natural language. Try: "Show me senior engineers
          with Apache Spark experience from top schools in Bay Area"
        </p>
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Describe the ideal candidate..."
              className="pl-12 h-12 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" variant="hero" size="lg">
            Search
          </Button>
        </form>

        {showResults && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {mockSearchResults.length} candidates matching your criteria
            </p>
            {mockSearchResults.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/30"
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
                    variant="excellent"
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedMatchScore(candidate.matchScore);
                      setMatchDialogOpen(true);
                    }}
                    title="Click to see how this match score was calculated"
                  >
                    {candidate.matchScore}% Match
                  </Badge>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                  <Button size="sm">Match to Job</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Active Placements"
          value={24}
          change="+4 this month"
          changeType="positive"
          icon={<Target className="w-6 h-6" />}
          variant="cardinal"
        />
        <MetricCard
          title="Total Revenue"
          value="$48K"
          change="+12% this month"
          changeType="positive"
          icon={<DollarSign className="w-6 h-6" />}
          variant="amber"
        />
        <MetricCard
          title="Candidates Placed"
          value={156}
          change="All time"
          changeType="neutral"
          icon={<Users className="w-6 h-6" />}
          variant="success"
        />
        <MetricCard
          title="Client Organizations"
          value={8}
          change="+1 new"
          changeType="positive"
          icon={<Building2 className="w-6 h-6" />}
        />
      </div>

      {/* Organizations */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Your Client Organizations
          </h2>
          <Button variant="ghost" size="sm" className="group">
            View All
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {mockOrganizations.map((org) => (
            <div
              key={org.id}
              className="p-5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium text-foreground">{org.name}</h3>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Active Jobs</p>
                  <p className="font-semibold text-foreground">{org.activeJobs}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Placements</p>
                  <p className="font-semibold text-foreground">{org.placements}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Match explanation dialog for AI search candidates */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Overall Match</DialogTitle>
            <DialogDescription>
              High scores indicate strong alignment between the candidate and your search criteria.
            </DialogDescription>
          </DialogHeader>
          {selectedMatchScore != null && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-semibold">Match score:</span>{" "}
                {Math.round(selectedMatchScore)}%
              </p>
              <p className="text-xs text-muted-foreground">
                This mock match score is based on how well the candidate&apos;s skills, experience,
                and education align with your AI search prompt.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default RecruiterDashboard;
