import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { Plus, Sparkles, X } from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type?: "remote" | "hybrid" | "onsite" | null;
  salary?: string;
  match_score?: number;
  skills?: string[];
  description?: string;
  autopilot_sourcing?: boolean;
  target_count?: number | null;
  distance?: string | null;
  days_in_office?: number | null;
  add_notes?: string | null;
}

interface EditJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  onSave: (jobId: string, jobData: Partial<Job>) => Promise<void>;
}

const EditJobModal = ({ open, onOpenChange, job, onSave }: EditJobModalProps) => {
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
    minSalary: "",
    maxSalary: "",
    salaryRate: "year",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [requirements, setRequirements] = useState<
    { id: string; text: string; type: "mustHave" | "niceToHave"; weight: number }[]
  >([]);
  const [requirementInput, setRequirementInput] = useState("");
  const [requirementType, setRequirementType] = useState<"mustHave" | "niceToHave">(
    "mustHave",
  );
  const [requirementWeight, setRequirementWeight] = useState<string>("5");
  const [emailTemplates, setEmailTemplates] = useState<{
    initial: string;
    followup1: string;
    followup2: string;
  }>({
    initial: "",
    followup1: "",
    followup2: "",
  });
  const [followupDays, setFollowupDays] = useState<{ followup1: number; followup2: number }>(
    {
      followup1: 1,
      followup2: 1,
    },
  );
  const [activeEmailTab, setActiveEmailTab] = useState<"initial" | "followup1" | "followup2">(
    "initial",
  );
  const [saving, setSaving] = useState(false);

  // Update form data when job changes
  useEffect(() => {
    if (job) {
      // Try to derive min/max salary from existing salary string, e.g. "$120000 - $150000"
      let minSalary = "";
      let maxSalary = "";
      if (job.salary) {
        const numericParts = String(job.salary)
          .replace(/[\$,]/g, "")
          .match(/\d+/g);
        if (numericParts && numericParts.length > 0) {
          minSalary = numericParts[0] || "";
          maxSalary = numericParts[1] || numericParts[0] || "";
        }
      }

      setFormData({
        title: job.title || "",
        description: job.description || "",
        jobType: job.type || "remote",
        location: job.location || "",
        distanceFromLocation: job.distance != null ? String(job.distance) : "",
        daysInOffice:
          job.days_in_office != null ? String(job.days_in_office) : "",
        linkedInUrl: "",
        autoSource: Boolean(job.autopilot_sourcing),
        autoSourceGoal: job.target_count ? String(job.target_count) : "25",
        minSalary,
        maxSalary,
        salaryRate: "year",
      });
      setSkills(job.skills || []);

      // Parse existing add_notes back into structured requirements
      if (job.add_notes) {
        const lines = String(job.add_notes)
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        const parsed: {
          id: string;
          text: string;
          type: "mustHave" | "niceToHave";
          weight: number;
        }[] = [];
        for (const line of lines) {
          // Expected format: "Must have | text | Weight: 5"
          const parts = line.split("|").map((p) => p.trim());
          if (parts.length < 2) continue;
          const typeLabel = parts[0].toLowerCase();
          const text = parts[1];
          const type: "mustHave" | "niceToHave" =
            typeLabel.startsWith("must") ? "mustHave" : "niceToHave";
          let weight = 5;
          const weightPart = parts.find((p) =>
            p.toLowerCase().startsWith("weight"),
          );
          if (weightPart) {
            const m = weightPart.match(/(\d+)/);
            if (m) {
              const n = Number(m[1]);
              if (Number.isFinite(n) && n >= 1 && n <= 10) {
                weight = n;
              }
            }
          }
          parsed.push({
            id: `${Date.now()}-${parsed.length}`,
            text,
            type,
            weight,
          });
        }
        if (parsed.length) {
          setRequirements(parsed);
        }
      } else {
        setRequirements([]);
      }
    }
  }, [job]);

  if (!job) return null;

  const handleSave = async () => {
    // Build update payload similar to create job
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
      : job.salary;

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

    const updatePayload: Partial<Job> & {
      addNotes?: string;
      distance?: string | null;
      days_in_office?: number | string | null;
      linkedin_url?: string | null;
      autopilot_sourcing?: boolean;
      target_count?: number | null;
      in_mail_message?: string | null;
      in_mail_message_2?: string | null;
      in_mail_message_3?: string | null;
      in_mail_message_day_2?: number | null;
      in_mail_message_day_3?: number | null;
      rate?: string | null;
      skills?: string[];
    } = {
      title: formData.title || job.title,
      location:
        formData.jobType === "remote"
          ? "Remote"
          : formData.location || job.location,
      type: (formData.jobType || job.type || "remote") as
        | "remote"
        | "hybrid"
        | "onsite",
      salary: salaryString,
      description: formData.description || job.description,
      skills: skills,
      addNotes,
      distance:
        formData.jobType === "remote"
          ? null
          : formData.distanceFromLocation || null,
      days_in_office:
        formData.jobType === "hybrid" && formData.daysInOffice
          ? Number(formData.daysInOffice)
          : null,
      linkedin_url: formData.linkedInUrl || null,
      autopilot_sourcing: Boolean(formData.autoSource),
      target_count:
        formData.autoSource && Number.isFinite(goalNum) && goalNum > 0
          ? goalNum
          : null,
      in_mail_message: emailTemplates.initial || null,
      in_mail_message_2: emailTemplates.followup1 || null,
      in_mail_message_3: emailTemplates.followup2 || null,
      in_mail_message_day_2: followupDays.followup1 || 1,
      in_mail_message_day_3: followupDays.followup2 || 1,
      rate: hasSalary ? formData.salaryRate : null,
    };

    setSaving(true);
    try {
      await onSave(job.id, updatePayload);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving job:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
          <DialogDescription>
            Update all details of this job. These are the same questions used when
            creating a new job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="glass rounded-2xl p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Job Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Senior Frontend Developer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Job Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={6}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
                className="resize-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Type *</Label>
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
                  <Label>Location *</Label>
                  <Input
                    placeholder="e.g. San Francisco, CA"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {formData.jobType === "hybrid" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Days in Office per Week</Label>
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
              </div>
            )}

            {(formData.jobType === "onsite" || formData.jobType === "hybrid") && (
              <div className="space-y-2">
                <Label>Max Distance from Location</Label>
                <Select
                  value={formData.distanceFromLocation}
                  onValueChange={(value) =>
                    setFormData({ ...formData, distanceFromLocation: value })
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

          {/* Skills */}
          <div className="glass rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Skills</h3>
                <p className="text-xs text-muted-foreground">
                  Add skills required for this position.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (skillInput && !skills.includes(skillInput)) {
                      setSkills([...skills, skillInput]);
                      setSkillInput("");
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (skillInput && !skills.includes(skillInput)) {
                    setSkills([...skills, skillInput]);
                    setSkillInput("");
                  }
                }}
              >
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
                      onClick={() => setSkills(skills.filter((s) => s !== skill))}
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
          <div className="glass rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Requirements <span className="text-destructive">*</span>
              </h3>
            </div>
            <div className="grid md:grid-cols-4 gap-3 items-start">
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
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!requirementInput.trim()) return;
                    const weightNum = Number(requirementWeight) || 5;
                    const newReq = {
                      id: Date.now().toString(),
                      text: requirementInput,
                      type: requirementType,
                      weight: weightNum,
                    };
                    setRequirements((prev) => {
                      const next = [...prev, newReq];
                      next.sort((a, b) => {
                        const ra = a.type === "mustHave" ? 0 : 1;
                        const rb = b.type === "mustHave" ? 0 : 1;
                        return ra - rb;
                      });
                      return next;
                    });
                    setRequirementInput("");
                    setRequirementWeight("5");
                  }}
                >
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
                        variant={req.type === "mustHave" ? "default" : "secondary"}
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
                        onClick={() =>
                          setRequirements(requirements.filter((r) => r.id !== req.id))
                        }
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

          {/* Salary & Autosourcing */}
          <div className="glass rounded-2xl p-4 space-y-4">
            <h3 className="font-semibold">Additional Settings</h3>
            <div className="space-y-4">
              <div>
                <Label className="block mb-2">Salary Range (optional)</Label>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Minimum</span>
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
                    <span className="text-xs text-muted-foreground">Maximum</span>
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

              <div className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber" />
                    <span className="font-medium">Auto Source Candidates</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically source and rank candidates from the database.
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
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Goal (number of candidates)</Label>
                    <Input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.autoSourceGoal}
                      onChange={(e) => {
                        const next = e.target.value.replace(/[^0-9]/g, "");
                        setFormData({ ...formData, autoSourceGoal: next });
                      }}
                      placeholder="e.g. 25"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Outreach Emails */}
          <div className="glass rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold">Automated Outreach Emails</h3>
                <p className="text-xs text-muted-foreground">
                  Templates used to contact matched candidates.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              {[
                { key: "initial", label: "Initial Connect" },
                { key: "followup1", label: "First Follow-up" },
                { key: "followup2", label: "Second Follow-up" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`px-3 py-1 rounded-full text-xs border ${
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
              <div className="space-y-2 mb-3">
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
                rows={8}
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
                <code>{`{PERSON_NAME}`}</code>,{" "}
                <code>{`{ROLE_NAME}`}</code>, and{" "}
                <code>{`{COMPANY_NAME}`}</code>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditJobModal;
