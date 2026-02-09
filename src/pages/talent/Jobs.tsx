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

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent/dashboard" },
  { icon: Search, label: "Find Jobs", path: "/talent/jobs" },
  { icon: Heart, label: "Saved Jobs", path: "/talent/saved" },
  { icon: FileText, label: "Applications", path: "/talent/applications" },
  { icon: Calendar, label: "Interviews", path: "/talent/interviews" },
  { icon: Settings, label: "Settings", path: "/talent/settings" },
];

const TalentJobs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<typeof availableJobs[0] | null>(null);
  const [jobDescriptionOpen, setJobDescriptionOpen] = useState(false);
  const [selectedJobForView, setSelectedJobForView] = useState<typeof availableJobs[0] | null>(null);
  const { availableJobs, removeFromAvailable, saveJob, applyToJob, refetch, loading } = useJobs();

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

  // Filter jobs based on search query
  const filteredJobs = availableJobs.filter((job) => {
    const matchesSearch = !searchQuery || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.description && job.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLocation = !locationQuery ||
      job.location.toLowerCase().includes(locationQuery.toLowerCase());
    
    return matchesSearch && matchesLocation;
  });

  const allSelected = filteredJobs.length > 0 && selectedJobs.length === filteredJobs.length && 
    filteredJobs.every(job => selectedJobs.includes(job.id));
  const someSelected = selectedJobs.length > 0;

  return (
    <DashboardLayout role="talent" navItems={navItems} userName="John Doe">
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
          <Button 
            variant="hero" 
            size="lg"
            onClick={() => {
              // Search is handled by filtering, but we can add a visual indicator
              // The filtering happens automatically as user types
            }}
          >
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
          {filteredJobs.length > 0 && (
            <div className="flex items-center gap-2 pl-6">
              <Checkbox
                id="select-all"
                checked={allSelected && filteredJobs.length === availableJobs.length}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                Select All
              </label>
            </div>
          )}
          <p className="text-muted-foreground">
            Showing {filteredJobs.length} {searchQuery || locationQuery ? 'filtered ' : ''}job{filteredJobs.length !== 1 ? 's' : ''} {filteredJobs.length > 0 ? 'sorted by match score' : ''}
          </p>
        </div>
        {someSelected && (
          <Button variant="outline" size="sm" onClick={handleRemoveSelected}>
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Selected ({selectedJobs.length})
          </Button>
        )}
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Loading jobs...</p>
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
            {searchQuery || locationQuery ? 'No jobs found' : 'No jobs available'}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery || locationQuery 
              ? 'Try adjusting your search criteria or clearing filters.'
              : 'Check back later for new opportunities.'}
          </p>
          {(searchQuery || locationQuery) && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setLocationQuery("");
              }}
            >
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
