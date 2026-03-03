import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { apiClient } from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    const run = async () => {
      setStatus("loading");
      try {
        const res = await apiClient.request<{ message?: string }>("/auth/verify-email?token=" + encodeURIComponent(token));
        setStatus("success");
        setMessage(res.message || "Your email has been verified. You can now log in.");
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || "We couldn't verify your email. The link may be invalid or expired.");
      }
    };

    void run();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Email Verification</h1>
        {status === "loading" && (
          <p className="text-sm text-muted-foreground">
            Verifying your email, please wait...
          </p>
        )}
        {status !== "loading" && (
          <p className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {message}
          </p>
        )}
        <div className="pt-2">
          <Link to="/auth" className="text-sm text-primary hover:underline font-medium">
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

