import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import InvestorsNavbar from "@/components/investors/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Briefcase, MapPin, DollarSign, Clock } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import type { InvestorsTabKey } from "@/components/investors/Navbar";

type JobRow = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary?: string;
  posted_at: string;
  description?: string;
  status?: string;
};

const OrganizationJobs = () => {
  const { companyName } = useParams<{ companyName: string }>();
  const navigate = useNavigate();
  const decodedName = companyName ? decodeURIComponent(companyName) : "";
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setActiveTab = (tab: InvestorsTabKey) => {
    navigate("/investors", { state: { tab } });
  };

  useEffect(() => {
    if (!decodedName) {
      setLoading(false);
      setError("Company name is missing.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .getJobsByCompany(decodedName)
      .then((res) => {
        if (cancelled) return;
        setJobs((res.data ?? []) as JobRow[]);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load jobs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [decodedName]);

  const handleBack = () => {
    navigate("/investors", { state: { tab: "startups" as InvestorsTabKey } });
  };

  return (
    <div className="min-h-screen bg-background">
      <InvestorsNavbar activeTab="startups" setActiveTab={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 pt-6 pb-12">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Startups
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">{decodedName}</h1>
          <p className="text-muted-foreground mt-1">Open roles at this organization</p>
        </div>

        {loading ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        ) : error ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <p className="text-muted-foreground">No open jobs at this organization.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{job.title}</h3>
                      {job.status && (
                        <Badge variant={job.status === "active" ? "default" : "secondary"}>
                          {job.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 shrink-0" />
                          {job.location}
                        </span>
                      )}
                      {job.type && <span>{job.type}</span>}
                      {job.salary && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 shrink-0" />
                          {job.salary}
                        </span>
                      )}
                      {job.posted_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 shrink-0" />
                          {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {job.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrganizationJobs;
