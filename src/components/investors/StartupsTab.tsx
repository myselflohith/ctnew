import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Users, DollarSign, LayoutGrid, List } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api";

const gradients = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-500",
  "from-green-500 to-emerald-600",
  "from-rose-500 to-red-600",
  "from-amber-500 to-orange-500",
  "from-cyan-500 to-blue-500",
  "from-teal-500 to-green-500",
  "from-indigo-500 to-purple-600",
  "from-pink-500 to-rose-500",
  "from-yellow-500 to-amber-600",
];

type ViewMode = "list" | "grid";

type StartupRow = { name: string; description?: string; sector?: string; stage?: string; raised?: string; location?: string };

const StartupsTab = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("list");
  const [startups, setStartups] = useState<StartupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goToOrganizationJobs = (companyName: string) => {
    navigate(`/investors/startups/${encodeURIComponent(companyName)}`);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .getApprovedOrganizationNames()
      .then((res) => {
        if (cancelled) return;
        const list = (res.data ?? [])
          .filter((row): row is { name: string } => row.name != null && String(row.name).trim() !== "")
          .map((row) => ({ name: String(row.name).trim() }));
        setStartups(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load startups");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading startups...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Startups</h2>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">{startups.length} startup{startups.length !== 1 ? "s" : ""}</p>
            <div className="flex items-center bg-muted rounded-md p-0.5">
              <button
                onClick={() => setView("list")}
                className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded transition-colors ${view === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {startups.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <p className="text-muted-foreground">No approved startups yet.</p>
          </div>
        ) : view === "list" ? (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Company</span>
              <span>Sector</span>
              <span>Stage</span>
              <span>Raised</span>
              <span>Location</span>
            </div>
            {startups.map((s, i) => (
              <Tooltip key={s.name}>
                <TooltipTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => goToOrganizationJobs(s.name)}
                    onKeyDown={(e) => e.key === "Enter" && goToOrganizationJobs(s.name)}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3.5 items-center border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0`}>
                        {s.name.substring(0, 2)}
                      </div>
                      <span className="font-medium text-foreground text-sm">{s.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{s.sector ?? "—"}</span>
                    <span className="text-sm text-muted-foreground">{s.stage ?? "—"}</span>
                    <span className="text-sm text-muted-foreground">{s.raised ?? "—"}</span>
                    <span className="text-sm text-muted-foreground">{s.location ?? "—"}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>{s.description ?? s.name}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {startups.map((s, i) => (
              <div
                key={s.name}
                className="bg-card rounded-lg border border-border p-5 flex flex-col hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-primary-foreground font-bold text-sm`}>
                    {s.name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{s.sector ?? "—"}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">{s.description ?? ""}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {s.stage ?? "—"}</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {s.raised ?? "—"}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.location ?? "—"}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => goToOrganizationJobs(s.name)}
                    className="flex-1 bg-primary text-primary-foreground text-sm font-medium py-1.5 rounded-md hover:opacity-90 transition-opacity"
                  >
                    View Profile
                  </button>
                  <button className="flex-1 border border-border text-foreground text-sm font-medium py-1.5 rounded-md hover:bg-muted transition-colors">
                    Request Intro
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default StartupsTab;
