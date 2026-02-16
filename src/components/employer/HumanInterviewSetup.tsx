import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Clock, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Interviewer {
  id: string;
  name: string;
  email: string;
  role: string;
  selected?: boolean;
}

interface HumanInterviewSetupProps {
  onBack: () => void;
}

const HumanInterviewSetup = ({ onBack }: HumanInterviewSetupProps) => {
  const [step, setStep] = useState<"details" | "schedule" | "reviewers" | "review">("details");
  const [formData, setFormData] = useState({
    title: "",
    jobId: "",
    candidateId: "",
    interviewType: "video",
    location: "",
  });

  const [schedule, setSchedule] = useState({
    date: "",
    time: "",
    duration: "60",
    timeZone: "UTC",
  });

  const [selectedInterviewers, setSelectedInterviewers] = useState<Interviewer[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);
  const [candidates, setCandidates] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  // Mock data
  useEffect(() => {
    setJobs([
      { id: "1", title: "Senior Software Engineer" },
      { id: "2", title: "Product Manager" },
      { id: "3", title: "Frontend Developer" },
    ]);
    setCandidates([
      { id: "1", name: "John Doe" },
      { id: "2", name: "Jane Smith" },
      { id: "3", name: "Alex Johnson" },
    ]);
    setInterviewers([
      { id: "1", name: "Sarah Williams", email: "sarah@company.com", role: "Hiring Manager" },
      { id: "2", name: "Mike Chen", email: "mike@company.com", role: "Tech Lead" },
      { id: "3", name: "Emily Brown", email: "emily@company.com", role: "Recruiter" },
      { id: "4", name: "David Lee", email: "david@company.com", role: "Senior Engineer" },
    ]);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSchedule((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddInterviewer = (interviewer: Interviewer) => {
    if (selectedInterviewers.find((i) => i.id === interviewer.id)) {
      toast.error("Interviewer already added");
      return;
    }
    setSelectedInterviewers((prev) => [...prev, interviewer]);
  };

  const handleRemoveInterviewer = (id: string) => {
    setSelectedInterviewers((prev) => prev.filter((i) => i.id !== id));
  };

  const handleNextStep = () => {
    if (step === "details") {
      if (!formData.title || !formData.jobId || !formData.candidateId) {
        toast.error("Please fill in all required fields");
        return;
      }
      setStep("schedule");
    } else if (step === "schedule") {
      if (!schedule.date || !schedule.time) {
        toast.error("Please select date and time");
        return;
      }
      setStep("reviewers");
    } else if (step === "reviewers") {
      if (selectedInterviewers.length === 0) {
        toast.error("Please add at least one interviewer");
        return;
      }
      setStep("review");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // In production, send to API
      console.log("Submitting Human Interview:", {
        ...formData,
        schedule,
        interviewers: selectedInterviewers,
      });

      toast.success("Interview scheduled successfully!");
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      toast.error("Failed to schedule interview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step === "details" ||
                step === "schedule" ||
                step === "reviewers" ||
                step === "review"
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              1
            </div>
            <div className="text-sm font-medium">Details</div>
          </div>
          <div className="flex-1 h-1 mx-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step === "schedule" || step === "reviewers" || step === "review"
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              2
            </div>
            <div className="text-sm font-medium">Schedule</div>
          </div>
          <div className="flex-1 h-1 mx-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step === "reviewers" || step === "review"
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              3
            </div>
            <div className="text-sm font-medium">Reviewers</div>
          </div>
          <div className="flex-1 h-1 mx-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step === "review"
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              4
            </div>
            <div className="text-sm font-medium">Review</div>
          </div>
        </div>
      </div>

      {/* Step: Details */}
      {step === "details" && (
        <div className="glass rounded-2xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Interview Title *
            </label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Round 2 - Technical Interview"
              className="h-12"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Job Position *
              </label>
              <Select value={formData.jobId} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, jobId: value }))
              }>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Candidate *
              </label>
              <Select value={formData.candidateId} onValueChange={(value) =>
                setFormData(prev => ({ ...prev, candidateId: value }))
              }>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Interview Type
              </label>
              <Select value={formData.interviewType} onValueChange={(value) =>
                setFormData(prev => ({ ...prev, interviewType: value }))
              }>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video Call</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {formData.interviewType === "onsite" ? "Location *" : "Meeting Link"}
              </label>
              <Input
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder={
                  formData.interviewType === "onsite"
                    ? "Enter office location"
                    : "Enter meeting link (optional)"
                }
                className="h-12"
              />
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button onClick={handleNextStep}>
              Next: Schedule
            </Button>
          </div>
        </div>
      )}

      {/* Step: Schedule */}
      {step === "schedule" && (
        <div className="glass rounded-2xl p-8 space-y-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
            <Clock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Select the date and time when you'd like to conduct this interview. Invitations will be
              sent to all reviewers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Interview Date *
              </label>
              <Input
                type="date"
                name="date"
                value={schedule.date}
                onChange={handleScheduleChange}
                className="h-12"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Interview Time *
              </label>
              <Input
                type="time"
                name="time"
                value={schedule.time}
                onChange={handleScheduleChange}
                className="h-12"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Duration (Minutes)
              </label>
              <Select value={schedule.duration} onValueChange={(value) =>
                setSchedule(prev => ({ ...prev, duration: value }))
              }>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Time Zone
              </label>
              <Select value={schedule.timeZone} onValueChange={(value) =>
                setSchedule(prev => ({ ...prev, timeZone: value }))
              }>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EST">EST (Eastern)</SelectItem>
                  <SelectItem value="CST">CST (Central)</SelectItem>
                  <SelectItem value="MST">MST (Mountain)</SelectItem>
                  <SelectItem value="PST">PST (Pacific)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => setStep("details")}>
              Back
            </Button>
            <Button onClick={handleNextStep}>
              Next: Add Reviewers
            </Button>
          </div>
        </div>
      )}

      {/* Step: Reviewers */}
      {step === "reviewers" && (
        <div className="glass rounded-2xl p-8 space-y-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
            <Users className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Select team members who will participate in this interview. Interview invitations will be
              sent to all selected reviewers.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-4">
              Select Reviewers
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {interviewers.map((interviewer) => {
                const isSelected = selectedInterviewers.some((i) => i.id === interviewer.id);
                return (
                  <Card
                    key={interviewer.id}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 border-emerald-500 border-2"
                        : "bg-secondary/30 hover:bg-secondary/50"
                    }`}
                    onClick={() =>
                      isSelected
                        ? handleRemoveInterviewer(interviewer.id)
                        : handleAddInterviewer(interviewer)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{interviewer.name}</p>
                        <p className="text-sm text-muted-foreground">{interviewer.role}</p>
                        <p className="text-xs text-muted-foreground">{interviewer.email}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {selectedInterviewers.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">
                Selected Reviewers ({selectedInterviewers.length})
              </h3>
              <div className="space-y-2">
                {selectedInterviewers.map((interviewer) => (
                  <div
                    key={interviewer.id}
                    className="flex items-center justify-between bg-secondary/30 rounded-xl p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{interviewer.name}</p>
                      <p className="text-xs text-muted-foreground">{interviewer.email}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveInterviewer(interviewer.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => setStep("schedule")}>
              Back
            </Button>
            <Button onClick={handleNextStep} disabled={selectedInterviewers.length === 0}>
              Review & Schedule
            </Button>
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && (
        <div className="glass rounded-2xl p-8 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Interview Details</h3>
            <div className="grid grid-cols-2 gap-4 bg-secondary/30 rounded-xl p-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Title</p>
                <p className="text-foreground">{formData.title}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Job</p>
                <p className="text-foreground">
                  {jobs.find((j) => j.id === formData.jobId)?.title}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Candidate</p>
                <p className="text-foreground">
                  {candidates.find((c) => c.id === formData.candidateId)?.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Type</p>
                <p className="text-foreground capitalize">{formData.interviewType}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Schedule</h3>
            <div className="grid grid-cols-3 gap-4 bg-secondary/30 rounded-xl p-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Date</p>
                <p className="text-foreground">{schedule.date}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Time</p>
                <p className="text-foreground">{schedule.time}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Duration</p>
                <p className="text-foreground">{schedule.duration} minutes</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground">
              Reviewers ({selectedInterviewers.length})
            </h3>
            <div className="space-y-2">
              {selectedInterviewers.map((interviewer) => (
                <div key={interviewer.id} className="flex items-start gap-3 bg-secondary/30 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-emerald-600">
                      {interviewer.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{interviewer.name}</p>
                    <p className="text-xs text-muted-foreground">{interviewer.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-sm text-foreground">
              <strong>Ready to proceed:</strong> Interview invitations will be sent to all
              reviewers. Candidate will receive a confirmation with the interview details.
            </p>
          </div>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => setStep("reviewers")}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
            >
              Schedule Interview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HumanInterviewSetup;
