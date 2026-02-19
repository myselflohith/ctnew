import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Briefcase,
  User,
  Building2,
  Users,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Upload,
  Plus,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Role = "talent" | "employer" | "recruiter" | "admin";
type AuthMode = "signin" | "signup";

// Role mapping to integers
const roleMap: Record<Exclude<Role, "admin">, number> = {
  talent: 4,
  employer: 5,
  recruiter: 6,
};

// Public roles (Admin is assigned internally based on email)
const publicRoles: { id: Exclude<Role, "admin">; icon: React.ElementType; label: string; description: string }[] = [
  {
    id: "talent",
    icon: User,
    label: "Job Seeker",
    description: "Find and apply to jobs",
  },
  {
    id: "employer",
    icon: Building2,
    label: "Employer",
    description: "Post jobs and hire talent",
  },
  // {
  //   id: "recruiter",
  //   icon: Users,
  //   label: "Recruiter",
  //   description: "Manage clients and placements",
  // },
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [step, setStep] = useState<"role" | "form">("form");
  const [selectedRole, setSelectedRole] = useState<Exclude<Role, "admin">>(
    (searchParams.get("role") as Exclude<Role, "admin">) || "talent"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    companyName: "",
    organizationId: null as string | null,
  });

  // Company autocomplete (employer/recruiter signup)
  const [companyInputValue, setCompanyInputValue] = useState("");
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [companySuggestions, setCompanySuggestions] = useState<{ id: string; name: string }[]>([]);
  const [companySuggestionsLoading, setCompanySuggestionsLoading] = useState(false);
  const companySearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEmployerOrRecruiter = selectedRole === "employer" || selectedRole === "recruiter";

  useEffect(() => {
    if (!isEmployerOrRecruiter) return;
    const term = companyInputValue.trim();
    if (term.length === 0) {
      setCompanySuggestions([]);
      return;
    }
    if (companySearchTimeoutRef.current) clearTimeout(companySearchTimeoutRef.current);
    companySearchTimeoutRef.current = setTimeout(() => {
      setCompanySuggestionsLoading(true);
      apiClient
        .searchOrganizations(term, 10)
        .then((res) => {
          if (res.success && res.data) {
            setCompanySuggestions(
              res.data
                .filter((o): o is { id: string; name: string } => o.name != null)
                .map((o) => ({ id: o.id, name: o.name as string }))
            );
          } else {
            setCompanySuggestions([]);
          }
        })
        .catch(() => setCompanySuggestions([]))
        .finally(() => setCompanySuggestionsLoading(false));
    }, 300);
    return () => {
      if (companySearchTimeoutRef.current) clearTimeout(companySearchTimeoutRef.current);
    };
  }, [companyInputValue, isEmployerOrRecruiter]);

  const handleCompanySelect = (id: string, name: string) => {
    setFormData((prev) => ({ ...prev, companyName: name, organizationId: id }));
    setCompanyInputValue(name);
    setCompanyDropdownOpen(false);
  };

  const handleCreateNewOrganization = () => {
    const name = companyInputValue.trim();
    if (name) {
      setFormData((prev) => ({ ...prev, companyName: name, organizationId: null }));
      setCompanyDropdownOpen(false);
    }
  };

  const showCompanyCreateNew =
    isEmployerOrRecruiter &&
    companyInputValue.trim().length > 0 &&
    !companySuggestions.some((s) => s.name.toLowerCase() === companyInputValue.trim().toLowerCase());

  const handleRoleChange = (role: string) => {
    setSelectedRole(role as Exclude<Role, "admin">);
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only PDF, DOC, and DOCX files are allowed.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Resume must be less than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setResumeFile(file);
    }
  };

  const handleResumeUpload = async (token: string): Promise<boolean> => {
    if (!resumeFile) return true; // Resume is optional

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', resumeFile);

      const response = await fetch('/api/resumes/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: "Upload failed",
          description: error.error || "Failed to upload resume.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Resume uploaded",
        description: "Your resume has been uploaded successfully.",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Upload error",
        description: error.message || "Failed to upload resume.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup" && !acceptedTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the Privacy Policy and Terms of Service to continue.",
        variant: "destructive",
      });
      return;
    }

    // Employer signup: company is not asked here; only Admin can create employers (company set after login).
    const isEmployerSignup = mode === "signup" && selectedRole === "employer";
    const companyNameForValidation =
      isEmployerSignup ? "" : (formData.companyName?.trim() || (isEmployerOrRecruiter ? companyInputValue.trim() : ""));
    if (mode === "signup" && isEmployerOrRecruiter && !isEmployerSignup && !companyNameForValidation) {
      toast({
        title: "Company required",
        description: "Please select a company from the list or choose \"Create new organization\".",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "signup") {
        // Register new user
        const { register } = await import("@/lib/auth");
        // Use company name from form; if "Create new organization" was chosen, fallback to current input (state may not have flushed)
        const companyNameToSend =
          selectedRole === "employer"
            ? undefined
            : (formData.companyName?.trim() || (isEmployerOrRecruiter ? companyInputValue.trim() : undefined));
        const organizationIdToSend = selectedRole === "employer" ? undefined : (formData.organizationId ?? undefined);
        const user = await register({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          companyName: companyNameToSend || undefined,
          organizationId: organizationIdToSend,
          role: roleMap[selectedRole],
        });

        // Get token from response (it's stored in cookies and localStorage)
        // Check localStorage first using the correct key
        let token = localStorage.getItem('auth_token');
        
        // If no token in localStorage, try to login to get one for resume upload
        if (!token && selectedRole === "talent" && resumeFile) {
          try {
            const { login } = await import("@/lib/auth");
            await login(formData.email, formData.password);
            token = localStorage.getItem('auth_token') || '';
          } catch (error) {
            console.warn('Could not auto-login for resume upload:', error);
          }
        }

        // Upload resume if talent role and file is selected
        if (selectedRole === "talent" && resumeFile && token) {
          const uploadSuccess = await handleResumeUpload(token);
          if (!uploadSuccess) {
            // Resume upload failed but we'll continue
            console.warn('Resume upload failed, but account creation succeeded');
          }
        }

        toast({
          title: "Account created!",
          description: "Welcome to CardinalTalent!",
        });

        // Navigate to appropriate dashboard based on role
        const dashboardRoutes: Record<Role, string> = {
          talent: "/talent/dashboard",
          employer: "/employer/dashboard",
          recruiter: "/recruiter/dashboard",
          admin: "/admin/dashboard",
        };

        navigate(dashboardRoutes[user.role]);
      } else {
        // Login existing user
        const { login } = await import("@/lib/auth");
        const user = await login(formData.email, formData.password);

        toast({
          title: "Welcome back!",
          description: "Redirecting to your dashboard...",
        });

        // Navigate to appropriate dashboard based on role
        const dashboardRoutes: Record<Role, string> = {
          talent: "/talent/dashboard",
          employer: "/employer/dashboard",
          recruiter: "/recruiter/dashboard",
          admin: "/admin/dashboard",
        };

        navigate(dashboardRoutes[user.role]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Authentication failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    const newMode = mode === "signin" ? "signup" : "signin";
    setMode(newMode);
    setAcceptedTerms(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient" />
        <div className="absolute inset-0">
          <svg
            className="absolute bottom-0 left-0 right-0 w-full h-[70%] wave-flow"
            viewBox="0 0 1440 600"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="authWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(349, 78%, 44%)" stopOpacity="0.4" />
                <stop offset="50%" stopColor="hsl(38, 92%, 50%)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(45, 93%, 47%)" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <path
              d="M0,300 C200,250 400,350 600,300 C800,250 1000,350 1200,300 C1350,270 1440,300 1440,300 L1440,600 L0,600 Z"
              fill="url(#authWaveGradient)"
            />
            <path
              d="M0,380 C200,330 400,430 600,380 C800,330 1000,430 1200,380 C1350,350 1440,380 1440,380 L1440,600 L0,600 Z"
              fill="url(#authWaveGradient)"
              opacity="0.5"
            />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cardinal to-amber flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-3xl font-bold text-gradient">
              CardinalTalent
            </span>
          </Link>
          <h2 className="font-display text-2xl font-semibold text-center text-foreground mb-4">
            {mode === "signup"
              ? "Start Your Journey"
              : "Welcome Back"}
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            {mode === "signup"
              ? "Join thousands of companies and candidates transforming how they connect."
              : "Your next great opportunity is just a click away."}
          </p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cardinal to-amber flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gradient">
              CardinalTalent
            </span>
          </Link>

          {(
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
                {mode === "signup" ? "Create Account" : "Sign In"}
              </h1>
              <p className="text-muted-foreground mb-6">
                {mode === "signup"
                  ? "Create your account to get started"
                  : "Enter your credentials to continue"}
              </p>

              {/* Role Selection - Only show in signup */}
              {mode === "signup" && (
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-3 block">I am a...</Label>
                  <RadioGroup
                    value={selectedRole}
                    onValueChange={handleRoleChange}
                    className="flex flex-col gap-3"
                  >
                    {publicRoles.map((role) => (
                      <label
                        key={role.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedRole === role.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <RadioGroupItem value={role.id} id={role.id} />
                        <role.icon className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <span className="font-medium text-foreground">{role.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">— {role.description}</span>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "signup" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Employer: company not asked on signup (set after login). Recruiter: keep company selection. */}
                {mode === "signup" && selectedRole === "recruiter" && (
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Popover
                      open={companyDropdownOpen}
                      onOpenChange={setCompanyDropdownOpen}
                    >
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <Input
                            id="companyName"
                            placeholder="Type to search or create..."
                            value={companyInputValue}
                            onChange={(e) => {
                              setCompanyInputValue(e.target.value);
                              setFormData((prev) => ({ ...prev, companyName: "", organizationId: null }));
                              setCompanyDropdownOpen(true);
                            }}
                            onFocus={() => setCompanyDropdownOpen(true)}
                            autoComplete="off"
                            className={cn(
                              "pr-9",
                              !formData.companyName && "border-amber-500/50"
                            )}
                          />
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="max-h-[280px] overflow-auto">
                          {companySuggestionsLoading && (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                              Searching...
                            </div>
                          )}
                          {!companySuggestionsLoading &&
                            companySuggestions.length === 0 &&
                            companyInputValue.trim() && (
                              <div className="py-2 px-2 text-sm text-muted-foreground">
                                No matching organizations.
                              </div>
                            )}
                          {!companySuggestionsLoading &&
                            companySuggestions.map((org) => (
                              <button
                                key={org.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-sm flex items-center gap-2"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleCompanySelect(org.id, org.name);
                                }}
                              >
                                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                                {org.name}
                              </button>
                            ))}
                          {showCompanyCreateNew && (
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-sm flex items-center gap-2 border-t border-border text-primary font-medium"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleCreateNewOrganization();
                              }}
                            >
                              <Plus className="h-4 w-4 shrink-0" />
                              Create new organization
                            </button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {formData.companyName ? (
                      <p className="text-xs text-muted-foreground">
                        Selected: {formData.companyName}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Select a company from the list or create a new one.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {mode === "signup" && selectedRole === "talent" && (
                  <div className="space-y-2">
                    <Label>Resume (Optional)</Label>
                    <label className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeChange}
                        className="hidden"
                      />
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {resumeFile ? resumeFile.name : "Drop your resume here or click to upload"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, DOC, DOCX (Max 5MB)
                      </p>
                    </label>
                  </div>
                )}

                {mode === "signup" && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/30 border border-border">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <Link to="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>{" "}
                      and{" "}
                      <Link to="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </Link>
                    </label>
                  </div>
                )}

                {mode === "signin" && (
                  <div className="text-right">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  size="lg"
                  disabled={isLoading || (mode === "signup" && !acceptedTerms)}
                >
                  {isLoading
                    ? "Please wait..."
                    : mode === "signup"
                    ? "Create Account"
                    : "Sign In"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={switchMode}
                  className="text-primary hover:underline font-medium"
                >
                  {mode === "signup" ? "Sign in" : "Sign up"}
                </button>
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
