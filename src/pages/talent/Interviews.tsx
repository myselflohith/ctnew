import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  Search,
  FileText,
  Heart,
  Settings,
  Calendar,
  Building2,
  MapPin,
  Clock,
  Video,
  Phone,
  Play,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useJobs } from "@/contexts/JobsContext";
import { apiClient } from "@/lib/api";
import { StartInterviewModal, type CandidateInfo } from "@/components/interview/StartInterviewModal";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent/dashboard" },
  { icon: Search, label: "Find Jobs", path: "/talent/jobs" },
  { icon: Heart, label: "Saved Jobs", path: "/talent/saved" },
  { icon: FileText, label: "Applications", path: "/talent/applications" },
  { icon: Calendar, label: "Interviews", path: "/talent/interviews" },
  { icon: Settings, label: "Settings", path: "/talent/settings" },
];

const TalentInterviews = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [interviews, setInterviews] = useState<any[]>([]);
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
          setInterviews((interviewList).map((interview: any) => ({
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
            completed: interview.completed > 0,
            uniqueLink: interview.unique_interview_link,
            interviewTitle: interview.interview_title,
            interviewCategory: interview.interview_category || "General",
            candidateEmail: interview.candidate_email,
            candidateName: interview.candidate_name,
            phoneNum: interview.phone_num,
          })));
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

  // Filter interviews based on search query
  const filteredInterviews = interviews.filter((interview) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      interview.jobTitle.toLowerCase().includes(query) ||
      interview.company.toLowerCase().includes(query) ||
      interview.location.toLowerCase().includes(query)
    );
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
    <DashboardLayout role="talent" navItems={navItems} userName="John Doe">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Interviews Scheduled
        </h1>
        <p className="text-muted-foreground">
          Manage your upcoming interviews and prepare for success.
        </p>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-4 mb-8">
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
                  <div className="flex items-center gap-2">
                    {!interview.completed && (
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-cardinal to-amber"
                        onClick={() => handleStartInterviewClick(interview)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Take Interview
                      </Button>
                    )}
                    {interview.completed && (
                      <Badge className="bg-green-600">Completed</Badge>
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
