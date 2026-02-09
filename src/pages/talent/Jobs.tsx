import DashboardLayout from "@/components/layout/DashboardLayout";
import JobCard from "@/components/dashboard/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LayoutDashboard,
  Search,
  FileText,
  Heart,
  Settings,
  Filter,
  MapPin,
  Trash2,
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
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const { availableJobs, removeFromAvailable, saveJob, applyToJob } = useJobs();

  const handleApply = (job: typeof availableJobs[0]) => {
    applyToJob(job);
    setSelectedJobs((prev) => prev.filter((id) => id !== job.id));
    toast.success(`Applied to ${job.title} at ${job.company}`);
  };

  const handleToggleSelect = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedJobs((prev) => [...prev, jobId]);
    } else {
      setSelectedJobs((prev) => prev.filter((id) => id !== jobId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(availableJobs.map((job) => job.id));
    } else {
      setSelectedJobs([]);
    }
  };

  const handleRemoveSelected = () => {
    selectedJobs.forEach((jobId) => {
      removeFromAvailable(jobId);
    });
    toast.info(`Removed ${selectedJobs.length} job(s) from list`);
    setSelectedJobs([]);
  };

  const handleSave = (job: typeof availableJobs[0]) => {
    saveJob(job);
    toast.success(`Saved ${job.title} to your saved jobs`);
  };

  const allSelected = availableJobs.length > 0 && selectedJobs.length === availableJobs.length;
  const someSelected = selectedJobs.length > 0;

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

      {/* Results Header with Select All */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {availableJobs.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                Select All
              </label>
            </div>
          )}
          <p className="text-muted-foreground">
            Showing {availableJobs.length} jobs sorted by match score
          </p>
        </div>
        {someSelected && (
          <Button variant="outline" size="sm" onClick={handleRemoveSelected}>
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Selected ({selectedJobs.length})
          </Button>
        )}
      </div>

      {availableJobs.length > 0 ? (
        <div className="space-y-4">
          {availableJobs.map((job) => (
            <JobCard
              key={job.id}
              {...job}
              showRemove={true}
              isSelected={selectedJobs.includes(job.id)}
              onToggleSelect={(checked) => handleToggleSelect(job.id, checked)}
              onApply={() => handleApply(job)}
              onSave={() => handleSave(job)}
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
