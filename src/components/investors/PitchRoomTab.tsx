import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, DollarSign, Clock, Building2, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

type JobWithOrg = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary?: string;
  posted_at: string;
  description?: string;
  status?: string;
  organization_id?: string | null;
  organization_name?: string | null;
};

const PitchRoomTab = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .getPitchRoomJobs()
      .then((res) => {
        if (cancelled) return;
        setJobs((res.data ?? []) as JobWithOrg[]);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load jobs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Group jobs by organization (use organization_name when present, else company)
  const byOrg = jobs.reduce<Record<string, JobWithOrg[]>>((acc, job) => {
    const key = (job.organization_name ?? job.company ?? "Other").trim() || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(job);
    return acc;
  }, {});
  const orgNames = Object.keys(byOrg).sort();

  const goToOrganization = (companyName: string) => {
    navigate(`/investors/startups/${encodeURIComponent(companyName)}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Loading pitch room jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (orgNames.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎤</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Pitch Room</h2>
        <p className="text-muted-foreground mb-6">
          No open roles from approved organizations yet. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Pitch Room</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Open roles at approved startups, grouped by organization.
        </p>
      </div>

      <div className="space-y-8">
        {orgNames.map((orgName) => {
          const orgJobs = byOrg[orgName];
          return (
            <div
              key={orgName}
              className="bg-card rounded-lg border border-border overflow-hidden"
            >
              <button
                type="button"
                onClick={() => goToOrganization(orgName)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 border-b border-border hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{orgName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {orgJobs.length} open role{orgJobs.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>

              <ul className="divide-y divide-border">
                {orgJobs.map((job) => (
                  <li key={job.id}>
                    <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{job.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {job.location}
                            </span>
                          )}
                          {job.type && <span>{job.type}</span>}
                          {job.salary && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5" />
                              {job.salary}
                            </span>
                          )}
                          {job.posted_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => goToOrganization(orgName)}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                      >
                        View all roles
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PitchRoomTab;
