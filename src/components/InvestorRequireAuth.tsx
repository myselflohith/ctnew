import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";

/**
 * Wraps investor dashboard content. Only logged-in users with role "investor" can access.
 * Others are redirected to sign in or their appropriate dashboard.
 */
export default function InvestorRequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          navigate("/auth/investor", { replace: true });
          return;
        }
        if (user.role !== "investor") {
          const dashboardByRole: Record<string, string> = {
            talent: "/talent/dashboard",
            employer: "/employer/dashboard",
            recruiter: "/recruiter/dashboard",
            admin: "/admin/dashboard",
          };
          navigate(dashboardByRole[user.role] ?? "/", { replace: true });
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) navigate("/auth/investor", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
