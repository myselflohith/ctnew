import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type GateReason = "auth_required" | "expired" | "forbidden" | "not_found";

const reasonCopy: Record<
  GateReason,
  { title: string; description: string; showAuthButtons: boolean }
> = {
  auth_required: {
    title: "Account required",
    description: "You need to login or create an account to start this interview.",
    showAuthButtons: true,
  },
  expired: {
    title: "Interview link expired",
    description:
      "This interview link has expired or was already used. Please request a new link from the employer.",
    showAuthButtons: false,
  },
  forbidden: {
    title: "Unable to Access Interview",
    description: "This interview link is not assigned to your account.",
    showAuthButtons: true,
  },
  not_found: {
    title: "Unable to Access Interview",
    description:
      "Interview invitation not found or has expired. Please check your email link and try again.",
    showAuthButtons: false,
  },
};

const InterviewAccessGate = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reason = (searchParams.get("reason") || "auth_required") as GateReason;
  const copy = reasonCopy[reason] || reasonCopy.auth_required;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-secondary border border-border rounded-2xl p-8 max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-cardinal" />
        </div>

        <h2 className="text-2xl font-bold text-foreground">{copy.title}</h2>
        <p className="text-muted-foreground">{copy.description}</p>

        {copy.showAuthButtons && (
          <Button
            onClick={() => navigate(`/auth?mode=signup&role=talent&redirect=/interview/${token}`)}
            className="w-full bg-cardinal hover:bg-cardinal/90 text-white"
          >
            Sign up
          </Button>
        )}

        {!copy.showAuthButtons && (
          <Button
            onClick={() => navigate("/talent/interviews")}
            className="w-full bg-cardinal text-white hover:bg-cardinal/90"
          >
            Return to Home
          </Button>
        )}
      </div>
    </div>
  );
};

export default InterviewAccessGate;
