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
import { useState, useEffect } from "react";
import { toast } from "sonner";
import interviewsAPI from "@/lib/api/interviews";
import { apiClient } from "@/lib/api";

interface AIInterviewQuestion {
  id?: string;
  question: string;
  category?: string;
  questionWeight: number;
  type: "custom" | "generated";
}

interface AIInterviewSetupProps {
  onBack: () => void;
}

const AIInterviewSetup = ({ onBack }: AIInterviewSetupProps) => {
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

  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);
  const [questions, setQuestions] = useState<AIInterviewQuestion[]>([]);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<AIInterviewQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState<AIInterviewQuestion>({
    question: "",
    category: "",
    questionWeight: 1,
    type: "custom",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
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

    setGeneratingQuestions(true);
    try {
      // Generate questions via backend so they are persisted in DB (ai_generated_questions)
      // and can be used consistently during the interview + scoring.
      // IMPORTANT: generate_questions expects interviewId (ai_interviews.id), not jobId.
      // We only allow generating after the interview is created (review step).
      const response = await apiClient.request(`/interviews/${formData.jobId}/generate_questions`, {
        method: "POST",
        body: JSON.stringify({
          // Backend currently uses this only to generate mock questions, but keep it for future real prompt-based generation.
          job_description: formData.description || `${formData.title} (${formData.category})`,
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
        questionWeight: q.question_weight || 3,
        type: "generated",
      }));

      setAiGeneratedQuestions(generated);
      toast.success("AI questions generated successfully!");
    } catch (error) {
      console.error("Failed to generate questions:", error);
      toast.error("Failed to generate AI questions");
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const addGeneratedQuestion = (question: AIInterviewQuestion) => {
    setQuestions((prev) => [...prev, question]);
    setAiGeneratedQuestions((prev) =>
      prev.filter((q) => q.id !== question.id)
    );
    toast.success("Question added to interview");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      toast.error("Question cannot be empty");
      return;
    }

    if (editingId) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editingId ? { ...newQuestion, id: editingId } : q
        )
      );
      toast.success("Question updated successfully");
      setEditingId(null);
    } else {
      const id = `question-${Date.now()}`;
      setQuestions((prev) => [...prev, { ...newQuestion, id }]);
      toast.success("Question added successfully");
    }

    setNewQuestion({
      question: "",
      category: "",
      questionWeight: 1,
      type: "custom",
    });
  };

  const handleEditQuestion = (question: AIInterviewQuestion) => {
    setNewQuestion(question);
    setEditingId(question.id || null);
  };

  const handleDeleteQuestion = (id: string | undefined) => {
    if (!id) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    toast.success("Question deleted successfully");
  };

  const handleNextStep = () => {
    if (step === "details") {
      if (!formData.title || !formData.jobId) {
        toast.error("Please fill in all required fields");
        return;
      }
      setStep("questions");
    } else if (step === "questions") {
      if (questions.length === 0) {
        toast.error("Please add at least one question");
        return;
      }
      setStep("review");
    }
  };

  const handleSubmit = async () => {
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
          questions: questions
            .filter((q) => q.type === "custom")
            .map((q) => ({
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
        
        // Store interview ID and redirect to invite candidates page
        localStorage.setItem('lastInterviewId', interviewId.toString());
        
        // Navigate to invite candidates page
        setTimeout(() => {
          onBack();
          // You can also navigate to invite page if needed
          // navigate(`/employer/interviews/${interviewId}/invite`);
        }, 1500);
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
              Interview Title *
            </label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Senior Engineer Initial Screen"
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
              Job Position *
            </label>
            <Select value={formData.jobId} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, jobId: value }))
            }>
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
                  value={newQuestion.question}
                  onChange={(e) =>
                    setNewQuestion((prev) => ({
                      ...prev,
                      question: e.target.value,
                    }))
                  }
                  placeholder="Enter interview question"
                  className="w-full min-h-24 px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Category
                  </label>
                  <Input
                    value={newQuestion.category}
                    onChange={(e) =>
                      setNewQuestion((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    placeholder="e.g., System Design"
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Weight (1-5)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={newQuestion.questionWeight}
                    onChange={(e) =>
                      setNewQuestion((prev) => ({
                        ...prev,
                        questionWeight: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="h-10"
                  />
                </div>
              </div>

              <Button
                onClick={handleAddQuestion}
                className="w-full"
                variant={editingId ? "default" : "outline"}
              >
                <Plus className="w-4 h-4 mr-2" />
                {editingId ? "Update Question" : "Add Question"}
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
                        <Button
                          size="sm"
                          onClick={() => addGeneratedQuestion(q)}
                        >
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
          {questions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">
                Interview Questions ({questions.length}/{formData.numberOfQuestions})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {questions.map((q) => (
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
                        {q.type === "custom" && (
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
            <Button onClick={handleNextStep} disabled={questions.length === 0}>
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
            <h3 className="text-lg font-bold text-foreground">Questions ({questions.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {questions.map((q, index) => (
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
              <li>• {questions.length} questions will be presented</li>
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
