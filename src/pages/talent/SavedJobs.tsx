import DashboardLayout from "@/components/layout/DashboardLayout";
import JobCard from "@/components/dashboard/JobCard";
import ApplyModal from "@/components/talent/ApplyModal";
import JobDescriptionDialog from "@/components/talent/JobDescriptionDialog";
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
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { useJobs } from "@/contexts/JobsContext";
import { toast } from "sonner";


const TalentSavedJobs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<typeof savedJobs[0] | null>(null);
  const [jobDescriptionOpen, setJobDescriptionOpen] = useState(false);
  const [selectedJobForView, setSelectedJobForView] = useState<typeof savedJobs[0] | null>(null);
  const { savedJobs, removeFromSaved, applyToJob } = useJobs();

  const q = (searchQuery || "").trim().toLowerCase();
  const filteredSavedJobs = q
    ? savedJobs.filter(
        (job) =>
          (typeof job.title === "string" && job.title.toLowerCase().includes(q)) ||
          (typeof job.company === "string" && job.company.toLowerCase().includes(q)) ||
          (job.location && job.location.toLowerCase().includes(q)) ||
          (job.skills && job.skills.some((skill) => String(skill).toLowerCase().includes(q))) ||
          (job.description && job.description.toLowerCase().includes(q))
      )
    : savedJobs;

  const handleApplyClick = (job: typeof savedJobs[0]) => {
    setSelectedJobForApply(job);
    setApplyModalOpen(true);
  };

  const handleApplyWithResume = async (resumeId: string) => {
    if (selectedJobForApply) {
      await applyToJob(selectedJobForApply, resumeId);
      setSelectedJobs((prev) => prev.filter((id) => id !== selectedJobForApply.id));
      setSelectedJobForApply(null);
    }
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
      setSelectedJobs(filteredSavedJobs.map((job) => job.id));
    } else {
      setSelectedJobs([]);
    }
  };

  const handleRemoveSelected = async () => {
    for (const jobId of selectedJobs) {
      await removeFromSaved(jobId);
    }
    setSelectedJobs([]);
  };

  const handleViewJob = (job: typeof savedJobs[0]) => {
    setSelectedJobForView(job);
    setJobDescriptionOpen(true);
  };

  const allSelected = filteredSavedJobs.length > 0 && selectedJobs.length === filteredSavedJobs.length &&
    filteredSavedJobs.every((job) => selectedJobs.includes(job.id));
  const someSelected = selectedJobs.length > 0;

  return (
    <DashboardLayout role="talent">
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
          <div className="flex items-center gap-2 pl-6">
            <Checkbox
              id="select-all-saved"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all-saved" className="text-sm text-muted-foreground cursor-pointer">
              Select All
            </label>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredSavedJobs.length} of {savedJobs.length} saved job{savedJobs.length !== 1 ? "s" : ""}
              {q ? " matching your search" : ""}
            </p>
            {someSelected && (
              <Button variant="outline" size="sm" onClick={handleRemoveSelected}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Selected ({selectedJobs.length})
              </Button>
            )}
          </div>
        </div>
      )}

      {savedJobs.length > 0 ? (
        filteredSavedJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredSavedJobs.map((job) => (
            <JobCard
              key={job.id}
              {...job}
              showRemove={true}
              isSelected={selectedJobs.includes(job.id)}
              onToggleSelect={(checked) => handleToggleSelect(job.id, checked)}
              onApply={() => handleApplyClick(job)}
              onView={() => handleViewJob(job)}
            />
          ))}
        </div>
        ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            No saved jobs match your search
          </h3>
          <p className="text-muted-foreground">
            Try a different search term or clear the search box.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setSearchQuery("")}
          >
            Clear search
          </Button>
        </div>
        )
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

      {/* Apply Modal */}
      {selectedJobForApply && (
        <ApplyModal
          open={applyModalOpen}
          onOpenChange={setApplyModalOpen}
          jobTitle={selectedJobForApply.title}
          company={selectedJobForApply.company}
          onApply={handleApplyWithResume}
        />
      )}

      {/* Job Description Dialog */}
      <JobDescriptionDialog
        open={jobDescriptionOpen}
        onOpenChange={setJobDescriptionOpen}
        job={selectedJobForView}
      />
    </DashboardLayout>
  );
};

export default TalentSavedJobs;
