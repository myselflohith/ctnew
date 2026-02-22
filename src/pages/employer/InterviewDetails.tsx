import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Mail, ChevronDown, X, CheckCircle2, AlertCircle } from "lucide-react";
import { interviewsAPI } from "@/lib/api/interviews";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { employerNavItems } from "@/components/layout/navItems";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  Calendar,
  User,
  Star,
} from "lucide-react";

const navItems = employerNavItems;

interface InvitedCandidate {
  id: string;
  candidate_name?: string;
  candidate_email?: string;
  name?: string;
  email?: string;
  status: string;
  created_at: string;
}

interface CandidateReport {
  inviteId: number;
  candidateName: string;
  candidateEmail: string;
  status: string;
  rating: string;
  score: any;
  aiFeedback: any;
}

export default function InterviewDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<any>(null);
  const [invitedCandidates, setInvitedCandidates] = useState<InvitedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidateReports, setCandidateReports] = useState<CandidateReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

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

  // Fetch candidate reports for this interview
  const fetchCandidateReports = async () => {
    if (!interview?.id) {
      console.log('⚠️ No interview ID, skipping report fetch');
      return;
    }
    
    try {
      setReportsLoading(true);
      const token = apiClient.getToken();
      if (!token) {
        setCandidateReports([]);
        return;
      }

      console.log('📡 Fetching reports for interview:', interview.id);

      // Use the dedicated interview-specific endpoint
      const url = `/api/interviews/employer/interview-reports/${interview.id}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Reports API Response:', data);
        
        if (data.success && Array.isArray(data.data)) {
          console.log(`📊 Fetched ${data.data.length} reports for interview ${interview.id}`);
          setCandidateReports(data.data);
        } else {
          console.warn('❌ Invalid reports response:', data);
          setCandidateReports([]);
        }
      } else {
        console.error("❌ Failed to fetch reports. Status:", response.status);
        const errorText = await response.text();
        console.error('Response:', errorText);
        setCandidateReports([]);
      }
    } catch (error: any) {
      console.error("❌ Error fetching candidate reports:", error);
      setCandidateReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "excellent":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "good":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "average":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "poor":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "practice":
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case "excellent":
        return "⭐";
      case "good":
        return "✅";
      case "average":
        return "⚠️";
      case "poor":
        return "❌";
      case "practice":
        return "📝";
      default:
        return "•";
    }
  };

  // Load reports when interview is loaded
  useEffect(() => {
    console.log('🔄 Checking if should load reports. Interview ID:', interview?.id);
    if (interview?.id) {
      fetchCandidateReports();
    }
  }, [interview?.id]);

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

      {/* Invited Candidates & Reports */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Candidates ({invitedCandidates.length})
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
            {invitedCandidates.map((candidate) => {
              // Find matching report for this candidate using improved matching
              const candidateName = (candidate.candidate_name || candidate.name || '').toLowerCase().trim();
              const candidateEmail = (candidate.candidate_email || candidate.email || '').toLowerCase().trim();
              
              const report = candidateReports.find((r) => {
                // Primary match: inviteId (most reliable)
                if (r.inviteId && candidate.id && r.inviteId.toString() === candidate.id.toString()) {
                  return true;
                }

                // Fallback match: name/email (legacy)
                const reportName = (r.candidateName || '').toLowerCase().trim();
                const reportEmail = (r.candidateEmail || '').toLowerCase().trim();
                return (reportName === candidateName && candidateName) || (reportEmail === candidateEmail && candidateEmail);
              });

              // Debug logging
              if (report) {
                console.log(`📋 Candidate: ${candidateName}, Invite Status: ${candidate.status}, Report Status: ${report.status}`, { candidate, report });
              }

              // Use invite status as source of truth, but if a report exists we should treat it as completed.
              // This prevents UI from showing "Pending" when the report row exists but invite status is stale.
              const inviteStatus =
                candidate.status === 'Completed' || report
                  ? 'Completed'
                  : candidate.status || 'Pending';

              return (
                <div key={candidate.id} className="border border-slate-700 rounded-lg overflow-hidden">
                  {/* Candidate Card */}
                  <div className="p-4 bg-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {candidate.candidate_name || candidate.name || "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {candidate.candidate_email || candidate.email || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Status Badge */}
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 border text-xs font-semibold">
                        ✅ Completed
                      </Badge>

                      {/* Report Details - Show for any Completed status */}
                      {report && inviteStatus === "Completed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                            onClick={() => navigate(`/employer/interviews/${interview.id}/candidate-report/${report.inviteId}`)}
                          >
                            View Report
                          </Button>
                        </>
                      )}

                      <span className="text-xs text-muted-foreground">
                        {candidate.created_at
                          ? new Date(candidate.created_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
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
