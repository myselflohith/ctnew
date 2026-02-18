import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  ArrowLeft,
  Plus,
  X,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { toast as sonnerToast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

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
    "mustHave"
  );
  const [requirementWeight, setRequirementWeight] = useState(5);
  const [orgRequirements, setOrgRequirements] = useState<Requirement[]>([]);
  const [requirementsLoaded, setRequirementsLoaded] = useState(false);

  // Load organization requirements on mount
  useEffect(() => {
    const loadOrgRequirements = async () => {
      try {
        const userResponse = await apiClient.getCurrentUser();
        if (userResponse.success && userResponse.user?.company_name) {
          const companyName = userResponse.user.company_name;
          const reqResponse = await apiClient.getOrganizationRequirements(companyName);
          if (reqResponse.success && reqResponse.data) {
            const orgReqs = reqResponse.data.map((req: any) => ({
              id: req.id,
              text: req.requirement_text,
              type: req.requirement_type,
              weight: req.weight,
            }));
            setOrgRequirements(orgReqs);
            // Automatically add must-have requirements to the job
            const mustHaveReqs = orgReqs.filter((r: Requirement) => r.type === "mustHave");
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
    if (requirementInput) {
      setRequirements([
        ...requirements,
        {
          id: Date.now().toString(),
          text: requirementInput,
          type: requirementType,
          weight: requirementWeight,
        },
      ]);
      setRequirementInput("");
      setRequirementWeight(5);
    }
  };

  const removeRequirement = (id: string) => {
    setRequirements(requirements.filter((r) => r.id !== id));
  };

  const extractSkillsFromDescription = () => {
    // Placeholder for AI extraction - will be replaced with actual AI service
    // For now, this is a simple keyword-based extraction
    const commonTechKeywords = [
      "React", "Vue", "Angular", "TypeScript", "JavaScript", "Node.js", 
      "Python", "Java", "C++", "Go", "Rust", "PostgreSQL", "MongoDB", 
      "AWS", "Azure", "GCP", "Docker", "Kubernetes", "GraphQL", "REST"
    ];
    
    const descriptionLower = formData.description.toLowerCase();
    const extractedSkills = commonTechKeywords.filter(keyword => 
      descriptionLower.includes(keyword.toLowerCase())
    );
    
    if (extractedSkills.length > 0) {
      setSkills([...new Set([...skills, ...extractedSkills])]);
      toast({
        title: "Skills Extracted",
        description: `Added ${extractedSkills.length} skill${extractedSkills.length !== 1 ? 's' : ''} from job description.`,
      });
    } else {
      toast({
        title: "No Skills Found",
        description: "Could not extract skills from description. Please add skills manually.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title || !formData.description || !formData.jobType) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (
      (formData.jobType === "onsite" || formData.jobType === "hybrid") &&
      !formData.location
    ) {
      toast({
        title: "Location Required",
        description: "Location is required for onsite and hybrid jobs.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get company name from user or use default
      const token = apiClient.getToken();
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to post jobs.",
          variant: "destructive",
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
                  `${r.type === "mustHave" ? "Must have" : "Nice to have"} | ${r.text} | Weight: ${r.weight}`
              )
              .join("\n")
          : undefined;

      // Prepare job data
      const jobData = {
        title: formData.title,
        company: companyName,
        location: formData.jobType === "remote" ? "Remote" : (formData.location || "Not specified"),
        type: formData.jobType as "remote" | "hybrid" | "onsite",
        salary: undefined,
        match_score: undefined,
        skills: skills,
        description: formData.description,
        addNotes,
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
      navItems={navItems}
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
            Fill in the details to post your job and start receiving applications.
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
                onClick={extractSkillsFromDescription}
                disabled={!formData.description}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Extract from Description
              </Button>
            </div>

            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Add a skill..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
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
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              Requirements
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Add must-have and nice-to-have requirements with weights for AI matching
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
                <Select
                  value={requirementWeight.toString()}
                  onValueChange={(value) => setRequirementWeight(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Weight" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                      <SelectItem key={w} value={w.toString()}>
                        Weight: {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  Automatically source and rank candidates from our database when the
                  job is posted. Uses AI to match and score candidates.
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
