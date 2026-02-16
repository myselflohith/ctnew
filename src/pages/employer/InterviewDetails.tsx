import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Mail } from "lucide-react";
import { interviewsAPI } from "@/lib/api/interviews";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  Calendar,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Calendar, label: "Interviews", path: "/employer/interviews" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

interface InvitedCandidate {
  id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  created_at: string;
}

export default function InterviewDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<any>(null);
  const [invitedCandidates, setInvitedCandidates] = useState<InvitedCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviewData = async () => {
      if (!id) return;
      try {
        // Fetch interview details (includes invites)
        const data = await interviewsAPI.getInterviewDetail(id);
        if (data && (data.interview || data.data)) {
          const interviewData = data.interview || data.data;
          setInterview(interviewData);
          
          // Extract invites from interview data
          if (interviewData && interviewData.invites && Array.isArray(interviewData.invites)) {
            setInvitedCandidates(interviewData.invites);
          } else {
            setInvitedCandidates([]);
          }
        } else {
          setInterview(data);
          if (data && data.invites && Array.isArray(data.invites)) {
            setInvitedCandidates(data.invites);
          }
        }
      } catch (error) {
        console.error("Failed to fetch interview:", error);
        toast.error("Failed to load interview details");
        navigate("/employer/interviews");
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewData();
  }, [id, navigate]);

  if (loading) {
    return (
      <DashboardLayout
        role="employer"
        navItems={navItems}
        userName="Jane Smith"
        companyName="TechCorp AI"
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!interview) {
    return (
      <DashboardLayout
        role="employer"
        navItems={navItems}
        userName="Jane Smith"
        companyName="TechCorp AI"
      >
        <div>
          <Button
            variant="outline"
            className="mb-6"
            onClick={() => navigate("/employer/interviews")}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center text-destructive">
            <p>Interview not found</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role="employer"
      navItems={navItems}
      userName="Jane Smith"
      companyName="TechCorp AI"
    >
      <div className="mb-8">
        <Button
          variant="outline"
          className="mb-6"
          onClick={() => navigate("/employer/interviews")}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {interview.interview_title || `Interview #${interview.id}`}
          </h1>
          <p className="text-muted-foreground">
            View interview details and invited candidates
          </p>
        </div>
      </div>

      {/* Interview Details Card */}
      <div className="glass rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Interview Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Interview Type</p>
            <p className="font-medium text-foreground">{interview.type_of_interview || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Category</p>
            <p className="font-medium text-foreground">{interview.interview_category || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium text-foreground capitalize">{interview.status || "pending"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium text-foreground">
              {interview.created_at
                ? new Date(interview.created_at).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>

        {interview.interview_description && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="font-medium text-foreground">{interview.interview_description}</p>
          </div>
        )}
      </div>

      {/* Invited Candidates */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Invited Candidates ({invitedCandidates.length})
          </h2>
          <Button 
            onClick={() => navigate(`/employer/interviews/${interview.id}/invite`)}
            className="h-10"
          >
            <Mail className="w-4 h-4 mr-2" />
            Invite More Candidates
          </Button>
        </div>

        {invitedCandidates.length > 0 ? (
          <div className="space-y-3">
            {invitedCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {candidate.candidate_name || candidate.name || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {candidate.candidate_email || candidate.email || "N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary capitalize">
                    {candidate.status || "pending"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {candidate.created_at
                      ? new Date(candidate.created_at).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No candidates invited yet</p>
            <Button 
              onClick={() => navigate(`/employer/interviews/${interview.id}/invite`)}
            >
              <Mail className="w-4 h-4 mr-2" />
              Invite Your First Candidate
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
