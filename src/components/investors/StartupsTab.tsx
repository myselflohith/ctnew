import { useState, useEffect, useRef } from "react";
import { DollarSign, Briefcase, MapPin, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

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
  organization_name?: string;
};

type StartupRow = { name: string; description?: string; sector?: string; stage?: string; raised?: string; location?: string };

const StartupsTab = () => {
  const [startups, setStartups] = useState<StartupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [jobsByCompany, setJobsByCompany] = useState<Record<string, { jobs: JobRow[]; loading: boolean; error: string | null }>>({});
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchJobsForCompany = (companyName: string) => {
    if (jobsByCompany[companyName] !== undefined) return; // already loaded or loading
    setJobsByCompany((prev) => ({ ...prev, [companyName]: { jobs: [], loading: true, error: null } }));
    apiClient
      .getJobsByCompany(companyName)
      .then((res) => {
        setJobsByCompany((prev) => ({
          ...prev,
          [companyName]: { jobs: (res.data ?? []) as JobRow[], loading: false, error: null },
        }));
      })
      .catch((err) => {
        setJobsByCompany((prev) => ({
          ...prev,
          [companyName]: { jobs: [], loading: false, error: err?.message ?? "Failed to load jobs" },
        }));
      });
  };

  // When user expands an accordion, fetch jobs for that company if not loaded
  useEffect(() => {
    expandedCompanies.forEach((c) => {
      if (jobsByCompany[c] === undefined) fetchJobsForCompany(c);
    });
  }, [expandedCompanies]);

  // When user types in search, query DB and open accordions; when search is cleared, close all and clear results
  useEffect(() => {
    const query = jobSearchQuery.trim();
    if (query.length < 2) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
      setExpandedCompanies([]);
      setJobsByCompany({});
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchTimeoutRef.current = null;
      apiClient
        .searchJobsInStartups(query)
        .then((res) => {
          const jobs = (res.data ?? []) as JobRow[];
          const byCompany: Record<string, JobRow[]> = {};
          jobs.forEach((job) => {
            const company = (job.organization_name ?? job.company)?.trim() || job.company?.trim() || "Unknown";
            if (!byCompany[company]) byCompany[company] = [];
            byCompany[company].push(job);
          });
          const companiesWithMatches = Object.keys(byCompany);
          setJobsByCompany((prev) => {
            const next = { ...prev };
            companiesWithMatches.forEach((company) => {
              next[company] = { jobs: byCompany[company], loading: false, error: null };
            });
            return next;
          });
          // Only keep accordions open for companies that have matching jobs; close the rest
          setExpandedCompanies(companiesWithMatches);
        })
        .catch(() => {});
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [jobSearchQuery]);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">Startups</h2>
            <p className="text-sm text-muted-foreground">{startups.length} startup{startups.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="relative max-w-xs w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search jobs..."
              value={jobSearchQuery}
              onChange={(e) => setJobSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {startups.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <p className="text-muted-foreground">No approved startups yet.</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Accordion
              type="multiple"
              value={expandedCompanies}
              onValueChange={(value) => setExpandedCompanies(value)}
              className="w-full"
            >
              {startups.map((s, i) => (
                <AccordionItem key={s.name} value={s.name} className="border-border px-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AccordionTrigger className="hover:no-underline py-4 [&[data-state=open]>svg]:rotate-180">
                        <div className="flex items-center gap-3 text-left">
                          <div className={`w-9 h-9 rounded-md bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0`}>
                            {s.name.substring(0, 2)}
                          </div>
                          <span className="font-semibold text-foreground">{s.name}</span>
                          {s.sector != null && s.sector !== "" && (
                            <span className="text-sm text-muted-foreground hidden sm:inline">· {s.sector}</span>
                          )}
                        </div>
                      </AccordionTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>{s.description ?? s.name}</p>
                    </TooltipContent>
                  </Tooltip>
                  <AccordionContent className="pt-0 pb-4">
                    <CompanyJobsContent
                      companyName={s.name}
                      jobsByCompany={jobsByCompany}
                      jobSearchQuery={jobSearchQuery.trim()}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

function matchJobSearch(job: JobRow, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const title = (job.title ?? "").toLowerCase();
  const company = (job.company ?? "").toLowerCase();
  const description = (job.description ?? "").toLowerCase();
  const location = (job.location ?? "").toLowerCase();
  return title.includes(q) || company.includes(q) || description.includes(q) || location.includes(q);
}

function CompanyJobsContent({
  companyName,
  jobsByCompany,
  jobSearchQuery,
}: {
  companyName: string;
  jobsByCompany: Record<string, { jobs: JobRow[]; loading: boolean; error: string | null }>;
  jobSearchQuery: string;
}) {
  const state = jobsByCompany[companyName];
  if (state === undefined) {
    return null;
  }
  if (state.loading) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">Loading jobs...</p>
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-destructive">{state.error}</p>
      </div>
    );
  }
  const filteredJobs = jobSearchQuery ? state.jobs.filter((job) => matchJobSearch(job, jobSearchQuery)) : state.jobs;
  if (filteredJobs.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">
          {state.jobs.length === 0
            ? "No open jobs at this organization."
            : "No jobs match your search."}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3 pl-1">
      {filteredJobs.map((job) => (
        <div
          key={job.id}
          className="rounded-lg border border-border bg-muted/30 p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground text-sm">{job.title}</h3>
                {job.status && (
                  <Badge variant={job.status === "active" ? "default" : "secondary"} className="text-xs">
                    {job.status}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {job.location}
                  </span>
                )}
                {job.type && <span>{job.type}</span>}
                {job.salary && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                    {job.salary}
                  </span>
                )}
                {job.posted_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              {job.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StartupsTab;
