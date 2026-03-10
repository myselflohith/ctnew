import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const InterviewThankYou = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;

  const interviewTitle =
    location?.state?.interviewTitle ||
    location?.state?.interviewData?.interview_title ||
    "Interview";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-3xl mx-auto w-full">
        <Card className="p-10 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Interview Complete!
          </h1>
          <p className="text-muted-foreground mb-8">
            Thanks for giving the interview. Your responses have been submitted successfully.
          </p>

          <div className="flex justify-center">
            <Button
              onClick={() => navigate("/talent/interviews")}
              className="bg-cardinal hover:bg-cardinal/90 text-white transition-colors"
            >
              Done
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InterviewThankYou;
