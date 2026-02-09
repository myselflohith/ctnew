import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  Search,
  FileText,
  Heart,
  Settings,
  Building2,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent/dashboard" },
  { icon: Search, label: "Find Jobs", path: "/talent/jobs" },
  { icon: FileText, label: "Applications", path: "/talent/applications" },
  { icon: Heart, label: "Saved Jobs", path: "/talent/saved" },
  { icon: Settings, label: "Settings", path: "/talent/settings" },
];

const mockApplications = [
  {
    id: "1",
    jobTitle: "Senior Frontend Developer",
    company: "TechCorp AI",
    location: "San Francisco, CA",
    appliedAt: "2 days ago",
    status: "Interview Scheduled",
    matchScore: 92,
  },
  {
    id: "2",
    jobTitle: "Full Stack Engineer",
    company: "StartupXYZ",
    location: "New York, NY",
    appliedAt: "5 days ago",
    status: "Under Review",
    matchScore: 87,
  },
  {
    id: "3",
    jobTitle: "Backend Developer",
    company: "Enterprise Inc",
    location: "Austin, TX",
    appliedAt: "1 week ago",
    status: "Application Sent",
    matchScore: 75,
  },
  {
    id: "4",
    jobTitle: "React Developer",
    company: "WebFlow Co",
    location: "Remote",
    appliedAt: "2 weeks ago",
    status: "Rejected",
    matchScore: 68,
  },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Interview Scheduled":
      return "excellent";
    case "Under Review":
      return "good";
    case "Application Sent":
      return "secondary";
    case "Rejected":
      return "destructive";
    default:
      return "outline";
  }
};

const TalentApplications = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <DashboardLayout role="talent" navItems={navItems} userName="John Doe">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          My Applications
        </h1>
        <p className="text-muted-foreground">
          Track the status of all your job applications.
        </p>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-4 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search applications by job title or company..."
            className="pl-12 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">8</p>
          <p className="text-sm text-muted-foreground">Total Applications</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">3</p>
          <p className="text-sm text-muted-foreground">In Progress</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">2</p>
          <p className="text-sm text-muted-foreground">Interviews</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">1</p>
          <p className="text-sm text-muted-foreground">Rejected</p>
        </div>
      </div>

      {/* Applications List */}
      <div className="glass rounded-2xl p-6">
        <div className="space-y-4">
          {mockApplications.map((application) => (
            <div
              key={application.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{application.jobTitle}</h3>
                  <p className="text-sm text-muted-foreground">{application.company}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {application.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Applied {application.appliedAt}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary">{application.matchScore}% Match</Badge>
                <Badge variant={getStatusVariant(application.status)}>
                  {application.status}
                </Badge>
                <Button variant="ghost" size="sm" className="group">
                  View
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TalentApplications;
