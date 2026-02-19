import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";

/**
 * Wraps employer dashboard content. If current user is employer and has no organization_id,
 * redirects to /employer/set-company so they can enter their company first.
 */
export default function EmployerRequireCompany({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient.getCurrentUser().then((res) => {
      if (cancelled) return;
      if (!res.success || !res.user) {
        setReady(true);
        return;
      }
      const u = res.user as { role?: string; organization_id?: string | null };
      if (u.role === "employer" && (u.organization_id == null || u.organization_id === "")) {
        navigate("/employer/set-company", { replace: true });
        return;
      }
      setReady(true);
    }).catch(() => setReady(true));
    return () => { cancelled = true; };
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
