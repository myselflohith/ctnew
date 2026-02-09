import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  Search,
  Filter,
  Mail,
  Calendar,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import CandidateProfileModal from "@/components/employer/CandidateProfileModal";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Calendar, label: "Interviews", path: "/employer/interviews" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

interface Candidate {
  id: string;
  name: string;
  title: string;
  job: string;
  matchScore: number;
  rank: number;
  status: string;
  appliedAt: string;
  education?: string;
  experience?: string;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Interview Scheduled":
      return "excellent";
    case "Phone Screen":
      return "good";
    case "Under Review":
      return "secondary";
    case "New":
      return "outline";
    default:
      return "secondary";
  }
};

const EmployerCandidates = () => {
  const [searchParams] = useSearchParams();
  const jobIdFilter = searchParams.get("jobId");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    const fetchCandidates = async () => {
      const token = apiClient.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let applicationsResponse;
        
        // If jobId filter is provided, fetch applications for that specific job
        if (jobIdFilter) {
          applicationsResponse = await apiClient.getJobApplications(jobIdFilter).catch(() => ({ success: false, data: [] }));
        } else {
          // Otherwise, get all applications (employer view)
          applicationsResponse = await apiClient.getApplications().catch(() => ({ success: false, data: [] }));
        }
        
        if (applicationsResponse.success && applicationsResponse.data) {
          // Convert applications to candidates format
          const candidatesData = applicationsResponse.data.map((app: any, index: number) => ({
            id: app.id || app.application_id,
            userId: app.user_id,
            name: app.candidate_name || `Candidate ${index + 1}`,
            email: app.candidate_email,
            title: app.job?.title || "Unknown Position",
            job: app.job?.title || "Unknown",
            matchScore: app.job?.match_score || 0,
            rank: index + 1,
            status: app.status || "New",
            appliedAt: app.applied_at 
              ? formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })
              : "Recently",
            resumeId: app.resume_id,
            education: undefined, // Not available in current data
            experience: undefined, // Not available in current data
          }));
          
          setCandidates(candidatesData);
        } else {
          setCandidates([]);
        }
      } catch (error: any) {
        console.error("Error fetching candidates:", error);
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [jobIdFilter]);

  // Filter candidates based on search
  const filteredCandidates = candidates.filter((candidate) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      candidate.name.toLowerCase().includes(query) ||
      candidate.title.toLowerCase().includes(query) ||
      candidate.job.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout
      role="employer"
      navItems={navItems}
      userName="Jane Smith"
      companyName="TechCorp AI"
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Candidates
        </h1>
        <p className="text-muted-foreground">
          Review and manage applicants across all your jobs.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search candidates by name or skills..." 
            className="pl-12 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="lg">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Candidates List */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Loading candidates...</p>
        </div>
      ) : filteredCandidates.length > 0 ? (
        <div className="glass rounded-2xl p-6">
          <div className="space-y-4">
            {filteredCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cardinal to-amber flex items-center justify-center text-white font-semibold shrink-0">
                  {candidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{candidate.name}</h3>
                  <p className="text-sm text-muted-foreground">{candidate.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {candidate.experience} exp • {candidate.education}
                  </p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="text-sm">
                  <p className="text-muted-foreground">Applied for</p>
                  <p className="text-foreground font-medium">{candidate.job}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      candidate.matchScore >= 90
                        ? "excellent"
                        : candidate.matchScore >= 80
                        ? "good"
                        : "fair"
                    }
                  >
                    {candidate.matchScore}% Match
                  </Badge>
                  <span className="text-xs text-muted-foreground">Rank #{candidate.rank}</span>
                </div>
                <Badge variant={getStatusVariant(candidate.status)}>{candidate.status}</Badge>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Calendar className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setProfileModalOpen(true);
                    }}
                  >
                    View Profile
                  </Button>
                </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            {searchQuery ? 'No candidates found' : 'No candidates yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery 
              ? 'Try adjusting your search criteria.'
              : 'Candidates will appear here once they apply to your jobs.'}
          </p>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* Candidate Profile Modal */}
      {selectedCandidate && (
        <CandidateProfileModal
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          candidate={selectedCandidate}
        />
      )}
    </DashboardLayout>
  );
};

export default EmployerCandidates;
