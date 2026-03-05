 import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [requirementInput, setRequirementInput] = useState("");
  const [requirementType, setRequirementType] = useState<"mustHave" | "niceToHave">(
    "mustHave",
  );
  const [requirementWeight, setRequirementWeight] = useState<string>("5");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title || !formData.description || !formData.jobType) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
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

    try {
      const token = apiClient.getToken();
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to post jobs.",
        });
        return;
      }

      if (!requirements.some((r) => r.type === "mustHave")) {
        toast({
          title: "Requirements missing",
          description: "At least 1 must have requirement is needed.",
        });
        return;
      }

      // Get current user to get company name
      const userResponse = await apiClient.getCurrentUser();
      const companyName = userResponse.user?.company_name || "Company";

      // Format requirements into add_notes string for storage
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
      const jobData = {
        title: formData.title,
        company: companyName,
        location:
          formData.jobType === "remote"
            ? "Remote"
            : formData.location || "Not specified",
        type: formData.jobType as "remote" | "hybrid" | "onsite",
        salary: undefined,
        match_score: undefined,
        skills: skills,
        description: formData.description,
        addNotes,
        // Back-end will parse requirements when enabled (mirrors ch-job-marketplace "autopilot_sourcing")
        autopilot_sourcing: Boolean(formData.autoSource),
      };

      // Create the job via API
      const response = await apiClient.createJob(jobData);

      if (response.success) {
        sonnerToast.success("Job Posted!", {
          description: formData.autoSource
            ? "Sourcing candidates automatically..."
            : "Your job is now live.",
        });
        navigate("/employer/dashboard");
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

  return (
    <DashboardLayout
      role="employer"
      navItems={employerNavItems}
      userName="Jane Smith"
      companyName="TechCorp AI"
    >
      <div className="max-w-4xl mx-auto">
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
            Fill in the details to post your job and start receiving
            applications.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
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

                {(formData.jobType === "onsite" ||
                  formData.jobType === "hybrid") && (
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
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(formData.jobType === "onsite" ||
                  formData.jobType === "hybrid") && (
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

                    const t = sonnerToast.loading("Extracting requirements from job description...");

                    try {
                      const resp = await apiClient.extractJobRequirements(formData.description);
                      const mustHave = Array.isArray(resp?.data?.must_have) ? resp.data.must_have : [];
                      const niceToHave = Array.isArray(resp?.data?.nice_to_have) ? resp.data.nice_to_have : [];

                      const toAdd: Requirement[] = [
                        ...mustHave.map((r: any) => ({
                          id: `${Date.now()}-mh-${r.requirement}`,
                          text: r.requirement,
                          type: "mustHave" as const,
                          weight: typeof r.weightage === "number" ? r.weightage : 5,
                        })),
                        ...niceToHave.map((r: any) => ({
                          id: `${Date.now()}-nt-${r.requirement}`,
                          text: r.requirement,
                          type: "niceToHave" as const,
                          weight: typeof r.weightage === "number" ? r.weightage : 3,
                        })),
                      ];

                      if (toAdd.length > 0) {
                        setRequirements((prev) => {
                          const existingTexts = new Set(prev.map((r) => r.text));
                          const merged = [...prev];
                          for (const r of toAdd) {
                            if (!existingTexts.has(r.text)) merged.push(r);
                          }

                          // Ensure Must Have requirements are always listed first.
                          merged.sort((a, b) => {
                            const ra = a.type === "mustHave" ? 0 : 1;
                            const rb = b.type === "mustHave" ? 0 : 1;
                            return ra - rb;
                          });

                          return merged;
                        });

                        sonnerToast.success("Requirements extracted", {
                          id: t,
                          description: `Added ${toAdd.length} requirement${toAdd.length !== 1 ? "s" : ""} from job description.`,
                        });
                      } else {
                        sonnerToast.error("No requirements found", {
                          id: t,
                          description: "Could not extract requirements from description. Please add requirements manually.",
                        });
                      }
                    } catch (error: any) {
                      console.error("Error extracting requirements:", error);
                      sonnerToast.error("Extraction failed", {
                        id: t,
                        description:
                          error?.message || "Failed to extract requirements from description. Please try again.",
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
            <p className="text-sm text-muted-foreground mb-6">
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
                    // Numeric-only (prevents NaN + ensures user can type)
                    const next = e.target.value.replace(/[^0-9]/g, "");
                    setRequirementWeight(next);
                  }}
                  onBlur={() => {
                    const weightNum = Number(requirementWeight);
                    if (!Number.isFinite(weightNum)) {
                      setRequirementWeight("5");
                      return;
                    }
                    if (weightNum < 1 || weightNum > 10) {
                      toast({
                        title: "Invalid weight",
                        description: "Weight must be between 1 and 10 (inclusive).",
                      });
                      // Keep what the user typed; don't auto-clamp.
                    }
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
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/employer/dashboard")}
            >
              Cancel
            </Button>
            <Button type="submit" variant="hero" size="lg">
              Post Job
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default NewJob;
