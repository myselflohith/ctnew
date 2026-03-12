import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Database,
  Calendar,
  Building2,
  Settings,
  Search,
} from "lucide-react";
import { useEffect, useState, FormEvent } from "react";
import { apiClient } from "@/lib/api";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Database, label: "Resume Database", path: "/employer/resume-database" },
  { icon: Calendar, label: "Interviews", path: "/employer/interviews" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

interface ResumeCandidate {
  userId: string;
  personId: number;
  name: string;
  email: string;
  location: string | null;
  rankScore: number | null;
  scoreEdu?: number | null;
  scoreCompany?: number | null;
  latestCompany?: string | null;
  latestSchool?: string | null;
  matchScore?: number | null;
}

const EmployerResumeDatabase = () => {
  const [candidates, setCandidates] = useState<ResumeCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const loadDefault = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getEmployerResumeDatabase({
        minRank: 80,
        limit: 50,
      });
      if (response.success && Array.isArray(response.data)) {
        setCandidates(response.data as ResumeCandidate[]);
      } else {
        setCandidates([]);
      }
    } catch (error) {
      console.error("Error loading resume database:", error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefault();
  }, []);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      // Empty search resets to default ranked list
      loadDefault();
      return;
    }

    try {
      setSearching(true);
      const response = await apiClient.searchEmployerResumeDatabase({
        q,
        minRank: 80,
        minMatch: 80,
        limit: 200,
      });
      if (response.success && Array.isArray(response.data)) {
        setCandidates(response.data as ResumeCandidate[]);
      } else {
        setCandidates([]);
      }
    } catch (error) {
      console.error("Error searching resume database:", error);
      setCandidates([]);
    } finally {
      setSearching(false);
    }
  };

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <DashboardLayout
      role="employer"
      navItems={navItems}
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Resume Database
        </h1>
        <p className="text-muted-foreground">
          Browse and search top-ranked talent profiles by resume score and match.
        </p>
      </div>

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="flex flex-col md:flex-row gap-4 mb-8"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search candidates by skills, role, or keywords..."
            className="pl-12 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          variant="default"
          size="lg"
          disabled={searching}
        >
          {searching ? "Searching..." : "Search"}
        </Button>
      </form>

      {/* Candidates list */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Loading candidates...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            {hasSearch ? "No matching candidates found" : "No ranked candidates yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {hasSearch
              ? "Try a different search query or broaden your keywords."
              : "Candidates will appear here after they upload a resume and receive a rank score."}
          </p>
          {hasSearch && (
            <Button variant="outline" onClick={() => { setSearchQuery(""); loadDefault(); }}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-foreground">
              {hasSearch ? "Search results" : "Top ranked candidates"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Showing {candidates.length} candidate{candidates.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="space-y-4">
            {candidates.map((candidate) => (
              <div
                key={candidate.personId}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cardinal to-amber flex items-center justify-center text-white font-semibold shrink-0">
                    {candidate.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{candidate.name}</h3>
                    <p className="text-sm text-muted-foreground">{candidate.email}</p>
                    {candidate.location && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {candidate.location}
                      </p>
                    )}
                    {(candidate.latestCompany || candidate.latestSchool) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {candidate.latestCompany && (
                          <span>Latest company: {candidate.latestCompany}</span>
                        )}
                        {candidate.latestCompany && candidate.latestSchool && " • "}
                        {candidate.latestSchool && (
                          <span>Latest school: {candidate.latestSchool}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                  <div className="flex flex-wrap gap-2">
                    {candidate.matchScore != null && (
                      <Badge
                        variant={
                          candidate.matchScore >= 90
                            ? "excellent"
                            : candidate.matchScore >= 80
                            ? "good"
                            : "secondary"
                        }
                      >
                        Match {Math.round(candidate.matchScore)}%
                      </Badge>
                    )}
                    {candidate.rankScore != null && (
                      <Badge
                        variant={
                          candidate.rankScore >= 90
                            ? "excellent"
                            : candidate.rankScore >= 80
                            ? "good"
                            : "secondary"
                        }
                      >
                        Rank {Math.round(candidate.rankScore)}%
                      </Badge>
                    )}
                    {candidate.scoreEdu != null && (
                      <Badge variant="secondary">
                        Edu {Math.round(candidate.scoreEdu)}%
                      </Badge>
                    )}
                    {candidate.scoreCompany != null && (
                      <Badge variant="secondary">
                        Company {Math.round(candidate.scoreCompany)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EmployerResumeDatabase;

