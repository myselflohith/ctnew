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
import { Trash2, Plus, Edit2, Sparkles, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import interviewsAPI from "@/lib/api/interviews";
import { apiClient } from "@/lib/api";

const clampQuestionWeight = (value: number) => {
  if (Number.isNaN(value)) return 1;
  return Math.max(1, Math.min(10, value));
};

interface AIInterviewQuestion {
  id?: string;
  question: string;
  category?: string;
  questionWeight: number;
  type: "custom" | "generated";
}

interface AIInterviewSetupProps {
  onBack: () => void;
  onCreated?: (interviewId: string) => void;
}

const AIInterviewSetup = ({ onBack, onCreated }: AIInterviewSetupProps) => {
  // If AI Generate is used, we create the interview first (to get interviewId),
  // then call `/interviews/:interviewId/generate_questions`.
  // Store that interviewId here so the final "Create Interview" step does NOT create a duplicate.
  const createdInterviewIdRef = useRef<string | null>(null);
  const [step, setStep] = useState<"details" | "questions" | "review">("details");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    jobId: "",
    interviewDuration: "15",
    numberOfQuestions: "5",
    category: "technical",
    interviewType: "Practice",
    questionType: [] as string[],
  });

  // Track whether the employer manually edited the interview title.
  // If they haven't, we auto-fill it from the selected Job Position.
  const titleManuallyEditedRef = useRef(false);

  // If your requirement is to ALWAYS keep interview title equal to job position,
  // set this to true.
  const ALWAYS_SYNC_TITLE_WITH_JOB = true;

  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);
  // Legacy (no longer used): kept previously; can be removed in a follow-up cleanup
  // const [questions, setQuestions] = useState<AIInterviewQuestion[]>([]);
  const [customQuestions, setCustomQuestions] = useState<AIInterviewQuestion[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIInterviewQuestion[]>([]);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<AIInterviewQuestion[]>([]);
  const [customDraft, setCustomDraft] = useState<AIInterviewQuestion>({
    question: "",
    category: "",
    questionWeight: 1,
    type: "custom",
  });
  const [aiDraft, setAiDraft] = useState<AIInterviewQuestion>({
    question: "",
    category: "",
    questionWeight: 1,
    type: "generated",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<"custom" | "generated" | null>(null);
  const [editingOriginalType, setEditingOriginalType] = useState<"custom" | "generated" | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      // Fetch real jobs from API (no mock fallback; match ch-job-marketplace behavior)
      const response = await apiClient.request('/jobs');
      const jobList = (response?.data || response) as any;

      const rows = Array.isArray(jobList) ? jobList : Array.isArray(jobList?.data) ? jobList.data : [];
      if (!Array.isArray(rows) || rows.length === 0) {
        setJobs([]);
        toast.error('No jobs found. Please create a job first.');
        return;
      }

      setJobs(
        rows.map((job: any) => ({
          id: String(job.id),
          title: job.title || job.job_title || `Job #${job.id}`,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      setJobs([]);
      toast.error("Failed to load jobs. Please try again.");
    }
  };

  const toggleQuestionType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      questionType: prev.questionType.includes(type)
        ? prev.questionType.filter((t) => t !== type)
        : [...prev.questionType, type],
    }));
  };

  const generateAIQuestions = async () => {
    if (!formData.jobId) {
      toast.error("Please select a job first");
      return;
    }

    // IMPORTANT:
    // Backend route `/interviews/:id/generate_questions` expects :id = ai_interviews.id (interviewId),
    // not jobId. So we must create the interview first, then generate, then show the generated list.
    setGeneratingQuestions(true);
    try {
      const interviewPayload = {
        interview_param: {
          interview_title: formData.title,
          interview_type: formData.category,
          type_of_interview: formData.interviewType,
          job_id: formData.jobId,
          job_list: formData.jobId,
          addition_skill: formData.category,
          interview_duration: parseInt(formData.interviewDuration) || 15,
          number_of_questions: parseInt(formData.numberOfQuestions) || 5,
          question_type: formData.questionType.join(","),
          questions: customQuestions.map((q) => ({
            question: q.question,
            question_weight: q.questionWeight,
            category: q.category,
          })),
        },
      };

      const created = await interviewsAPI.createAIInterview(interviewPayload);
      if (!created?.success || !created?.interview?.id) {
        throw new Error("Failed to create interview");
      }

      const interviewId = created.interview.id;
      createdInterviewIdRef.current = String(interviewId);

      // Generate questions using real job context on the backend (job title/description/skills + additional skills)
      const response = await apiClient.request(`/interviews/${interviewId}/generate_questions`, {
        method: "POST",
        body: JSON.stringify({
          // Fallback only; backend already loads job + interview context by interviewId.
          job_description: formData.description || "",
          num_questions: parseInt(formData.numberOfQuestions) || 5,
        }),
      });

      if (!response?.success || !Array.isArray(response?.data)) {
        throw new Error(response?.error || "Failed to generate questions");
      }

      const generated: AIInterviewQuestion[] = response.data.map((q: any, idx: number) => ({
        id: q.id?.toString() || `ai-${Date.now()}-${idx}`,
        question: q.question,
        category: formData.category,
        questionWeight: clampQuestionWeight(q.question_weight || 1),
        type: "generated",
      }));

      // Keep generated questions separated so editing AI does not affect custom section.
      setGeneratedQuestions((prev) => {
        const existing = new Set(prev.map((p) => (p.question || "").trim().toLowerCase()));
        const toAdd = generated.filter((g) => !existing.has((g.question || "").trim().toLowerCase()));
        return [...prev, ...toAdd];
      });

      setAiGeneratedQuestions([]);
      toast.success("AI questions generated and added to the interview!");
    } catch (error) {
      console.error("Failed to generate questions:", error);
      toast.error("Failed to generate AI questions");
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const addGeneratedQuestion = (question: AIInterviewQuestion) => {
    const normalized: AIInterviewQuestion = {
      ...question,
      questionWeight: clampQuestionWeight(question.questionWeight),
    };

    if (normalized.questionWeight !== question.questionWeight) {
      toast.error("Question weight must be between 1 and 10");
      return;
    }

    setGeneratedQuestions((prev) => [...prev, { ...normalized, type: "generated" }]);
    setAiGeneratedQuestions((prev) => prev.filter((q) => q.id !== question.id));
    toast.success("Question added to interview");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "title") {
      titleManuallyEditedRef.current = true;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCustomQuestion = () => {
    if (!customDraft.question.trim()) {
      toast.error("Question cannot be empty");
      return;
    }

    const normalizedQuestion: AIInterviewQuestion = {
      ...customDraft,
      questionWeight: clampQuestionWeight(customDraft.questionWeight),
      type: "custom",
    };

    if (customDraft.questionWeight !== normalizedQuestion.questionWeight) {
      toast.error("Question weight must be between 1 and 10");
      return;
    }

    // If currently editing a custom question, update it; otherwise add.
    if (editingId && editingType === "custom") {
      setCustomQuestions((prev) =>
        prev.map((q) => (q.id === editingId ? { ...normalizedQuestion, id: editingId } : q))
      );
      toast.success("Question updated successfully");
      setEditingId(null);
      setEditingType(null);
      setEditingOriginalType(null);
    } else {
      const id = `question-${Date.now()}`;
      setCustomQuestions((prev) => [...prev, { ...normalizedQuestion, id }]);
      toast.success("Question added successfully");
    }

    setCustomDraft({
      question: "",
      category: "",
      questionWeight: 1,
      type: "custom",
    });
  };

  const handleUpdateAIQuestion = () => {
    if (!editingId || editingType !== "generated") {
      return;
    }
    if (!aiDraft.question.trim()) {
      toast.error("Question cannot be empty");
      return;
    }

    const normalizedQuestion: AIInterviewQuestion = {
      ...aiDraft,
      questionWeight: clampQuestionWeight(aiDraft.questionWeight),
      type: "generated",
    };

    if (aiDraft.questionWeight !== normalizedQuestion.questionWeight) {
      toast.error("Question weight must be between 1 and 10");
      return;
    }

    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === editingId ? { ...normalizedQuestion, id: editingId } : q))
    );

    toast.success("Question updated successfully");
    setEditingId(null);
    setEditingType(null);
    setEditingOriginalType(null);
    setAiDraft({
      question: "",
      category: "",
      questionWeight: 1,
      type: "generated",
    });
  };

  const handleEditQuestion = (question: AIInterviewQuestion) => {
    if (question.type !== "custom") return;
    setCustomDraft({
      ...question,
      type: "custom",
    });
    setEditingId(question.id || null);
    setEditingType("custom");
    setEditingOriginalType("custom");
  };

  const handleEditGeneratedQuestion = (question: AIInterviewQuestion) => {
    if (question.type !== "generated") return;
    setAiDraft({
      ...question,
      type: "generated",
    });
    setEditingId(question.id || null);
    setEditingType("generated");
    setEditingOriginalType("generated");
  };

  const handleDeleteQuestion = (id: string | undefined) => {
    if (!id) return;
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id));
    toast.success("Question deleted successfully");
  };

  const handleDeleteGeneratedQuestion = (id: string | undefined) => {
    if (!id) return;
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== id));
    toast.success("Question deleted successfully");
  };

  const handleNextStep = () => {
    const expectedCount = parseInt(formData.numberOfQuestions) || 0;

    if (step === "details") {
      if (!formData.title || !formData.jobId) {
        toast.error("Please fill in all required fields");
        return;
      }
      setStep("questions");
    } else if (step === "questions") {
      const totalCount = customQuestions.length + generatedQuestions.length;

      if (totalCount === 0) {
        toast.error("Please add at least one question");
        return;
      }

      if (expectedCount > 0 && totalCount !== expectedCount) {
        toast.error(`Total questions must be exactly ${expectedCount}`);
        return;
      }

      setStep("review");
    }
  };

  const handleSubmit = async () => {
    const expectedCount = parseInt(formData.numberOfQuestions) || 0;
    const totalCount = customQuestions.length + generatedQuestions.length;
    if (expectedCount > 0 && totalCount !== expectedCount) {
      toast.error(`Total questions must be exactly ${expectedCount}`);
      return;
    }

    // If AI Generate already created the interview, don't create a second one.
    const existingInterviewId = createdInterviewIdRef.current;

    if (existingInterviewId) {
      toast.success("AI Interview created successfully!");
      localStorage.setItem("lastInterviewId", existingInterviewId);

      if (onCreated) {
        onCreated(existingInterviewId);
      } else {
        setTimeout(() => {
          onBack();
        }, 800);
      }
      return;
    }

    setLoading(true);
    try {
      const interviewPayload = {
        interview_param: {
          interview_title: formData.title,
          interview_type: formData.category,
          type_of_interview: formData.interviewType, // Practice / Screening / Technical
          job_id: formData.jobId,
          job_list: formData.jobId,
          addition_skill: formData.category,
          interview_duration: parseInt(formData.interviewDuration) || 15,
          number_of_questions: parseInt(formData.numberOfQuestions) || 5,
          question_type: formData.questionType.join(","),
          questions: customQuestions.map((q) => ({
            question: q.question,
            question_weight: q.questionWeight,
            category: q.category,
          })),
          // IMPORTANT:
          // - AI questions are now generated/persisted via /generate_questions.
          // - Do NOT send ai_question here, otherwise backend will insert duplicates.
        },
      };

      // Call API to create interview
      const response = await interviewsAPI.createAIInterview(interviewPayload);

      if (response.success && response.interview) {
        const interviewId = response.interview.id;
        toast.success("AI Interview created successfully!");

        // Store interview ID
        localStorage.setItem("lastInterviewId", interviewId.toString());

        if (onCreated) {
          onCreated(interviewId.toString());
        } else {
          setTimeout(() => {
            onBack();
          }, 1500);
        }
      } else {
        toast.error("Failed to create interview");
      }
    } catch (error) {
      console.error("Failed to create interview:", error);
      toast.error("Failed to create interview");
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
                step === "details" || step === "questions" || step === "review"
                  ? "bg-blue-500 text-white"
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
                step === "questions" || step === "review"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              2
            </div>
            <div className="text-sm font-medium">Questions</div>
          </div>
          <div className="flex-1 h-1 mx-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step === "review"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              3
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
              Job Position *
            </label>
            <Select
              value={formData.jobId}
              onValueChange={(value) => {
                const selectedJobTitle = jobs.find((j) => j.id === value)?.title || "";

                setFormData((prev) => ({
                  ...prev,
                  jobId: value,
                  // Auto-fill title from job position
                  title:
                    ALWAYS_SYNC_TITLE_WITH_JOB || !titleManuallyEditedRef.current
                      ? selectedJobTitle
                      : prev.title,
                }));
              }}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select a job position" />
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
              Interview Title *
            </label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Full Stack Developer"
              className="h-12"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Interview Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe the purpose and focus of this interview"
              className="w-full min-h-20 px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>

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
                <SelectItem value="Practice">Practice</SelectItem>
                <SelectItem value="Screening">Screening</SelectItem>
                <SelectItem value="Technical">Technical Assessment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Interview Duration (Minutes)
              </label>
              <Select value={formData.interviewDuration} onValueChange={(value) =>
                setFormData(prev => ({ ...prev, interviewDuration: value }))
              }>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Number of Questions
              </label>
              <Select value={formData.numberOfQuestions} onValueChange={(value) =>
                setFormData(prev => ({ ...prev, numberOfQuestions: value }))
              }>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 questions</SelectItem>
                  <SelectItem value="5">5 questions</SelectItem>
                  <SelectItem value="10">10 questions</SelectItem>
                  <SelectItem value="15">15 questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Interview Category
            </label>
            <Select value={formData.category} onValueChange={(value) =>
              setFormData(prev => ({ ...prev, category: value }))
            }>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Question Sources
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.questionType.includes("Custom Questions")}
                  onChange={() => toggleQuestionType("Custom Questions")}
                  className="w-4 h-4 rounded border-input"
                />
                <span className="text-sm text-foreground font-medium">Custom Questions</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.questionType.includes("AI Generate Questions")}
                  onChange={() => toggleQuestionType("AI Generate Questions")}
                  className="w-4 h-4 rounded border-input"
                />
                <span className="text-sm text-foreground font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  AI Generate Questions
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button onClick={handleNextStep}>
              Next: Add Questions
            </Button>
          </div>
        </div>
      )}

      {/* Step: Questions */}
      {step === "questions" && (
        <div className="glass rounded-2xl p-8 space-y-6">
          {/* Custom Questions Section */}
          {formData.questionType.includes("Custom Questions") && (
            <div className="space-y-4 pb-6 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                Add Custom Questions
              </h3>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Question *
                </label>
                <textarea
                  value={customDraft.question}
                  onChange={(e) =>
                    setCustomDraft((prev) => ({
                      ...prev,
                      question: e.target.value,
                    }))
                  }
                  placeholder="Enter interview question"
                  className="w-full min-h-24 px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground resize-none"
                  disabled={editingType === "generated"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Category
                  </label>
                  <Input
                    value={customDraft.category}
                    onChange={(e) =>
                      setCustomDraft((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    placeholder="e.g., System Design"
                    className="h-10"
                    disabled={editingType === "generated"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Weight (1-10)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={customDraft.questionWeight}
                    onChange={(e) => {
                      const raw = parseInt(e.target.value, 10);
                      setCustomDraft((prev) => ({
                        ...prev,
                        questionWeight: Number.isNaN(raw)
                          ? 1
                          : clampQuestionWeight(raw),
                      }));
                    }}
                    className="h-10"
                    disabled={editingType === "generated"}
                  />
                </div>
              </div>

              <Button
                onClick={handleAddCustomQuestion}
                className="w-full"
                variant={editingId && editingType === "custom" ? "default" : "outline"}
                disabled={!!editingId && editingType !== "custom"}
              >
                <Plus className="w-4 h-4 mr-2" />
                {editingId && editingType === "custom" ? "Update Custom Question" : "Add Custom Question"}
              </Button>
            </div>
          )}

          {/* AI Generated Questions Section */}
          {formData.questionType.includes("AI Generate Questions") && (
            <div className="space-y-4 pb-6 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                AI Generated Questions
              </h3>

              <p className="text-sm text-muted-foreground">
                Let AI generate relevant questions based on the job requirements for {formData.category} role.
              </p>

              <Button
                onClick={generateAIQuestions}
                disabled={generatingQuestions || !formData.jobId}
                className="w-full"
              >
                {generatingQuestions ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Questions
                  </>
                )}
              </Button>

              {/* Edit Selected AI Question */}
              {editingId && editingType === "generated" && (
                <Card className="p-4 bg-blue-500/5 border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      Editing AI Question
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditingType(null);
                        setEditingOriginalType(null);
                        setAiDraft({
                          question: "",
                          category: "",
                          questionWeight: 1,
                          type: "generated",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      AI Question *
                    </label>
                    <textarea
                      value={aiDraft.question}
                      onChange={(e) =>
                        setAiDraft((prev) => ({
                          ...prev,
                          question: e.target.value,
                        }))
                      }
                      className="w-full min-h-24 px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Category
                      </label>
                      <Input
                        value={aiDraft.category}
                        onChange={(e) =>
                          setAiDraft((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        placeholder="e.g., Technical"
                        className="h-10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Weight (1-10)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={aiDraft.questionWeight}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          setAiDraft((prev) => ({
                            ...prev,
                            questionWeight: Number.isNaN(raw)
                              ? 1
                              : clampQuestionWeight(raw),
                          }));
                        }}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <Button onClick={handleUpdateAIQuestion} className="w-full">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Update AI Question
                  </Button>
                </Card>
              )}

              {aiGeneratedQuestions.length > 0 && (
                <div className="space-y-3">
                  {aiGeneratedQuestions.map((q) => (
                    <Card key={q.id} className="p-4 bg-blue-500/5 border-blue-200 dark:border-blue-800">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{q.question}</p>
                          <div className="flex gap-3 mt-2">
                            <Badge variant="outline" className="text-xs">
                              AI Generated
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Weight: {q.questionWeight}
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => addGeneratedQuestion(q)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Added Questions List */}
          {customQuestions.length + generatedQuestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">
                Interview Questions ({customQuestions.length + generatedQuestions.length}/{formData.numberOfQuestions})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[...customQuestions, ...generatedQuestions].map((q) => (
                  <Card key={q.id} className="p-4 bg-secondary/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-foreground font-medium text-sm">{q.question}</p>
                        <div className="flex gap-3 mt-2">
                          {q.category && (
                            <Badge variant="outline" className="text-xs">
                              {q.category}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            Weight: {q.questionWeight}
                          </Badge>
                          {q.type === "generated" && (
                            <Badge className="text-xs bg-blue-500">AI</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {q.type === "custom" ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditQuestion(q)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteQuestion(q.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditGeneratedQuestion(q)}
                              title="Edit AI question"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteGeneratedQuestion(q.id)}
                              title="Remove AI question"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-end pt-4">
            <Button variant="outline" onClick={() => setStep("details")}>
              Back
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={customQuestions.length + generatedQuestions.length === 0}
            >
              Review & Create
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
                <p className="text-foreground font-medium">{formData.title}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Job Position</p>
                <p className="text-foreground font-medium">
                  {jobs.find((j) => j.id === formData.jobId)?.title}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Interview Type</p>
                <p className="text-foreground font-medium capitalize">{formData.interviewType}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Duration</p>
                <p className="text-foreground font-medium">{formData.interviewDuration} minutes</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Category</p>
                <p className="text-foreground font-medium capitalize">{formData.category}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Question Sources</p>
                <div className="flex gap-2 flex-wrap mt-1">
                  {formData.questionType.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type === "AI Generate Questions" ? (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Generated
                        </>
                      ) : (
                        "Custom"
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            {formData.description && (
              <div className="bg-secondary/30 rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Description</p>
                <p className="text-sm text-foreground">{formData.description}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground">Questions ({customQuestions.length + generatedQuestions.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {[...customQuestions, ...generatedQuestions].map((q, index) => (
                <div key={q.id} className="flex items-start gap-3 bg-secondary/30 rounded-xl p-3">
                  <span className="font-bold text-blue-500 shrink-0">{index + 1}.</span>
                  <div className="flex-1">
                    <p className="text-foreground text-sm">{q.question}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {q.category && (
                        <Badge variant="outline" className="text-xs">
                          {q.category}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        Weight: {q.questionWeight}
                      </Badge>
                      {q.type === "generated" && (
                        <Badge className="text-xs bg-blue-500 flex items-center gap-1">
                          <Sparkles className="w-2 h-2" />
                          AI
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              <strong>Interview Preview:</strong>
            </p>
            <ul className="text-sm text-foreground space-y-1">
              <li>• Candidates will have {formData.interviewDuration} minutes total</li>
              <li>• {customQuestions.length + generatedQuestions.length} questions will be presented</li>
              <li>• Responses will be video-recorded and analyzed</li>
              <li>• Candidates can review and re-record before submission</li>
            </ul>
          </div>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => setStep("questions")}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="min-w-32"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Interview"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInterviewSetup;
