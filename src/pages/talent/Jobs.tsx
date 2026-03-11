import DashboardLayout from "@/components/layout/DashboardLayout";
import JobCard from "@/components/dashboard/JobCard";
import ApplyModal from "@/components/talent/ApplyModal";
import JobDescriptionDialog from "@/components/talent/JobDescriptionDialog";
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
  const [filterMinSalary, setFilterMinSalary] = useState<number | null>(null);
  const [filterMinMatch, setFilterMinMatch] = useState<number | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<typeof availableJobs[0] | null>(null);
  const [jobDescriptionOpen, setJobDescriptionOpen] = useState(false);
  const [selectedJobForView, setSelectedJobForView] = useState<typeof availableJobs[0] | null>(null);
  const {
    availableJobs,
    jobsWithMatch,
    loadingMatch,
    fetchJobsWithMatch,
    removeFromAvailable,
    saveJob,
    applyToJob,
    refetch,
    loading,
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
    filterType !== null ||
    filterMinSalary !== null ||
    filterMinMatch !== null ||
    appliedSearch !== "" ||
    appliedLocation !== "";
  const clearAllFilters = () => {
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

  const handleApplyClick = (job: typeof availableJobs[0]) => {
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
      setSelectedJobs(filteredJobs.map((job) => job.id));
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

  const handleViewJob = (job: typeof availableJobs[0]) => {
    setSelectedJobForView(job);
    setJobDescriptionOpen(true);
  };

  const baseJobs = filterMinMatch != null ? (jobsWithMatch ?? []) : availableJobs;

  const filteredJobs = baseJobs
    .filter((job) => {
      const matchesSearch = !appliedSearch ||
        (typeof job.title === "string" && job.title.toLowerCase().includes(appliedSearch.toLowerCase())) ||
        (typeof job.company === "string" && job.company.toLowerCase().includes(appliedSearch.toLowerCase())) ||
        (job.skills && job.skills.some((skill) => String(skill).toLowerCase().includes(appliedSearch.toLowerCase()))) ||
        (job.description && job.description.toLowerCase().includes(appliedSearch.toLowerCase()));

      const matchesLocation = !appliedLocation ||
        (job.location && job.location.toLowerCase().includes(appliedLocation.toLowerCase()));

      const matchesType = !filterType || (job.type && job.type.toLowerCase() === filterType.toLowerCase());

      const jobSalary = parseSalaryMax(job.salary);
      const matchesSalary = filterMinSalary == null || (jobSalary != null && jobSalary >= filterMinSalary);

      const matchesMatch = filterMinMatch == null || (typeof job.matchScore === "number" && job.matchScore >= filterMinMatch);

      return matchesSearch && matchesLocation && matchesType && matchesSalary && matchesMatch;
    })
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

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
          <Button
            variant="outline"
            size="lg"
            onClick={() => hasActiveFilters && clearAllFilters()}
          >
            <Filter className="w-4 h-4 mr-2" />
            {hasActiveFilters ? "Clear filters" : "Filters"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 items-center">
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
          <Button variant="outline" size="sm" onClick={handleRemoveSelected}>
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Selected ({selectedJobs.length})
          </Button>
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
              onToggleSelect={(checked) => handleToggleSelect(job.id, checked)}
              onApply={() => handleApplyClick(job)}
              onSave={() => handleSave(job)}
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
