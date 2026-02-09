import DashboardLayout from "@/components/layout/DashboardLayout";
import JobCard from "@/components/dashboard/JobCard";
import {
  LayoutDashboard,
  Search,
  FileText,
  Heart,
  Settings,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent/dashboard" },
  { icon: Search, label: "Find Jobs", path: "/talent/jobs" },
  { icon: FileText, label: "Applications", path: "/talent/applications" },
  { icon: Heart, label: "Saved Jobs", path: "/talent/saved" },
  { icon: Settings, label: "Settings", path: "/talent/settings" },
];

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
  {
    id: "4",
    title: "DevOps Engineer",
    company: "CloudScale",
    location: "Seattle, WA",
    type: "remote" as const,
    salary: "$140k - $180k",
    postedAt: "3 days ago",
    matchScore: 82,
    skills: ["AWS", "Terraform", "Docker", "Kubernetes"],
  },
  {
    id: "5",
    title: "ML Engineer",
    company: "AI Labs",
    location: "Boston, MA",
    type: "hybrid" as const,
    salary: "$160k - $210k",
    postedAt: "1 day ago",
    matchScore: 68,
    skills: ["Python", "PyTorch", "TensorFlow", "MLOps"],
  },
];

const TalentJobs = () => {
  return (
    <DashboardLayout role="talent" navItems={navItems} userName="John Doe">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Find Jobs
        </h1>
        <p className="text-muted-foreground">
          Discover opportunities matched to your skills and preferences.
        </p>
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground">
          Showing {mockJobs.length} jobs sorted by match score
        </p>
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
    </DashboardLayout>
  );
};

export default TalentJobs;
