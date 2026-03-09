import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import JobCard from "@/components/dashboard/JobCard";
import ApplyModal from "@/components/talent/ApplyModal";
import JobDescriptionDialog from "@/components/talent/JobDescriptionDialog";
import { Button } from "@/components/ui/button";
import { FileText, Clock, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJobs } from "@/contexts/JobsContext";
import { toast } from "sonner";

const TalentDashboard = () => {
  const navigate = useNavigate();
  const {
    availableJobs,
    saveJob,
    applyToJob,
    applications,
    applicationsTodayCount,
    scheduledInterviewsCount,
    scheduledInterviewsTodayCount,
  } = useJobs();
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<typeof availableJobs[0] | null>(null);
  const [jobDescriptionOpen, setJobDescriptionOpen] = useState(false);
  const [selectedJobForView, setSelectedJobForView] = useState<typeof availableJobs[0] | null>(null);

  const topJobs = availableJobs.slice(0, 3);
  const recommendedJobs = availableJobs.filter((j) => (j.matchScore ?? 0) >= 80).slice(0, 3);

  console.log('[TalentDashboard] availableJobs', availableJobs);
  console.log('[TalentDashboard] recommendedJobs', recommendedJobs);

  const handleApplyClick = (job: typeof availableJobs[0]) => {
    setSelectedJobForApply(job);
    setApplyModalOpen(true);
  };

  const handleApplyWithResume = async (resumeId: string) => {
    if (selectedJobForApply) {
      await applyToJob(selectedJobForApply, resumeId);
      setSelectedJobForApply(null);
    }
  };

  const handleSave = (job: typeof availableJobs[0]) => {
    saveJob(job);
    toast.success(`Saved ${job.title}`);
    navigate("/talent/saved");
  };

  const handleViewJob = (job: typeof availableJobs[0]) => {
    setSelectedJobForView(job);
    setJobDescriptionOpen(true);
  };

  return (
    <DashboardLayout role="talent">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your job search.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <MetricCard
          title="Applications Sent"
          value={applications.length}
          change={
            applicationsTodayCount > 0 ? `+${applicationsTodayCount} today` : undefined
          }
          changeType={applicationsTodayCount > 0 ? "positive" : "neutral"}
          icon={<FileText className="w-6 h-6" />}
          variant="amber"
          onClick={() => navigate("/talent/applications")}
          className="cursor-pointer"
        />
        <MetricCard
          title="Interviews Scheduled"
          value={scheduledInterviewsCount}
          change={
            scheduledInterviewsTodayCount > 0
              ? `+${scheduledInterviewsTodayCount} today`
              : undefined
          }
          changeType={scheduledInterviewsTodayCount > 0 ? "positive" : "neutral"}
          icon={<Clock className="w-6 h-6" />}
          variant="success"
          onClick={() => navigate("/talent/interviews")}
          className="cursor-pointer"
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

          <Button
            variant="ghost"
            className="group"
            onClick={() => navigate("/talent/jobs")}
          >
            View All Jobs
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        <div className="space-y-4">
          {recommendedJobs.length > 0 ? (
            recommendedJobs.map((job) => (
              <JobCard
                key={job.id}
                {...job}
                onApply={() => handleApplyClick(job)}
                onSave={() => handleSave(job)}
                onView={() => handleViewJob(job)}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No jobs with 80%+ match yet. Upload a resume or check Find Jobs.
            </p>
          )}
        </div>
      </div>

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

export default TalentDashboard;
