import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import JobCard from "@/components/dashboard/JobCard";
import ApplyModal from "@/components/talent/ApplyModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJobs } from "@/contexts/JobsContext";
import { toast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent/dashboard" },
  { icon: Search, label: "Find Jobs", path: "/talent/jobs" },
  { icon: FileText, label: "Applications", path: "/talent/applications" },
  { icon: Heart, label: "Saved Jobs", path: "/talent/saved" },
  { icon: Settings, label: "Settings", path: "/talent/settings" },
];

const TalentDashboard = () => {
  const navigate = useNavigate();
  const { availableJobs, saveJob, applyToJob } = useJobs();
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<typeof availableJobs[0] | null>(null);

  const topJobs = availableJobs.slice(0, 3);

  const handleApplyClick = (job: typeof availableJobs[0]) => {
    setSelectedJobForApply(job);
    setApplyModalOpen(true);
  };

  const handleApplyWithResume = (resumeId: string) => {
    if (selectedJobForApply) {
      applyToJob(selectedJobForApply);
      toast.success(`Applied to ${selectedJobForApply.title} at ${selectedJobForApply.company}`);
      setSelectedJobForApply(null);
    }
  };

  const handleSave = (job: typeof availableJobs[0]) => {
    saveJob(job);
    toast.success(`Saved ${job.title}`);
    navigate("/talent/saved");
  };
  return (
    <DashboardLayout role="talent" navItems={navItems} userName="John Doe">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Welcome back, John! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your job search.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Quick Actions
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer">
              <FileText className="w-4 h-4 mr-2 text-primary" />
              Update Resume
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Search className="w-4 h-4 mr-2 text-amber" />
              Browse Jobs
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Star className="w-4 h-4 mr-2 text-gold" />
              Upgrade to Premium
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
          value={8}
          change="3 this week"
          changeType="neutral"
          icon={<FileText className="w-6 h-6" />}
          variant="amber"
        />
        <MetricCard
          title="Interviews Scheduled"
          value={3}
          change="+2 new"
          changeType="positive"
          icon={<Clock className="w-6 h-6" />}
          variant="success"
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
              onView={() => console.log("View", job.id)}
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

    </DashboardLayout>
  );
};

export default TalentDashboard;
