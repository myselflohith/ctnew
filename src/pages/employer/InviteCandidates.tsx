import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import CandidateInvite from "@/components/employer/CandidateInvite";
import { interviewsAPI } from "@/lib/api/interviews";
import { toast } from "sonner";

export default function InviteCandidates() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterview = async () => {
      if (!id) return;
      try {
        const data = await interviewsAPI.getInterviewDetail(id);
        if (data && (data.interview || data.data)) {
          setInterview(data.interview || data.data);
        } else {
          setInterview(data);
        }
      } catch (error) {
        console.error("Failed to fetch interview:", error);
        toast.error("Failed to load interview details");
        navigate("/employer/interviews");
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="outline"
            className="mb-6"
            onClick={() => navigate("/employer/interviews")}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center text-red-400">
            <p>Interview not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="outline"
              className="mb-4"
              onClick={() => navigate("/employer/interviews")}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {interview.interview_title || `Interview #${interview.id}`}
              </h1>
              <p className="text-gray-400 mt-2">
                Invite candidates to participate in this interview
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
          <CandidateInvite 
            interviewId={interview.id}
            interviewTitle={interview.interview_title || `Interview #${interview.id}`}
            onBack={() => navigate("/employer/interviews")}
            onSuccess={() => {
              toast.success("Candidates invited successfully");
              setTimeout(() => navigate("/employer/interviews"), 1500);
            }}
          />
        </div>
      </div>
    </div>
  );
}
