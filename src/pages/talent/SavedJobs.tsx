import DashboardLayout from "@/components/layout/DashboardLayout";
import JobCard from "@/components/dashboard/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LayoutDashboard,
  Search,
  FileText,
  Heart,
  Settings,
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

const TalentSavedJobs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const { savedJobs, removeFromSaved, applyToJob } = useJobs();

  const handleApply = (job: typeof savedJobs[0]) => {
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
      setSelectedJobs(savedJobs.map((job) => job.id));
    } else {
      setSelectedJobs([]);
    }
  };

  const handleRemoveSelected = () => {
    selectedJobs.forEach((jobId) => {
      removeFromSaved(jobId);
    });
    toast.info(`Removed ${selectedJobs.length} job(s) from saved`);
    setSelectedJobs([]);
  };

  const allSelected = savedJobs.length > 0 && selectedJobs.length === savedJobs.length;
  const someSelected = selectedJobs.length > 0;

  return (
    <DashboardLayout role="talent" navItems={navItems} userName="John Doe">
      <div className="mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Saved Jobs
          </h1>
          <p className="text-muted-foreground">
            Jobs you've saved for later. Apply before they're gone!
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-4 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search saved jobs..."
            className="pl-12 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Select All & Remove Selected */}
      {savedJobs.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-saved"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all-saved" className="text-sm text-muted-foreground cursor-pointer">
              Select All
            </label>
          </div>
          {someSelected && (
            <Button variant="outline" size="sm" onClick={handleRemoveSelected}>
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Selected ({selectedJobs.length})
            </Button>
          )}
        </div>
      )}

      {savedJobs.length > 0 ? (
        <div className="space-y-4">
          {savedJobs.map((job) => (
            <JobCard
              key={job.id}
              {...job}
              showRemove={true}
              isSelected={selectedJobs.includes(job.id)}
              onToggleSelect={(checked) => handleToggleSelect(job.id, checked)}
              onApply={() => handleApply(job)}
              onView={() => console.log("View", job.id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            No saved jobs yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Start exploring jobs and save the ones you're interested in.
          </p>
          <Button variant="hero">Browse Jobs</Button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TalentSavedJobs;
