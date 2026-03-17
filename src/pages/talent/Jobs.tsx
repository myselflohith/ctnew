import DashboardLayout from "@/components/layout/DashboardLayout";
import JobCard from "@/components/dashboard/JobCard";
import ApplyModal from "@/components/talent/ApplyModal";
import JobDescriptionDialog from "@/components/talent/JobDescriptionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiClient } from "@/lib/api";
import {
  LayoutDashboard,
  Search,
  FileText,
  Heart,
  Settings,
  MapPin,
  Trash2,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useJobs } from "@/contexts/JobsContext";
import { toast } from "sonner";


const TalentJobs = () => {
  const [searchInput, setSearchInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedLocation, setAppliedLocation] = useState("");
  const [filterType, setFilterType] = useState<"remote" | "hybrid" | "onsite" | null>(null);
  const [filterSavedOnly, setFilterSavedOnly] = useState(false);
  const [filterMinSalary, setFilterMinSalary] = useState<number | null>(null);
  const [filterMinMatch, setFilterMinMatch] = useState<number | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"" | "save" | "apply" | "remove">("");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<typeof availableJobs[0] | null>(null);
  const [bulkApplyMode, setBulkApplyMode] = useState(false);
  const [jobDescriptionOpen, setJobDescriptionOpen] = useState(false);
  const [selectedJobForView, setSelectedJobForView] = useState<typeof availableJobs[0] | null>(null);
  const {
    availableJobs,
    jobsWithMatch,
    loadingMatch,
    fetchJobsWithMatch,
    removeFromAvailable,
    saveJob,
    removeFromSaved,
    applyToJob,
    isJobSaved,
    refetch,
    loading,
    savedJobs,
  } = useJobs();

  useEffect(() => {
    if (filterMinMatch != null && jobsWithMatch === null) {
      fetchJobsWithMatch();
    }
  }, [filterMinMatch, jobsWithMatch, fetchJobsWithMatch]);

  const toggleFilterType = (type: "remote" | "hybrid" | "onsite") => {
    setFilterType((prev) => (prev === type ? null : type));
    // Re-fetch jobs so DB queries are visible in server logs when filters change.
    refetch();
  };
  const toggleFilterMinSalary = () => {
    setFilterMinSalary((prev) => (prev !== null ? null : 150000));
    refetch();
  };
  const toggleFilterMinMatch = () => {
    setFilterMinMatch((prev) => (prev !== null ? null : 90));
    // This will also trigger fetchJobsWithMatch() via useEffect when first enabled.
    refetch();
  };
  const hasActiveFilters =
    filterSavedOnly ||
    filterType !== null ||
    filterMinSalary !== null ||
    filterMinMatch !== null ||
    appliedSearch !== "" ||
    appliedLocation !== "";
  const clearAllFilters = () => {
    setFilterSavedOnly(false);
    setFilterType(null);
    setFilterMinSalary(null);
    setFilterMinMatch(null);
    setAppliedSearch("");
    setAppliedLocation("");
    setSearchInput("");
    setLocationInput("");
    refetch();
  };
  const handleSearchClick = () => {
    setAppliedSearch(searchInput.trim());
    setAppliedLocation(locationInput.trim());
  };

  const parseSalaryMax = (salary: string | undefined): number | null => {
    if (!salary || typeof salary !== "string") return null;
    const cleaned = salary.replace(/,/g, "");
    const allNumbers: number[] = [];
    const kMatch = cleaned.match(/(\d+)\s*k/gi);
    if (kMatch) kMatch.forEach((m) => allNumbers.push(parseInt(m.replace(/\s*k/i, ""), 10) * 1000));
    const numMatch = cleaned.match(/\d+/g);
    if (numMatch) numMatch.forEach((m) => allNumbers.push(parseInt(m, 10)));
    return allNumbers.length ? Math.max(...allNumbers) : null;
  };

  /** Match search query as full words only (e.g. "Java" matches "Java" but not "JavaScript"). */
  const jobMatchesSearch = (job: { title?: string; company?: string; skills?: string[]; description?: string }, query: string): boolean => {
    const q = query.trim();
    if (!q) return true;
    const words = q.split(/\s+/).filter(Boolean);
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchableText = [
      job.title,
      job.company,
      ...(job.skills || []).map(String),
      job.description,
    ]
      .filter(Boolean)
      .join(" ");
    if (!searchableText) return false;
    return words.every((word) => {
      const re = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
      return re.test(searchableText);
    });
  };

  const handleApplyClick = (job: typeof availableJobs[0]) => {
    setBulkApplyMode(false);
    setSelectedJobForApply(job);
    setApplyModalOpen(true);
  };

  const handleApplyWithResume = async (resumeId: string) => {
    if (bulkApplyMode) {
      const jobIds = filteredJobs
        .filter((job) => selectedJobs.includes(job.id))
        .map((job) => job.id);
      if (jobIds.length === 0) {
        setBulkApplyMode(false);
        setSelectedJobForApply(null);
        return;
      }

      await apiClient.applyToJobs(jobIds, resumeId);
      await refetch();

      setSelectedJobs([]);
      setBulkApplyMode(false);
      setSelectedJobForApply(null);
      return;
    }

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
      setSelectedJobs(filteredJobs.map((job) => job.id));
    } else {
      setSelectedJobs([]);
    }
  };

  const handleBulkActionExecute = async () => {
    const selectedVisibleJobIds = filteredJobs
      .filter((job) => selectedJobs.includes(job.id))
      .map((job) => job.id);

    if (!bulkAction || selectedVisibleJobIds.length === 0) return;

    if (bulkAction === "save") {
      await apiClient.saveJobs(selectedVisibleJobIds);
      await refetch();
      setSelectedJobs([]);
      toast.success(`Saved ${selectedVisibleJobIds.length} job(s)`);
      return;
    }

    if (bulkAction === "apply") {
      const jobsById = new Map(
        filteredJobs.map((job) => [job.id, job])
      );
      const firstJob = jobsById.get(selectedVisibleJobIds[0]);
      if (!firstJob) return;
      setBulkApplyMode(true);
      setSelectedJobForApply(firstJob);
      setApplyModalOpen(true);
      return;
    }

    if (bulkAction === "remove") {
      await apiClient.rejectJobs(selectedVisibleJobIds);
      // Optimistically hide from current list
      selectedVisibleJobIds.forEach((jobId) => {
        removeFromAvailable(jobId);
      });
      await refetch();
      toast.info(`Removed ${selectedVisibleJobIds.length} job(s) from list`);
      setSelectedJobs([]);
    }
  };

  const handleSave = (job: typeof availableJobs[0]) => {
    saveJob(job);
  };

  const handleViewJob = (job: typeof availableJobs[0]) => {
    setSelectedJobForView(job);
    setJobDescriptionOpen(true);
  };

  const handleUnsave = (job: typeof availableJobs[0]) => {
    removeFromSaved(job.id);
  };

  // Merge available jobs (or jobsWithMatch when 90%+ filter is on) with saved jobs so saved jobs appear in the list
  const rawBaseJobs = filterMinMatch != null ? (jobsWithMatch ?? []) : availableJobs;
  const savedJobIds = new Set(savedJobs.map((j) => j.id));
  const baseJobs = (() => {
    const byId = new Map(rawBaseJobs.map((j) => [j.id, j]));
    savedJobs.forEach((j) => byId.set(j.id, j));
    return Array.from(byId.values());
  })();

  const filteredJobs = baseJobs
    .filter((job) => {
      const matchesSavedOnly = !filterSavedOnly || savedJobIds.has(job.id);

      const matchesSearch = !appliedSearch || jobMatchesSearch(job, appliedSearch);

      const matchesLocation = !appliedLocation ||
        (job.location && job.location.toLowerCase().includes(appliedLocation.toLowerCase()));

      const matchesType = !filterType || (job.type && job.type.toLowerCase() === filterType.toLowerCase());

      const jobSalary = parseSalaryMax(job.salary);
      const matchesSalary = filterMinSalary == null || (jobSalary != null && jobSalary >= filterMinSalary);

      const matchesMatch = filterMinMatch == null || (typeof job.matchScore === "number" && job.matchScore >= filterMinMatch);

      return matchesSavedOnly && matchesSearch && matchesLocation && matchesType && matchesSalary && matchesMatch;
    })
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

  const selectedVisibleJobs = filteredJobs.filter((job) => selectedJobs.includes(job.id));

  const bulkActionLabel =
    bulkAction === "save"
      ? "save"
      : bulkAction === "apply"
      ? "apply to"
      : bulkAction === "remove"
      ? "remove"
      : "";

  const allSelected = filteredJobs.length > 0 && selectedJobs.length === filteredJobs.length && 
    filteredJobs.every(job => selectedJobs.includes(job.id));
  const someSelected = selectedJobs.length > 0;

  return (
    <DashboardLayout role="talent">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Find Jobs
          </h1>
          <p className="text-muted-foreground">
            Discover opportunities matched to your skills and preferences.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetch()}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Job title, skills, or company..."
              className="pl-12 h-12"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
            />
          </div>
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Location..."
              className="pl-12 h-12"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
            />
          </div>
          <Button variant="hero" size="lg" onClick={handleSearchClick}>
            Search
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 items-center">
          <Badge
            variant={filterSavedOnly ? "default" : "outline"}
            className="cursor-pointer hover:bg-secondary"
            onClick={() => {
              setFilterSavedOnly((prev) => {
                if (!prev) refetch(); // fetch latest saved jobs when switching to Saved Jobs view
                return !prev;
              });
            }}
          >
            Saved Jobs
          </Badge>
          <Badge
            variant={filterType === "remote" ? "default" : "outline"}
            className="cursor-pointer hover:bg-secondary"
            onClick={() => toggleFilterType("remote")}
          >
            Remote
          </Badge>
          <Badge
            variant={filterType === "hybrid" ? "default" : "outline"}
            className="cursor-pointer hover:bg-secondary"
            onClick={() => toggleFilterType("hybrid")}
          >
            Hybrid
          </Badge>
          <Badge
            variant={filterType === "onsite" ? "default" : "outline"}
            className="cursor-pointer hover:bg-secondary"
            onClick={() => toggleFilterType("onsite")}
          >
            On-site
          </Badge>
          <Badge
            variant={filterMinSalary !== null ? "default" : "outline"}
            className="cursor-pointer hover:bg-secondary"
            onClick={toggleFilterMinSalary}
          >
            $150K+
          </Badge>
          <Badge
            variant={filterMinMatch !== null ? "default" : "outline"}
            className="cursor-pointer hover:bg-secondary"
            onClick={toggleFilterMinMatch}
          >
            90%+ Match
          </Badge>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Results Header with Select All */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {filteredJobs.length > 0 && (
            <div className="flex items-center gap-2 pl-6">
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
            Showing {filteredJobs.length} {(appliedSearch || appliedLocation || hasActiveFilters) ? "filtered " : ""}job{filteredJobs.length !== 1 ? "s" : ""} {filteredJobs.length > 0 ? "sorted by match score" : ""}
          </p>
        </div>
        {someSelected && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Actions:</span>
            <select
              className="border rounded-md px-2 py-1 text-xs bg-background"
              value={bulkAction}
              onChange={(e) => {
                const value = e.target.value as "" | "save" | "apply" | "remove";
                setBulkAction(value);
                if (value) {
                  setBulkConfirmOpen(true);
                }
              }}
            >
              <option value="">Select action</option>
              <option value="save">Save job(s)</option>
              <option value="apply">Apply to job(s)</option>
              <option value="remove">Remove job(s)</option>
            </select>
          </div>
        )}
      </div>

      {loading || (filterMinMatch != null && jobsWithMatch === null && loadingMatch) ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">
            {filterMinMatch != null && loadingMatch ? "Loading match scores…" : "Loading jobs…"}
          </p>
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              {...job}
              showRemove={true}
              isSelected={selectedJobs.includes(job.id)}
              isSaved={isJobSaved(job.id)}
              onToggleSelect={(checked) => handleToggleSelect(job.id, checked)}
              onApply={() => handleApplyClick(job)}
              onSave={() => handleSave(job)}
              onUnsave={() => handleUnsave(job)}
              onView={() => handleViewJob(job)}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            {(appliedSearch || appliedLocation || hasActiveFilters) ? "No jobs found" : "No jobs available"}
          </h3>
          <p className="text-muted-foreground">
            {(appliedSearch || appliedLocation || hasActiveFilters)
              ? "Try adjusting your search criteria or clearing filters."
              : "Check back later for new opportunities."}
          </p>
          {(appliedSearch || appliedLocation || hasActiveFilters) && (
            <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Bulk Action Confirmation */}
      <AlertDialog
        open={bulkConfirmOpen && !!bulkAction && selectedVisibleJobs.length > 0}
        onOpenChange={(open) => {
          setBulkConfirmOpen(open);
          if (!open) {
            setBulkAction("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm bulk action</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction
                ? `You have chosen to ${bulkActionLabel} the following job(s):`
                : "You have chosen a bulk action for the following job(s):"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 max-h-40 overflow-y-auto rounded-md border p-2 text-sm space-y-1">
            {selectedVisibleJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="flex flex-col">
                <span className="font-medium">{job.title ?? "Untitled role"}</span>
                {job.company && (
                  <span className="text-xs text-muted-foreground">{job.company}</span>
                )}
              </div>
            ))}
            {selectedVisibleJobs.length > 5 && (
              <div className="text-xs text-muted-foreground">
                and {selectedVisibleJobs.length - 5} more…
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setBulkConfirmOpen(false);
                setBulkAction("");
              }}
            >
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await handleBulkActionExecute();
                setBulkConfirmOpen(false);
                setBulkAction("");
              }}
            >
              Yes, proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

export default TalentJobs;
