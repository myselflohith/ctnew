import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import JobCard from "@/components/dashboard/JobCard";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Search,
  FileText,
  Briefcase,
  Heart,
  Settings,
  TrendingUp,
  CheckCircle,
  Clock,
  Star,
  ArrowRight,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent/dashboard" },
  { icon: Search, label: "Find Jobs", path: "/talent/jobs" },
  { icon: FileText, label: "Applications", path: "/talent/applications" },
  { icon: Heart, label: "Saved Jobs", path: "/talent/saved" },
  { icon: Settings, label: "Settings", path: "/talent/settings" },
];

// Mock data - will be replaced with real data
const mockJobs = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp AI",
    location: "San Francisco, CA",
    type: "hybrid" as const,
    salary: "$150k - $200k",
    postedAt: "2 days ago",
    matchScore: 92,
    skills: ["React", "TypeScript", "Node.js", "GraphQL", "AWS"],
  },
  {
    id: "2",
    title: "Full Stack Engineer",
    company: "StartupXYZ",
    location: "New York, NY",
    type: "remote" as const,
    salary: "$130k - $170k",
    postedAt: "5 days ago",
    matchScore: 87,
    skills: ["Python", "React", "PostgreSQL", "Docker"],
  },
  {
    id: "3",
    title: "Backend Developer",
    company: "Enterprise Inc",
    location: "Austin, TX",
    type: "onsite" as const,
    salary: "$120k - $150k",
    postedAt: "1 week ago",
    matchScore: 75,
    skills: ["Java", "Spring Boot", "Kubernetes", "MongoDB"],
  },
];

const TalentDashboard = () => {
  return (
    <DashboardLayout role="talent" navItems={navItems} userName="John Doe">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Welcome back, John! 👋
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your job search.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Profile Views"
          value={124}
          change="+12% this week"
          changeType="positive"
          icon={<TrendingUp className="w-6 h-6" />}
          variant="cardinal"
        />
        <MetricCard
          title="Applications Sent"
          value={8}
          change="3 this week"
          changeType="neutral"
          icon={<FileText className="w-6 h-6" />}
          variant="amber"
        />
        <MetricCard
          title="Interviews Scheduled"
          value={3}
          change="+2 new"
          changeType="positive"
          icon={<Clock className="w-6 h-6" />}
          variant="success"
        />
        <MetricCard
          title="Profile Strength"
          value="85%"
          icon={<Star className="w-6 h-6" />}
        />
      </div>

      {/* Recommended Jobs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Recommended for You
            </h2>
            <p className="text-sm text-muted-foreground">
              Based on your profile and preferences
            </p>
          </div>
          <Button variant="ghost" className="group">
            View All Jobs
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        <div className="space-y-4">
          {mockJobs.map((job) => (
            <JobCard
              key={job.id}
              {...job}
              onApply={() => console.log("Apply to", job.id)}
              onSave={() => console.log("Save", job.id)}
              onView={() => console.log("View", job.id)}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <span>Update Resume</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <Search className="w-6 h-6 text-amber" />
            <span>Browse Jobs</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <Star className="w-6 h-6 text-gold" />
            <span>Upgrade to Premium</span>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TalentDashboard;
