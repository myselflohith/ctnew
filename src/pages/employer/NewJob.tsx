import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SourcingProgressModal from "@/components/employer/SourcingProgressModal";
import { employerNavItems } from "@/components/layout/navItems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { ArrowLeft, Link as LinkIcon, Plus, Sparkles, X } from "lucide-react";
import { toast as sonnerToast } from "sonner";

interface Requirement {
  id: string;
  text: string;
  type: "mustHave" | "niceToHave";
  weight: number;
}

const NewJob = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    jobType: "",
    location: "",
    distanceFromLocation: "",
    daysInOffice: "",
    linkedInUrl: "",
    autoSource: false,
    autoSourceGoal: "25",
    // Salary fields (mapped to job_salary + rate)
    minSalary: "",
    maxSalary: "",
    salaryRate: "year",
  });

  const [currentStep, setCurrentStep] = useState<number>(1);

  const [skills, setSkills] = useState<string[]>([]);

  const [sourcingProgressOpen, setSourcingProgressOpen] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [createdJobTitle, setCreatedJobTitle] = useState<string>("");
  const [createdTargetCount, setCreatedTargetCount] = useState<number>(25);
  const [skillInput, setSkillInput] = useState("");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [requirementInput, setRequirementInput] = useState("");
  const [requirementType, setRequirementType] = useState<"mustHave" | "niceToHave">(
    "mustHave",
  );
  const [requirementWeight, setRequirementWeight] = useState<string>("5");
  // Email templates + follow-up days (step 4)
  const [emailTemplates, setEmailTemplates] = useState<{
    initial: string;
    followup1: string;
    followup2: string;
  }>({
    initial:
      `<p>
  Hi {PERSON_NAME},<br /><br />
  We came across your profile and thought you could be a great fit for the
  {ROLE_NAME} role at {COMPANY_NAME}. Could you please share the following details?<br /><br />
  1) What are your salary expectations?<br />
  2) What is your work authorization status?<br /><br />
  Cheers,<br />
  CardinalTalent.ai
</p>`,
    followup1: "",
    followup2: "",
  });
  const [followupDays, setFollowupDays] = useState<{ followup1: number; followup2: number }>({
    followup1: 1,
    followup2: 1,
  });
  const [activeEmailTab, setActiveEmailTab] = useState<"initial" | "followup1" | "followup2">(
    "initial",
  );

  // Companies to target (mapped to company_names)
  const [companiesToTarget, setCompaniesToTarget] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState("");

  const [orgRequirements, setOrgRequirements] = useState<Requirement[]>([]);
  const [requirementsLoaded, setRequirementsLoaded] = useState(false);

  // Load organization requirements on mount
  useEffect(() => {
    const loadOrgRequirements = async () => {
      try {
        const userResponse = await apiClient.getCurrentUser();
        if (userResponse.success && userResponse.user?.company_name) {
          const companyName = userResponse.user.company_name;
          const reqResponse =
            await apiClient.getOrganizationRequirements(companyName);
          if (reqResponse.success && reqResponse.data) {
            const data = reqResponse.data as any[];
            const orgReqs = data.map((req: any) => ({
              id: req.id,
              text: req.requirement_text,
              type: req.requirement_type,
              weight: req.weight,
            }));
            setOrgRequirements(orgReqs);
            // Automatically add must-have requirements to the job
            const mustHaveReqs = orgReqs.filter(
              (r: Requirement) => r.type === "mustHave",
            );
            if (mustHaveReqs.length > 0) {
              setRequirements(mustHaveReqs);
            }
            setRequirementsLoaded(true);
          }
        }
      } catch (error) {
        console.error("Error loading organization requirements:", error);
        setRequirementsLoaded(true);
      }
    };
    loadOrgRequirements();
  }, []);

  const addSkill = () => {
    if (skillInput && !skills.includes(skillInput)) {
      setSkills([...skills, skillInput]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const addRequirement = () => {
    if (!requirementInput?.trim()) {
      toast({
        title: "Requirement is required",
        description: "Please enter a requirement before adding.",
      });
      return;
    }

    const weightNum = Number(requirementWeight);

    if (!Number.isFinite(weightNum) || weightNum < 1 || weightNum > 10) {
      toast({
        title: "Invalid weight",
        description: "Weight must be between 1 and 10 (inclusive).",
      });
      return;
    }

    const newReq: Requirement = {
      id: Date.now().toString(),
      text: requirementInput,
      type: requirementType,
      weight: weightNum,
    };

    // Keep "Must Have" requirements together and "Nice to Have" requirements together.
    // When adding a new requirement, insert it after the last requirement of the same type.
    setRequirements((prev) => {
      const next = [...prev, newReq];

      // Ensure Must Have requirements are always listed first.
      next.sort((a, b) => {
        const ra = a.type === "mustHave" ? 0 : 1;
        const rb = b.type === "mustHave" ? 0 : 1;
        return ra - rb;
      });

      return next;
    });

    setRequirementInput("");
    setRequirementWeight("5");
  };

  const removeRequirement = (id: string) => {
    setRequirements(requirements.filter((r) => r.id !== id));
  };

  const extractSkillsFromDescription = async () => {
    if (!formData.description?.trim()) return;

    const t = sonnerToast.loading("Extracting skills from job description...");

    try {
      const resp = await apiClient.extractJobSkills(formData.description);
      const extractedSkills: string[] = resp?.data?.skills || [];

      if (extractedSkills.length > 0) {
        setSkills([...new Set([...skills, ...extractedSkills])]);
        sonnerToast.success("Skills extracted", {
          id: t,
          description: `Added ${extractedSkills.length} skill${
            extractedSkills.length !== 1 ? "s" : ""
          } from job description.`,
        });
      } else {
        sonnerToast.error("No skills found", {
          id: t,
          description: "Could not extract skills from description. Please add skills manually.",
        });
      }
    } catch (error: any) {
      console.error("Error extracting skills:", error);
      sonnerToast.error("Extraction failed", {
        id: t,
        description:
          error?.message || "Failed to extract skills from description. Please try again.",
      });
    }
  };

  const handleSubmit = async () => {
    // Final-step guard (should only submit on step 4)
    if (currentStep < 4) return;

    // Basic validation (mirrors wizard step rules)
    if (!formData.title || !formData.description || !formData.jobType) {
      toast({
        title: "Missing required fields",
        description: "Please fill in job title, description, and job type.",
      });
      return;
    }

    if (
      (formData.jobType === "onsite" || formData.jobType === "hybrid") &&
      !formData.location
    ) {
      toast({
        title: "Location required",
        description: "Location is required for onsite and hybrid jobs.",
      });
      return;
    }

    if (requirements.length === 0 || !requirements.some((r) => r.type === "mustHave")) {
      toast({
        title: "Requirements missing",
        description: "Add at least one must-have requirement.",
      });
      return;
    }

    if (!skills.length) {
      toast({
        title: "Skills missing",
        description: "Add at least one skill.",
      });
      return;
    }

    if (!emailTemplates.initial || !emailTemplates.initial.trim()) {
      toast({
        title: "Initial email required",
        description: "Provide an initial outreach email template.",
      });
      return;
    }

    try {
      const token = apiClient.getToken();
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to post jobs.",
        });
        return;
      }

      // Get current user to get company name
      const userResponse = await apiClient.getCurrentUser();
      const companyName = userResponse.user?.company_name || "Company";

      // Format requirements into add_notes string for storage (Rails-compatible)
      const addNotes =
        requirements.length > 0
          ? requirements
              .map(
                (r) =>
                  `${
                    r.type === "mustHave" ? "Must have" : "Nice to have"
                  } | ${r.text} | Weight: ${r.weight}`,
              )
              .join("\n")
          : undefined;

      // Prepare job data
      const goalNum = Number(formData.autoSourceGoal);

      const minSalaryNum = formData.minSalary
        ? Number(formData.minSalary)
        : NaN;
      const maxSalaryNum = formData.maxSalary
        ? Number(formData.maxSalary)
        : NaN;
      const hasSalary =
        Number.isFinite(minSalaryNum) && Number.isFinite(maxSalaryNum);
      const salaryString = hasSalary
        ? `$${minSalaryNum} - $${maxSalaryNum}`
        : undefined;

      const jobData = {
        title: formData.title,
        company: companyName,
        location:
          formData.jobType === "remote"
            ? "Remote"
            : formData.location || "Not specified",
        type: formData.jobType as "remote" | "hybrid" | "onsite",
        salary: salaryString,
        match_score: undefined,
        skills: skills,
        description: formData.description,
        addNotes,
        // Back-end will parse requirements when enabled (mirrors ch-job-marketplace "autopilot_sourcing")
        autopilot_sourcing: Boolean(formData.autoSource),
        target_count:
          formData.autoSource && Number.isFinite(goalNum) && goalNum > 0
            ? goalNum
            : null,
        distance:
          formData.jobType === "remote"
            ? null
            : formData.distanceFromLocation || null,
        days_in_office:
          formData.jobType === "hybrid" && formData.daysInOffice
            ? Number(formData.daysInOffice)
            : null,
        linkedin_url: formData.linkedInUrl || null,
        is_original_job: 1,
        is_automation: 0,
        automation_limit: null,
        in_mail_message: emailTemplates.initial,
        in_mail_message_2: emailTemplates.followup1 || null,
        in_mail_message_3: emailTemplates.followup2 || null,
        in_mail_message_day_2: followupDays.followup1 || 1,
        in_mail_message_day_3: followupDays.followup2 || 1,
        company_names: companiesToTarget.length ? companiesToTarget : undefined,
        rate: hasSalary ? formData.salaryRate : undefined,
      };

      // Create the job via API
      const response = await apiClient.createJob(jobData);

      if (response.success) {
        const created = (response as any)?.data;
        const newJobId = created?.id ? String(created.id) : null;

        sonnerToast.success("Job Posted!", {
          description: formData.autoSource
            ? "Sourcing candidates automatically..."
            : "Your job is now live.",
        });

        if (formData.autoSource && newJobId) {
          // ch-job-marketplace parity:
          // 1) show animated "autosourcing count" modal
          // 2) then open recommended candidates list (real DB-backed)
          setCreatedJobId(newJobId);
          setCreatedJobTitle(formData.title);
          setCreatedTargetCount(
            formData.autoSource && Number.isFinite(goalNum) && goalNum > 0 ? goalNum : 25,
          );
          setSourcingProgressOpen(true);
          // stay on page while modals handle next steps; user can close when done
          return;
        }

        // After a successful post without autosourcing, send the user to their jobs list.
        navigate("/employer/jobs");
        return;
      } else {
        throw new Error(response.error || "Failed to create job");
      }
    } catch (error: any) {
      console.error("Error creating job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to post job. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStep1 = () => (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-xl font-semibold text-foreground mb-6">
        Basic Information
      </h2>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Job Title *</Label>
          <Input
            id="title"
            placeholder="e.g. Senior Frontend Developer"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Job Description *</Label>
          <Textarea
            id="description"
            placeholder="Describe the role, responsibilities, and what you're looking for..."
            rows={8}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="resize-none"
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="jobType">Job Type *</Label>
            <Select
              value={formData.jobType}
              onValueChange={(value) =>
                setFormData({ ...formData, jobType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">Onsite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.jobType === "onsite" || formData.jobType === "hybrid") && (
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="e.g. San Francisco, CA"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                required
              />
            </div>
          )}

          {formData.jobType === "hybrid" && (
            <div className="space-y-2">
              <Label htmlFor="daysInOffice">Days in Office per Week</Label>
              <Select
                value={formData.daysInOffice}
                onValueChange={(value) =>
                  setFormData({ ...formData, daysInOffice: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="2">2 days</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="4">4 days</SelectItem>
                  <SelectItem value="5">5 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(formData.jobType === "onsite" || formData.jobType === "hybrid") && (
            <div className="space-y-2">
              <Label htmlFor="distance">Max Distance from Location</Label>
              <Select
                value={formData.distanceFromLocation}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    distanceFromLocation: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 miles</SelectItem>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                  <SelectItem value="100">100 miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedInUrl" className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            LinkedIn Job URL (optional)
          </Label>
          <Input
            id="linkedInUrl"
            placeholder="https://linkedin.com/jobs/..."
            value={formData.linkedInUrl}
            onChange={(e) =>
              setFormData({ ...formData, linkedInUrl: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <>
      {/* Skills */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Skills
            </h2>
            <p className="text-sm text-muted-foreground">
              Add skills required for this position
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void extractSkillsFromDescription()}
            disabled={!formData.description}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Extract from Job Description
          </Button>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Add a skill..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={addSkill}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="px-3 py-1 gap-2"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Requirements */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Requirements <span className="text-destructive">*</span>
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const run = async () => {
                if (!formData.description?.trim()) return;

                const t = sonnerToast.loading(
                  "Extracting requirements from job description...",
                );

                try {
                  const resp = await apiClient.extractJobRequirements(
                    formData.description,
                  );
                  const mustHave = Array.isArray(resp?.data?.must_have)
                    ? resp.data.must_have
                    : [];
                  const niceToHave = Array.isArray(resp?.data?.nice_to_have)
                    ? resp.data.nice_to_have
                    : [];

                  const toAdd: Requirement[] = [
                    ...mustHave.map((r: any) => ({
                      id: `${Date.now()}-mh-${r.requirement}`,
                      text: r.requirement,
                      type: "mustHave" as const,
                      weight:
                        typeof r.weightage === "number" ? r.weightage : 5,
                    })),
                    ...niceToHave.map((r: any) => ({
                      id: `${Date.now()}-nt-${r.requirement}`,
                      text: r.requirement,
                      type: "niceToHave" as const,
                      weight:
                        typeof r.weightage === "number" ? r.weightage : 3,
                    })),
                  ];

                  if (toAdd.length > 0) {
                    setRequirements((prev) => {
                      const existingTexts = new Set(prev.map((r) => r.text));
                      const merged = [...prev];
                      for (const r of toAdd) {
                        if (!existingTexts.has(r.text)) merged.push(r);
                      }
                      merged.sort((a, b) => {
                        const ra = a.type === "mustHave" ? 0 : 1;
                        const rb = b.type === "mustHave" ? 0 : 1;
                        return ra - rb;
                      });
                      return merged;
                    });

                    sonnerToast.success("Requirements extracted", {
                      id: t,
                      description: `Added ${toAdd.length} requirement${
                        toAdd.length !== 1 ? "s" : ""
                      } from job description.`,
                    });
                  } else {
                    sonnerToast.error("No requirements found", {
                      id: t,
                      description:
                        "Could not extract requirements from description. Please add requirements manually.",
                    });
                  }
                } catch (error: any) {
                  console.error("Error extracting requirements:", error);
                  sonnerToast.error("Extraction failed", {
                    id: t,
                    description:
                      error?.message ||
                      "Failed to extract requirements from description. Please try again.",
                  });
                }
              };

              void run();
            }}
            disabled={!formData.description}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Extract from Job Description
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb6">
          Add must-have and nice-to-have requirements with weights for AI
          matching
        </p>

        <div className="grid md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Add a requirement..."
              value={requirementInput}
              onChange={(e) => setRequirementInput(e.target.value)}
            />
          </div>
          <Select
            value={requirementType}
            onValueChange={(value: "mustHave" | "niceToHave") =>
              setRequirementType(value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mustHave">Must Have</SelectItem>
              <SelectItem value="niceToHave">Nice to Have</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              value={requirementWeight}
              onChange={(e) => {
                const next = e.target.value.replace(/[^0-9]/g, "");
                setRequirementWeight(next);
              }}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button type="button" variant="secondary" onClick={addRequirement}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {requirements.length > 0 && (
          <div className="space-y-2">
            {requirements.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      req.type === "mustHave" ? "default" : "secondary"
                    }
                  >
                    {req.type === "mustHave" ? "Must Have" : "Nice to Have"}
                  </Badge>
                  <span className="text-foreground">{req.text}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Weight: {req.weight}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRequirement(req.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderStep3 = () => (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-xl font-semibold text-foreground mb-6">
        Additional Settings
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Configure salary range and targeting options for this job.
      </p>

      <div className="space-y-6">
        {/* Salary range */}
        <div>
          <Label className="block mb-2">Salary Range (optional)</Label>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Minimum Salary
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.minSalary}
                  onChange={(e) => {
                    const next = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, minSalary: next });
                  }}
                  placeholder="e.g. 120000"
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Maximum Salary
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.maxSalary}
                  onChange={(e) => {
                    const next = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, maxSalary: next });
                  }}
                  placeholder="e.g. 160000"
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Rate</span>
              <Select
                value={formData.salaryRate}
                onValueChange={(value) =>
                  setFormData({ ...formData, salaryRate: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Per Year</SelectItem>
                  <SelectItem value="hour">Per Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Companies to target */}
        <div>
          <Label className="block mb-2">Companies to Target (optional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Add company names or types of companies you want the sourcing to
            focus on (e.g. FAANG, Data Infrastructure Platforms).
          </p>
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Add a company or segment..."
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const value = companyInput.trim();
                  if (!value) return;
                  if (!companiesToTarget.includes(value)) {
                    setCompaniesToTarget([...companiesToTarget, value]);
                  }
                  setCompanyInput("");
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const value = companyInput.trim();
                if (!value) return;
                if (!companiesToTarget.includes(value)) {
                  setCompaniesToTarget([...companiesToTarget, value]);
                }
                setCompanyInput("");
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {companiesToTarget.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {companiesToTarget.map((c) => (
                <Badge
                  key={c}
                  variant="secondary"
                  className="px-3 py-1 gap-2"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() =>
                      setCompaniesToTarget(
                        companiesToTarget.filter((v) => v !== c),
                      )
                    }
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Auto Source */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber" />
              <h2 className="font-display text-xl font-semibold text-foreground">
                Auto Source Candidates
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically source and rank candidates from our database when
              the job is posted. Uses AI to match and score candidates.
            </p>
          </div>
          <Switch
            checked={formData.autoSource}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, autoSource: checked })
            }
          />
        </div>

        {formData.autoSource && (
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="autoSourceGoal">
                Goal (number of candidates)
              </Label>
              <Input
                id="autoSourceGoal"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.autoSourceGoal}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^0-9]/g, "");
                  setFormData({ ...formData, autoSourceGoal: next });
                }}
                placeholder="e.g. 25"
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="text-xs text-muted-foreground">
                We’ll keep sourcing until we reach this many recommended
                candidates.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Email templates */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Automated Outreach Emails
            </h2>
            <p className="text-sm text-muted-foreground">
              Templates used to contact matched candidates. You can personalize
              them with placeholders.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[
            { key: "initial", label: "Initial Connect" },
            { key: "followup1", label: "First Follow-up" },
            { key: "followup2", label: "Second Follow-up" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`px-3 py-1 rounded-full text-sm border ${
                activeEmailTab === tab.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border"
              }`}
              onClick={() =>
                setActiveEmailTab(tab.key as "initial" | "followup1" | "followup2")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeEmailTab !== "initial" && (
          <div className="space-y-2 mb-4">
            <Label>Send this follow-up after</Label>
            <Select
              value={String(
                activeEmailTab === "followup1"
                  ? followupDays.followup1
                  : followupDays.followup2,
              )}
              onValueChange={(value) => {
                const num = Number(value) || 1;
                setFollowupDays((prev) => ({
                  followup1:
                    activeEmailTab === "followup1" ? num : prev.followup1,
                  followup2:
                    activeEmailTab === "followup2" ? num : prev.followup2,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} {d === 1 ? "day" : "days"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Email body</Label>
          <Textarea
            rows={10}
            value={emailTemplates[activeEmailTab]}
            onChange={(e) =>
              setEmailTemplates((prev) => ({
                ...prev,
                [activeEmailTab]: e.target.value,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            You can use placeholders like{" "}
            <code>{`{PERSON_NAME}`}</code>, <code>{`{ROLE_NAME}`}</code>, and{" "}
            <code>{`{COMPANY_NAME}`}</code>.
          </p>
        </div>
      </div>
    </div>
  );

  const canGoNext = () => {
    if (currentStep === 1) {
      return (
        !!formData.title &&
        !!formData.description &&
        !!formData.jobType &&
        !(
          (formData.jobType === "onsite" || formData.jobType === "hybrid") &&
          !formData.location
        )
      );
    }
    if (currentStep === 2) {
      return (
        skills.length > 0 &&
        requirements.length > 0 &&
        requirements.some((r) => r.type === "mustHave")
      );
    }
    if (currentStep === 3) {
      return true;
    }
    if (currentStep === 4) {
      return !!emailTemplates.initial && emailTemplates.initial.trim().length > 0;
    }
    return true;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
      default:
        return renderStep4();
    }
  };

  return (
    <DashboardLayout
      role="employer"
      navItems={employerNavItems}
    >
      <div className="max-w-4xl mx-auto">
        <SourcingProgressModal
          open={sourcingProgressOpen}
          onOpenChange={(open) => {
            setSourcingProgressOpen(open);
            if (!open) {
              // If user closes progress modal, just stay on this page.
              return;
            }
          }}
          jobTitle={createdJobTitle}
          targetCount={createdTargetCount}
          onDone={() => {
            setSourcingProgressOpen(false);
            // Redirect to Jobs page and open the Recommended tab for this job
            if (createdJobId) {
              navigate(`/employer/jobs?recommended=1&jobId=${createdJobId}`);
            } else {
              navigate(`/employer/jobs`);
            }
          }}
        />
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/employer/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Post a New Job
          </h1>
          <p className="text-muted-foreground">
            Step {currentStep} of 4 · Provide job details, requirements, skills,
            and sourcing settings.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            // Prevent accidental browser form submissions; we only submit via the explicit
            // "Post Job" button click on the final step.
            e.preventDefault();
          }}
          className="space-y-8"
        >
          {renderStep()}

          <div className="flex justify-between gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/employer/dashboard")}
            >
              Cancel
            </Button>
            <div className="flex gap-3 ml-auto">
              <Button
                type="button"
                variant="outline"
                disabled={currentStep === 1}
                onClick={() =>
                  setCurrentStep((s) => (s > 1 ? (s - 1) as 1 | 2 | 3 | 4 : s))
                }
              >
                Previous
              </Button>
              {currentStep < 4 ? (
                <Button
                  type="button"
                  variant="hero"
                  size="lg"
                  disabled={!canGoNext()}
                  onClick={() => {
                    if (canGoNext()) {
                      setCurrentStep((s) =>
                        (Math.min(s + 1, 4) as 1 | 2 | 3 | 4),
                      );
                    }
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="hero"
                  size="lg"
                  disabled={!canGoNext()}
                  onClick={() => {
                    void handleSubmit();
                  }}
                >
                  Post Job
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default NewJob;
