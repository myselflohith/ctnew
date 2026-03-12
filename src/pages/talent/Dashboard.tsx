import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import JobCard from "@/components/dashboard/JobCard";
import ApplyModal from "@/components/talent/ApplyModal";
import JobDescriptionDialog from "@/components/talent/JobDescriptionDialog";
import { Button } from "@/components/ui/button";
import { FileText, Clock, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useJobs } from "@/contexts/JobsContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TalentDashboard = () => {
  const navigate = useNavigate();
  const {
    availableJobs,
    jobsWithMatch,
    loadingMatch,
    fetchJobsWithMatch,
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
  const [matchDetailsOpen, setMatchDetailsOpen] = useState(false);
  const [selectedMatchDetails, setSelectedMatchDetails] = useState<any | null>(null);

  useEffect(() => {
    fetchJobsWithMatch();
  }, [fetchJobsWithMatch]);

  const topJobs = availableJobs.slice(0, 3);
  const recommendedJobs = (jobsWithMatch ?? []).filter((j) => (j.matchScore ?? 0) >= 80).slice(0, 3);

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
    navigate("/talent/jobs");
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
          {loadingMatch && recommendedJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading recommended jobs…</p>
          ) : recommendedJobs.length > 0 ? (
            recommendedJobs.map((job) => (
              <JobCard
                key={job.id}
                {...job}
                onApply={() => handleApplyClick(job)}
                onSave={() => handleSave(job)}
                onView={() => handleViewJob(job)}
                onViewMatchDetails={
                  job.detailResponse
                    ? () => {
                        setSelectedMatchDetails(job.detailResponse);
                        setMatchDetailsOpen(true);
                      }
                    : undefined
                }
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

      {/* Match Details Dialog */}
      <Dialog open={matchDetailsOpen} onOpenChange={setMatchDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Overall Match</DialogTitle>
            <DialogDescription>
              Detailed scoring and explanation for why this job was recommended.
            </DialogDescription>
          </DialogHeader>
          {selectedMatchDetails && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold">
                  Summary (Match Score: {selectedMatchDetails.score}%)
                </p>
                <p className="mt-1 text-muted-foreground">
                  {selectedMatchDetails.summary}
                </p>
              </div>

              <div>
                <p className="font-semibold">Overall Score</p>
                <p className="text-muted-foreground">
                  Final overall score: {selectedMatchDetails.score} / 100
                </p>
              </div>

              {selectedMatchDetails.skills && selectedMatchDetails.skills.length > 0 && (
                <div>
                  <p className="font-semibold">Skills</p>
                  <div className="mt-2 space-y-2">
                    {selectedMatchDetails.skills.map((s: any) => (
                      <div key={s.name}>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Match type: {s.match_type}, Experience: {s.years_experience}
                        </p>
                        {Array.isArray(s.evidence) && s.evidence.length > 0 && (
                          <p className="text-xs">
                            Evidence: {s.evidence.join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMatchDetails.notes_score_breakdown && (
                <div>
                  <p className="font-semibold">Score Breakdown</p>
                  <div className="mt-2 space-y-2">
                    {Object.values(
                      selectedMatchDetails.notes_score_breakdown as Record<string, any>
                    ).map((note: any, idx: number) => (
                      <div key={idx}>
                        <p className="text-xs font-medium">{note.note_text}</p>
                        <p className="text-xs text-muted-foreground">
                          Score: {note.score} / {note.max_points} (weight {note.weight})
                        </p>
                        {note.match_summary && (
                          <p className="text-xs text-muted-foreground">
                            {note.match_summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export default TalentDashboard;
