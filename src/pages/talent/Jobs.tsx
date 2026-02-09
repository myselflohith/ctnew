import DashboardLayout from "@/components/layout/DashboardLayout";
import JobCard from "@/components/dashboard/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Search,
  FileText,
  Heart,
  Settings,
  Filter,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { useJobs } from "@/contexts/JobsContext";
import { toast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent/dashboard" },
  { icon: Search, label: "Find Jobs", path: "/talent/jobs" },
  { icon: FileText, label: "Applications", path: "/talent/applications" },
  { icon: Heart, label: "Saved Jobs", path: "/talent/saved" },
  { icon: Settings, label: "Settings", path: "/talent/settings" },
];

const TalentJobs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const { availableJobs, removeFromAvailable, saveJob, applyToJob } = useJobs();

  const handleApply = (job: typeof availableJobs[0]) => {
    applyToJob(job);
    toast.success(`Applied to ${job.title} at ${job.company}`);
  };

  const handleRemove = (jobId: string) => {
    removeFromAvailable(jobId);
    toast.info("Job removed from list");
  };

  const handleSave = (job: typeof availableJobs[0]) => {
    saveJob(job);
    toast.success(`Saved ${job.title} to your saved jobs`);
  };

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

      {/* Search */}
      <div className="glass rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Job title, skills, or company..."
              className="pl-12 h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Location..."
              className="pl-12 h-12"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
            />
          </div>
          <Button variant="hero" size="lg">
            Search
          </Button>
          <Button variant="outline" size="lg">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Remote</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Hybrid</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">$150K+</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">90%+ Match</Badge>
        </div>
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground">
          Showing {availableJobs.length} jobs sorted by match score
        </p>
      </div>

      {availableJobs.length > 0 ? (
        <div className="space-y-4">
          {availableJobs.map((job) => (
            <JobCard
              key={job.id}
              {...job}
              showRemove={true}
              onApply={() => handleApply(job)}
              onSave={() => handleSave(job)}
              onRemove={() => handleRemove(job.id)}
              onView={() => console.log("View", job.id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            No jobs available
          </h3>
          <p className="text-muted-foreground">
            Check back later for new opportunities.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TalentJobs;
