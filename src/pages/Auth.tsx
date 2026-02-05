import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Briefcase,
  User,
  Building2,
  Users,
  ShieldCheck,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Role = "talent" | "employer" | "recruiter" | "admin";
type AuthMode = "signin" | "signup";

const roles: { id: Role; icon: React.ElementType; label: string; description: string }[] = [
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
  {
    id: "recruiter",
    icon: Users,
    label: "Recruiter",
    description: "Manage clients and placements",
  },
  {
    id: "admin",
    icon: ShieldCheck,
    label: "Administrator",
    description: "Platform administration",
  },
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [step, setStep] = useState<"role" | "form">(
    searchParams.get("role") ? "form" : mode === "signup" ? "role" : "form"
  );
  const [selectedRole, setSelectedRole] = useState<Role | null>(
    (searchParams.get("role") as Role) || null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    companyName: "",
  });

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call - will be replaced with actual auth
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: mode === "signup" ? "Account created!" : "Welcome back!",
      description:
        mode === "signup"
          ? "Please check your email to verify your account."
          : "Redirecting to your dashboard...",
    });

    setIsLoading(false);

    // Navigate to appropriate dashboard based on role
    const dashboardRoutes: Record<Role, string> = {
      talent: "/talent/dashboard",
      employer: "/employer/dashboard",
      recruiter: "/recruiter/dashboard",
      admin: "/admin/dashboard",
    };

    if (selectedRole || mode === "signin") {
      navigate(dashboardRoutes[selectedRole || "talent"]);
    }
  };

  const switchMode = () => {
    const newMode = mode === "signin" ? "signup" : "signin";
    setMode(newMode);
    if (newMode === "signup") {
      setStep("role");
      setSelectedRole(null);
    } else {
      setStep("form");
    }
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

          {mode === "signup" && step === "role" ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
                Choose Your Role
              </h1>
              <p className="text-muted-foreground mb-8">
                Select how you'll be using CardinalTalent
              </p>

              <div className="grid grid-cols-2 gap-4">
                {roles.map((role) => (
                  <motion.button
                    key={role.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect(role.id)}
                    className={`role-card text-left ${
                      selectedRole === role.id ? "selected" : ""
                    }`}
                  >
                    <role.icon className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">
                      {role.label}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  </motion.button>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground mt-8">
                Already have an account?{" "}
                <button
                  onClick={switchMode}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              {mode === "signup" && (
                <button
                  onClick={() => setStep("role")}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to role selection
                </button>
              )}

              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
                {mode === "signup" ? "Create Account" : "Sign In"}
              </h1>
              <p className="text-muted-foreground mb-8">
                {mode === "signup"
                  ? `Signing up as ${roles.find((r) => r.id === selectedRole)?.label}`
                  : "Enter your credentials to continue"}
              </p>

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

                {mode === "signup" &&
                  (selectedRole === "employer" || selectedRole === "recruiter") && (
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        placeholder="Acme Inc."
                        value={formData.companyName}
                        onChange={(e) =>
                          setFormData({ ...formData, companyName: e.target.value })
                        }
                        required
                      />
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
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Drop your resume here or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, DOC, DOCX (Max 5MB)
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
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
