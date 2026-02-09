import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import JobCard from "@/components/dashboard/JobCard";
import ApplyModal from "@/components/talent/ApplyModal";
import JobDescriptionDialog from "@/components/talent/JobDescriptionDialog";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Search,
  FileText,
  Briefcase,
  Heart,
  Settings,
  TrendingUp,
  CheckCircle,
  Clock,
  Star,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const TalentDashboard = () => {
  const navigate = useNavigate();
  const { availableJobs, saveJob, applyToJob, applications, loading } = useJobs();
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<typeof availableJobs[0] | null>(null);
  const [jobDescriptionOpen, setJobDescriptionOpen] = useState(false);
  const [selectedJobForView, setSelectedJobForView] = useState<typeof availableJobs[0] | null>(null);

  const topJobs = availableJobs.slice(0, 3);

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
    <DashboardLayout role="talent" navItems={navItems} userName="John Doe">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Welcome back, John! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your job search.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Profile Views"
          value={124}
          change="+12% this week"
          changeType="positive"
          icon={<TrendingUp className="w-6 h-6" />}
          variant="cardinal"
        />
        <MetricCard
          title="Applications Sent"
          value={applications.length}
          change="3 this week"
          changeType="neutral"
          icon={<FileText className="w-6 h-6" />}
          variant="amber"
          onClick={() => navigate("/talent/applications")}
          className="cursor-pointer"
        />
        <MetricCard
          title="Interviews Scheduled"
          value={applications.filter(a => a.status === "Interview Scheduled").length}
          change="+2 new"
          changeType="positive"
          icon={<Clock className="w-6 h-6" />}
          variant="success"
          onClick={() => navigate("/talent/interviews")}
          className="cursor-pointer"
        />
        <MetricCard
          title="Profile Strength"
          value="85%"
          icon={<Star className="w-6 h-6" />}
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
          <Button variant="ghost" className="group">
            View All Jobs
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        <div className="space-y-4">
          {topJobs.map((job) => (
            <JobCard
              key={job.id}
              {...job}
              onApply={() => handleApplyClick(job)}
              onSave={() => handleSave(job)}
              onView={() => handleViewJob(job)}
            />
          ))}
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
