import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shouldPrefill = searchParams.get("prefill") === "1";
  const [step, setStep] = useState<"details" | "review">("details");
  const [formData, setFormData] = useState({
    title: "",
    jobId: "",
    candidateId: "",
    interviewType: "video",
    location: "",
  });

  const [selectedInterviewers, setSelectedInterviewers] = useState<Interviewer[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);

  // Candidates should be independent of job position (per requirement).
  // We allow selecting existing candidates OR manually adding new ones via text fields.
  const [candidates, setCandidates] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [prefilledFromBulk, setPrefilledFromBulk] = useState(false);
  const isMultiSelect = selectedCandidateIds.length > 1;

  const [manualCandidates, setManualCandidates] = useState<Array<{ name: string; email: string }>>([
    { name: "", email: "" },
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobsAndCandidates = async () => {
      const token = apiClient.getToken();
      if (!token) return;

      try {
        // Jobs: best-effort load for dropdown (use existing ApiClient method)
        const jobsResp: any = await apiClient.getAllJobs().catch(() => ({ success: false, data: [] }));
        const jobsList = Array.isArray(jobsResp?.data) ? jobsResp.data : [];
        setJobs(
          jobsList.map((j: any) => ({
            id: String(j.id),
            title: String(j.title || `Job #${j.id}`),
          }))
        );

        // Candidates: use employer applications list, same source as EmployerCandidates page
        // but DO NOT tie candidate selection to jobId.
        const appsResp: any = await apiClient.getApplications().catch(() => ({ success: false, data: [] }));
        const apps = Array.isArray(appsResp?.data) ? appsResp.data : Array.isArray(appsResp) ? appsResp : [];

        const mappedCandidates = apps
          .map((app: any, idx: number) => ({
            id: String(app.id || app.application_id || idx + 1),
            name: String(app.candidate_name || app.candidate_email || `Candidate ${idx + 1}`),
            email: app.candidate_email ?? undefined,
          }))
          .filter((c: any) => !!String(c.email || "").trim()); // only candidates with emails are actionable here

        setCandidates(mappedCandidates);
        setCandidatesLoaded(true);
      } catch (e) {
        console.error("Failed to load jobs/candidates", e);
        setCandidates([]);
        setJobs([]);
        setCandidatesLoaded(true);
      }
    };

    fetchJobsAndCandidates();
  }, []);

  // Prefill candidates from Candidates page “Create New”
  useEffect(() => {
    if (!shouldPrefill) return;

    try {
      const raw = localStorage.getItem("prefillHumanInterviewCandidates");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [];
      if (!list.length) return;

      // For now this setup UI only supports selecting 1 candidate.
      // Choose the first selected candidate from the list.
      const first = list[0];
      const name = String(first?.name || "").trim();
      if (!name) return;

      // Replace mock candidates list with the prefilled ones so the dropdown matches
      const prefillCandidates = list.map((c: any, idx: number) => ({
        id: String(idx + 1),
        name: String(c?.name || c?.email || `Candidate ${idx + 1}`),
        email: String(c?.email || "").trim(),
      }));

      // Merge with existing candidates (avoid duplicates by email)
      setCandidates((prev) => {
        const byEmail = new Map<string, any>();
        prev.forEach((p) => {
          const em = String(p.email || "").trim().toLowerCase();
          if (em) byEmail.set(em, p);
        });
        prefillCandidates.forEach((p, i) => {
          const em = String(p.email || "").trim().toLowerCase();
          if (!em) return;
          if (!byEmail.has(em)) {
            byEmail.set(em, { ...p, id: `${Date.now()}_${i}_${em}` });
          }
        });
        return Array.from(byEmail.values());
      });

      // Also prefill into manual candidate fields so user can edit/add more easily
      setManualCandidates((prev) => {
        const next = prefillCandidates.map((c) => ({ name: c.name, email: c.email || "" }));
        return next.length ? next : prev;
      });

      // Preselect all prefilled (after merge, selection is based on email match)
      setSelectedCandidateIds([]);
      setPrefilledFromBulk(prefillCandidates.length > 1);

      setFormData((prev) => ({
        ...prev,
        candidateId: "",
      }));

      // Clear after consuming so it doesn't affect future runs
      localStorage.removeItem("prefillHumanInterviewCandidates");
    } catch (e) {
      console.error("Failed to prefill human interview candidates", e);
    } finally {
      // Remove query param so refresh doesn't keep trying
      navigate("/employer/interviews/setup?type=human", { replace: true });
    }
  }, [navigate, shouldPrefill]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const normalizeEmail = (email: string) => String(email || "").trim().toLowerCase();

  const getSelectedCandidates = () => {
    // Combine selected from dropdown + manual candidate rows
    const selectedFromList = (selectedCandidateIds.length ? selectedCandidateIds : [formData.candidateId])
      .filter(Boolean)
      .map((id) => candidates.find((c) => c.id === id))
      .filter(Boolean) as Array<{ id: string; name: string; email?: string }>;

    const manual = manualCandidates
      .map((c) => ({ name: String(c.name || "").trim(), email: normalizeEmail(c.email) }))
      .filter((c) => c.email);

    // Merge by email (manual overrides name if provided)
    const byEmail = new Map<string, { name: string; email: string }>();
    selectedFromList.forEach((c) => {
      const email = normalizeEmail(c.email || "");
      if (!email) return;
      byEmail.set(email, { name: String(c.name || "").trim() || email, email });
    });
    manual.forEach((c) => {
      const existing = byEmail.get(c.email);
      byEmail.set(c.email, {
        name: c.name || existing?.name || c.email,
        email: c.email,
      });
    });

    return Array.from(byEmail.values());
  };

  const handleNextStep = () => {
    if (step === "details") {
      const selected = getSelectedCandidates();

      if (!formData.title || !formData.jobId || selected.length === 0) {
        toast.error("Please fill in all required fields");
        return;
      }

      setStep("review");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const selected = getSelectedCandidates();

      if (!selected.length) {
        toast.error("Please add at least 1 candidate (email is required).");
        return;
      }

      const jobTitle = jobs.find((j) => j.id === formData.jobId)?.title || "your role";
      const messageSubject = `Interview availability for ${jobTitle}`;

      // Leave body empty so backend default includes booking link.
      const messageBody = "";

      await Promise.all(
        selected.map(async (candidate) => {
          const payload = {
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            candidateUserId: undefined,
            jobId: formData.jobId ? Number(formData.jobId) : undefined,
            messageSubject,
            messageBody,
          };

          const res = await apiClient.request<{
            success: boolean;
            data?: { request: any; links?: any; scheduleUrl?: string; manageUrl?: string; match?: any };
            error?: string;
          }>("/human-interview/request", {
            method: "POST",
            body: JSON.stringify(payload),
          });

          // New backend returns { data: { scheduleUrl, manageUrl } } where scheduleUrl is
          // /human-interview/schedule/:jobId/:personId (NOT hir_cand_* token).
          const scheduleUrl: string | undefined =
            (res as any)?.data?.scheduleUrl ||
            (res as any)?.data?.links?.scheduleUrl ||
            (res as any)?.data?.links?.candidateUrl;

          // Hard fail if backend didn't return the new-style URL, because token URLs 404.
          if (!scheduleUrl || scheduleUrl.includes("hir_cand_") || scheduleUrl.includes("hir_emp_")) {
            throw new Error("Booking link generation returned an invalid URL (legacy token link).");
          }

          if (scheduleUrl) {
            toast.success(`Booking link created: ${scheduleUrl}`);
          }

          if (!res?.success) {
            throw new Error(res?.error || `Failed to create request for ${candidate.name}`);
          }
        })
      );

      toast.success(
        `Availability request emailed to ${selected.length} candidate${selected.length === 1 ? "" : "s"}`
      );
      setTimeout(() => onBack(), 1500);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to create request");
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
                step === "details" || step === "review"
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
                step === "review" ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              2
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
              <Select
                value={formData.jobId}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    jobId: value,
                    candidateId: "", // reset candidate when job changes
                  }))
                }
              >
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
              {(prefilledFromBulk || isMultiSelect) && (
                <div className="text-xs text-muted-foreground mb-2">
                  {getSelectedCandidates().length} candidates will receive the booking link.
                </div>
              )}

              {/* Manual candidates (no job dependency) */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Add candidate(s) manually</div>
                {manualCandidates.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={c.name}
                      placeholder="Candidate name (optional)"
                      onChange={(e) =>
                        setManualCandidates((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x))
                        )
                      }
                    />
                    <div className="flex gap-2">
                      <Input
                        value={c.email}
                        placeholder="Candidate email *"
                        onChange={(e) =>
                          setManualCandidates((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, email: e.target.value } : x))
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setManualCandidates((prev) => prev.filter((_, i) => i !== idx))
                        }
                        disabled={manualCandidates.length === 1}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setManualCandidates((prev) => [...prev, { name: "", email: "" }])}
                  >
                    Add another candidate
                  </Button>
                </div>
              </div>

              {/* Existing candidates (optional) */}
              <div className="space-y-2 pt-3">
                <div className="text-xs text-muted-foreground">Or select from existing candidates</div>

                {selectedCandidateIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedCandidateIds.map((id) => {
                      const c = candidates.find((x) => x.id === id);
                      if (!c) return null;
                      return (
                        <Badge key={id} variant="secondary" className="flex items-center gap-2">
                          {c.name}
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedCandidateIds((prev) => prev.filter((x) => x !== id));
                              if (formData.candidateId === id) {
                                const remaining = selectedCandidateIds.filter((x) => x !== id);
                                setFormData((p) => ({ ...p, candidateId: remaining[0] || "" }));
                              }
                            }}
                            aria-label={`Remove ${c.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <Select
                  value={formData.candidateId}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, candidateId: value }));
                    if (!value) return;

                    setSelectedCandidateIds((prev) => {
                      const exists = prev.includes(value);
                      if (exists) return prev.filter((x) => x !== value);
                      return [...prev, value];
                    });
                  }}
                  disabled={!candidatesLoaded}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={candidatesLoaded ? "Select candidate(s)" : "Loading..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate) => {
                      const selected = selectedCandidateIds.includes(candidate.id);
                      return (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {selected ? "✓ " : ""}
                          {candidate.name}
                          {candidate.email ? ` (${candidate.email})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <div className="text-[11px] text-muted-foreground">
                  You can combine manual entries + selected candidates. Duplicates are merged by email.
                </div>
              </div>
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
              Next
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
                <p className="text-xs font-semibold text-muted-foreground">Candidates</p>
                <p className="text-foreground">
                  {getSelectedCandidates().map((c) => c.email).join(", ")}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Type</p>
                <p className="text-foreground capitalize">{formData.interviewType}</p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-sm text-foreground">
              <strong>Ready to proceed:</strong> We’ll email the candidate a link where they can provide availability and book a slot.
            </p>
          </div>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => setStep("details")}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
            >
              Send Booking Link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HumanInterviewSetup;
