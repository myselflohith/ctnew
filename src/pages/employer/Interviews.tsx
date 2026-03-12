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
  Calendar,
  Search,
  Mail,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { employerNavItems } from "@/components/layout/navItems";

const navItems = employerNavItems;

const EmployerInterviews = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviews = async () => {
      const token = apiClient.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await apiClient.getInterviews();

        if (response.success && response.data && Array.isArray(response.data)) {
          setInterviews(
            response.data.map((interview: any) => ({
              id: interview.id,
              title: interview.interview_title || `Interview #${interview.id}`,
              description: interview.interview_description || "",
              jobId: interview.job_id,
              type: interview.type_of_interview || "Practice",
              category: interview.interview_category || "General",
              questionType: interview.question_type || "",
              status: interview.status || "Pending",
              candidateCount:
                Number(interview.total_invites ?? interview.candidate_count ?? 0) || 0,
              completedCount:
                Number(
                  interview.completed_count_compat ??
                    interview.completed_count ??
                    0
                ) || 0,
              pendingCount: Number(interview.pending_count ?? 0) || 0,
              inProgressCount: Number(interview.in_progress_count ?? 0) || 0,
              partiallyCompletedCount:
                Number(interview.partially_completed_count ?? 0) || 0,
              createdAt: interview.created_at
                ? new Date(interview.created_at).toLocaleDateString()
                : "TBD",
            }))
          );
        } else {
          setInterviews([]);
        }
      } catch (error: any) {
        console.error("Error fetching interviews:", error);
        setInterviews([]);
      } finally {
        setLoading(false);
      }
    };

    if (apiClient.getToken()) {
      fetchInterviews();
    } else {
      setLoading(false);
    }
  }, []);



  // Filter interviews based on search query (client-side)
  const filteredInterviews = interviews.filter((interview) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      interview.title.toLowerCase().includes(query) ||
      interview.description.toLowerCase().includes(query) ||
      interview.category.toLowerCase().includes(query)
    );
  });

  const getStatusVariant = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return "good";
      case "partially completed":
      case "partially_completed":
        return "secondary";
      case "in progress":
      case "in_progress":
      case "started":
        return "excellent";
      case "pending":
        return "secondary";
      case "cancelled":
        return "closed";
      default:
        return "secondary";
    }
  };

  return (
    <DashboardLayout
      role="employer"
      navItems={navItems}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Interviews Scheduled
          </h1>
          <p className="text-muted-foreground">
            Manage interviews with candidates who applied to your jobs.
          </p>
        </div>
        <Button 
          onClick={() => navigate("/employer/interviews/setup")}
          className="h-12"
        >
          <Calendar className="w-5 h-5 mr-2" />
          Setup New Interview
        </Button>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-4 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search interviews by title, description, or category..."
            className="pl-12 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Interviews List */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Loading interviews...</p>
        </div>
      ) : filteredInterviews.length > 0 ? (
        <div className="glass rounded-2xl p-6">
          <div className="space-y-4">
            {filteredInterviews.map((interview) => (
              <div
                key={interview.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{interview.title}</h3>
                    <p className="text-sm text-muted-foreground">{interview.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{interview.type}</Badge>
                      </span>
                      <span>Job ID: {interview.jobId}</span>
                      <span>Category: {interview.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:items-end gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{interview.createdAt}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Candidates: {interview.candidateCount} | Completed:{" "}
                      {interview.completedCount} | Partially Completed:{" "}
                      {interview.partiallyCompletedCount}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/employer/interviews/${interview.id}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30"
                      onClick={() => navigate(`/employer/interviews/${interview.id}/invite`)}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Invite Candidates
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            {searchQuery ? "No interviews found" : "No interviews scheduled yet"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery 
              ? "Try adjusting your search criteria."
              : "Interviews will appear here once you schedule them with candidates."}
          </p>
          {searchQuery ? (
            <Button 
              variant="outline" 
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </Button>
          ) : (
            <Button variant="hero" onClick={() => navigate("/employer/candidates")}>
              View Candidates
            </Button>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default EmployerInterviews;
