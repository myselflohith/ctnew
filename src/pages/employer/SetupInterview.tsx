import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Database,
  Building2,
  Settings,
  Calendar,
  ArrowLeft,
  Zap,
  Users2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AIInterviewSetup from "@/components/employer/AIInterviewSetup";
import HumanInterviewSetup from "@/components/employer/HumanInterviewSetup";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Database, label: "Resume Database", path: "/employer/resume-database" },
  { icon: Calendar, label: "Interviews", path: "/employer/interviews" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

type InterviewType = "ai" | "human" | null;

const SetupInterview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedType, setSelectedType] = useState<InterviewType>(null);

  // If coming from Candidates -> Invite -> AI -> Create New
  // we force AI selection and prefill candidates via localStorage.
  useEffect(() => {
    const type = (searchParams.get("type") || "").toLowerCase();
    const prefill = searchParams.get("prefill");

    if (type === "ai") {
      setSelectedType("ai");
    } else if (type === "human") {
      setSelectedType("human");
    }

    if (prefill === "1") {
      // no-op: AIInterviewSetup / CandidateInvite will read from localStorage
      // key: prefillInterviewCandidates
    }
  }, [searchParams]);

  const handleBackClick = () => {
    if (selectedType) {
      setSelectedType(null);
    } else {
      navigate("/employer/interviews");
    }
  };

  return (
    <DashboardLayout
      role="employer"
      navItems={navItems}
      userName="Jane Smith"
      companyName="TechCorp AI"
    >
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBackClick}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {selectedType ? "Setup Interview" : "Setup New Interview"}
          </h1>
          <p className="text-muted-foreground">
            {selectedType 
              ? selectedType === "ai" 
                ? "Configure your AI-powered interview"
                : "Schedule a human-conducted interview"
              : "Choose the type of interview you want to set up"}
          </p>
        </div>
      </div>

      {!selectedType ? (
        // Interview Type Selection
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Interview Card */}
          <div
            onClick={() => setSelectedType("ai")}
            className="glass rounded-2xl p-8 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 group"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-blue-500" />
              </div>
              <div className="px-3 py-1 bg-blue-500/10 rounded-full">
                <span className="text-xs font-semibold text-blue-600">Recommended</span>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-foreground mb-3">
              AI Interview
            </h3>

            <p className="text-muted-foreground mb-6">
              Automated video interviews powered by AI. Great for initial screening
              and reducing time-to-hire.
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Auto-evaluated responses</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Customizable questions</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Real-time analysis</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Candidate reports</span>
              </div>
            </div>

            <Button className="w-full" size="lg">
              Get Started
            </Button>
          </div>

          {/* Human Interview Card */}
          <div
            onClick={() => setSelectedType("human")}
            className="glass rounded-2xl p-8 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 group"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users2 className="w-8 h-8 text-emerald-500" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-foreground mb-3">
              Human Interview
            </h3>

            <p className="text-muted-foreground mb-6">
              Schedule interviews with your team members. Perfect for final rounds
              and detailed assessments.
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">Live interviews</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">Team scheduling</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">Video/Phone options</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">Interview notes</span>
              </div>
            </div>

            <Button variant="outline" size="lg" className="w-full">
              Get Started
            </Button>
          </div>
        </div>
      ) : selectedType === "ai" ? (
        <AIInterviewSetup
          onBack={() => navigate("/employer/interviews")}
          onCreated={(interviewId) => {
            // If this AI interview was created as part of "Invite from Candidates",
            // immediately route to the invite screen.
            const hasPrefill = !!localStorage.getItem("prefillInterviewCandidates");
            if (hasPrefill) {
              navigate(`/employer/interviews/${interviewId}/invite`);
              return;
            }
            navigate("/employer/interviews");
          }}
        />
      ) : (
        <HumanInterviewSetup onBack={() => navigate("/employer/interviews")} />
      )}
    </DashboardLayout>
  );
};

export default SetupInterview;
