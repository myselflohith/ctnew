import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  });

  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);

  const [manualCandidates, setManualCandidates] = useState<Array<{ name: string; email: string }>>([
    { name: "", email: "" },
  ]);

  // Candidates are manual-only (no existing candidates selector).
  const [prefilledFromBulk, setPrefilledFromBulk] = useState(false);
  const isMultiSelect = manualCandidates.length > 1;

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      const token = apiClient.getToken();
      if (!token) return;

      try {
        const jobsResp: any = await apiClient.getAllJobs().catch(() => ({ success: false, data: [] }));
        const jobsList = Array.isArray(jobsResp?.data) ? jobsResp.data : [];
        setJobs(
          jobsList.map((j: any) => ({
            id: String(j.id),
            title: String(j.title || `Job #${j.id}`),
          }))
        );
      } catch (e) {
        console.error("Failed to load jobs", e);
        setJobs([]);
      }
    };

    fetchJobs();
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

      // Prefill into manual candidate fields so user can edit/add more easily
      const prefillCandidates = list.map((c: any) => ({
        name: String(c?.name || c?.email || "").trim(),
        email: String(c?.email || "").trim(),
      }));

      setManualCandidates((prev) => {
        const next = prefillCandidates.length ? prefillCandidates : prev;
        return next;
      });

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


  const normalizeEmail = (email: string) => String(email || "").trim().toLowerCase();

  const getSelectedCandidates = () => {
    const manual = manualCandidates
      .map((c) => ({ name: String(c.name || "").trim(), email: normalizeEmail(c.email) }))
      .filter((c) => c.email);

    // Deduplicate by email; prefer provided name
    const byEmail = new Map<string, { name: string; email: string }>();
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
                    candidateId: "",
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
