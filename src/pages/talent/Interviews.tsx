import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Calendar,
  MapPin,
  Video,
  Phone,
  Play,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useJobs } from "@/contexts/JobsContext";
import { apiClient } from "@/lib/api";
import { StartInterviewModal, type CandidateInfo } from "@/components/interview/StartInterviewModal";


const TalentInterviews = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "pending" | "completed">("pending");
  const [interviews, setInterviews] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const { applications } = useJobs();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);

  useEffect(() => {
    const fetchInterviews = async () => {
      const token = apiClient.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch scheduled interviews for talent
        // NOTE: /interviews/list is the employer endpoint. Talent must use /interviews/talent/scheduled.
        const response = await apiClient.request('/interviews/talent/scheduled');
        const interviewList = (response?.data || []) as any[];
        if (Array.isArray(interviewList) && interviewList.length > 0) {
          setInterviews(interviewList.map((interview: any) => {
            const createdAtRaw = interview.invite_created_at
              ? Number(new Date(interview.invite_created_at).getTime())
              : 0;

            return {
              id: interview.id,
              inviteId: interview.invite_id,
              jobTitle: interview.job_title || interview.interview_title || "Interview",
              company: interview.company || "Company",
              location: interview.location || "Remote",
              interviewType: interview.type_of_interview || "Practice",
              scheduledDate: interview.invite_created_at
                ? new Date(interview.invite_created_at).toLocaleDateString()
                : "TBD",
              inviteStatus: interview.invite_status || "Pending",
              // Treat as completed only when invite status is actually Completed.
              // Previously this used `interview.completed > 0` (report_count), which is also true for partial reports.
              completed: String(interview.invite_status || "").toLowerCase() === "completed",
              createdAtRaw,
              uniqueLink: interview.unique_interview_link,
              interviewTitle: interview.interview_title,
              interviewCategory: interview.interview_category || "General",
              candidateEmail: interview.candidate_email,
              candidateName: interview.candidate_name,
              phoneNum: interview.phone_num,
              answeredCount: Number(interview.answered_count ?? 0),
              totalQuestions: Number(interview.total_questions ?? 0),
              completionPercentage: Number(interview.completion_percentage ?? 0),
            };
          }));
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

  // Filter interviews based on toggle + search query
  const filteredInterviews = interviews
    .filter((interview) => {
      if (filterMode === "all") return true;
      const status = String(interview.inviteStatus || "").toLowerCase();
      if (filterMode === "pending") return status === "pending";
      if (filterMode === "completed") return status === "completed";
      return true;
    })
    .filter((interview) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        interview.jobTitle.toLowerCase().includes(query) ||
        interview.company.toLowerCase().includes(query) ||
        interview.location.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const aTime = Number(a?.createdAtRaw ?? 0);
      const bTime = Number(b?.createdAtRaw ?? 0);
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });


  const getInterviewIcon = (type: string) => {
    switch (type) {
      case "Video":
        return <Video className="w-4 h-4" />;
      case "Phone":
        return <Phone className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };


  const handleStartInterviewClick = (interview: any) => {
    setSelectedInterview(interview);
    setIsModalOpen(true);
  };

  const handleStartInterview = (candidateInfo: CandidateInfo) => {
    // Navigate to interview session using token
    navigate(`/interview/${selectedInterview.uniqueLink}`, {
      state: {
        candidateInfo,
        interviewData: selectedInterview,
      },
    });
  };

  return (
    <DashboardLayout role="talent">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Interviews Scheduled
        </h1>
        <p className="text-muted-foreground">
          Manage your upcoming interviews and prepare for success.
        </p>
      </div>

      {/* Filter Toggle + Search */}
      <div className="glass rounded-2xl p-4 mb-8 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={filterMode === "pending" ? "hero" : "outline"}
            size="sm"
            onClick={() => setFilterMode("pending")}
          >
            Scheduled Interviews
          </Button>
          <Button
            type="button"
            variant={filterMode === "completed" ? "hero" : "outline"}
            size="sm"
            onClick={() => setFilterMode("completed")}
          >
            Completed Interviews
          </Button>
          <Button
            type="button"
            variant={filterMode === "all" ? "hero" : "outline"}
            size="sm"
            onClick={() => setFilterMode("all")}
          >
            All Interviews
          </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort</span>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search interviews by job title or company..."
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
                key={interview.inviteId}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{interview.jobTitle}</h3>
                    <p className="text-sm text-muted-foreground">{interview.company}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {interview.location}
                      </span>
                      <span className="flex items-center gap-1">
                        {getInterviewIcon(interview.interviewType)}
                        {interview.interviewType || "Practice Interview"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:items-end gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {interview.scheduledDate !== "TBD" ? interview.scheduledDate : "Date TBD"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {interview.interviewTitle || "Practice Interview"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Status */}
                    {String(interview.inviteStatus || "").toLowerCase() === "completed" && (
                      <Badge className="bg-green-600">Completed</Badge>
                    )}
                    {String(interview.inviteStatus || "").toLowerCase() === "partially completed" && (
                      <Badge variant="secondary">Partially Completed</Badge>
                    )}
                    {String(interview.inviteStatus || "").toLowerCase() === "in progress" && (
                      <Badge className="bg-blue-600">In Progress</Badge>
                    )}
                    {String(interview.inviteStatus || "").toLowerCase() === "pending" && (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    {!["completed", "partially completed", "in progress", "pending"].includes(
                      String(interview.inviteStatus || "").toLowerCase()
                    ) && <Badge variant="outline">{interview.inviteStatus || "Pending"}</Badge>}

                    {/* Action: Only allow taking interview while status is still Pending. */}
                    {String(interview.inviteStatus || "").toLowerCase() === "pending" && (
                      <Button
                        size="sm"
                        variant="hero"
                        onClick={() => handleStartInterviewClick(interview)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Take Interview
                      </Button>
                    )}
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
            {searchQuery ? 'No interviews found' : 'No interviews scheduled yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery 
              ? 'Try adjusting your search criteria.'
              : "Keep applying to jobs and you'll see your scheduled interviews here."}
          </p>
          {searchQuery ? (
            <Button 
              variant="outline" 
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </Button>
          ) : (
            <Button variant="hero" onClick={() => navigate("/talent/jobs")}>
              Find Jobs
            </Button>
          )}
        </div>
      )}

      {/* Start Interview Modal */}
      {selectedInterview && (
        <StartInterviewModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          onStartInterview={handleStartInterview}
        />
      )}
    </DashboardLayout>
  );
};

export default TalentInterviews;
