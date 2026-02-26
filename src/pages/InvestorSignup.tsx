import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { register } from "@/lib/auth";
import {
  ArrowRight,
  Mail,
  Lock,
  User,
  MapPin,
  Linkedin,
  Building2,
  Briefcase,
  AtSign,
  Camera,
} from "lucide-react";
import cardinalLogo from "@/assets/cardinal-logo.png";

const STAGE_OPTIONS = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Seed / Series A",
  "All stages",
];

const GEOGRAPHY_OPTIONS = [
  "North America",
  "Europe",
  "Asia",
  "Global",
  "Other",
];

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.-]/g, "");
}

function suggestHandle(fullName: string, email: string): string {
  const fromName = slugFromName(fullName);
  if (fromName) return fromName;
  const local = email.split("@")[0]?.trim() || "";
  return local.toLowerCase().replace(/[^a-z0-9.-]/g, "") || "investor";
}

const InvestorSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [useAutoHandle, setUseAutoHandle] = useState(true);
  const [password, setPassword] = useState("");

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [stagePreference, setStagePreference] = useState("");
  const [industryInterests, setIndustryInterests] = useState("");
  const [geography, setGeography] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [employerFirm, setEmployerFirm] = useState("");
  const [priorInvestments, setPriorInvestments] = useState("");

  const suggestedHandle = useMemo(
    () => suggestHandle(fullName, email),
    [fullName, email]
  );
  const displayHandle = useAutoHandle ? suggestedHandle : username;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast({
        title: "Terms required",
        description: "Please agree to the Terms of Service and Privacy Policy.",
        variant: "destructive",
      });
      return;
    }
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ") ?? "";
    if (!firstName || !email || !password) {
      toast({
        title: "Required fields",
        description: "Please enter full name, email, and password.",
        variant: "destructive",
      });
      return;
    }
    const finalUsername =
      displayHandle?.trim() || suggestHandle(fullName, email);
    if (!finalUsername) {
      toast({
        title: "Username required",
        description: "Choose a username or use the auto-generated handle.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        role: 2,
        username: finalUsername,
        location: location.trim() || null,
        linkedinUrl: linkedInUrl.trim() || null,
        twitterUrl: twitterUrl.trim() || null,
        bio: bio.trim() || null,
        investmentInterests: [stagePreference, industryInterests, geography]
          .filter(Boolean)
          .join("; ") || null,
        priorInvestments: priorInvestments.trim() || null,
        companyName: employerFirm.trim() || null,
      });
      toast({ title: "Account created!", description: "Welcome. Redirecting to your dashboard." });
      navigate("/investors");
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Registration failed.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={cardinalLogo} alt="Cardinal Talent" className="w-9 h-9 object-contain" />
            <span className="font-display text-lg font-bold text-foreground">Cardinal Talent</span>
          </Link>
          <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left sidebar - Profile preview & investment preferences */}
          <aside className="lg:col-span-3 space-y-6 order-2 lg:order-1">
            <label className="bg-card rounded-lg border border-border p-4 flex flex-col items-center cursor-pointer hover:bg-muted/30 transition-colors group">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setProfilePhoto(e.target.files?.[0] ?? null)}
              />
              <div className="relative w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden text-4xl text-muted-foreground ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
                {profilePhoto ? (
                  <img
                    src={URL.createObjectURL(profilePhoto)}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "👤"
                )}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground mt-2 text-center">
                {profilePhoto ? "Click to change photo" : "Click to upload profile photo"}
              </span>
            </label>
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3">2. Investment preferences</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Stage</Label>
                  <Select value={stagePreference} onValueChange={setStagePreference}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="e.g. Seed / Series A" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Industry</Label>
                  <Input
                    placeholder="e.g. AI, HealthTech, SaaS"
                    value={industryInterests}
                    onChange={(e) => setIndustryInterests(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Geography</Label>
                  <Select value={geography} onValueChange={setGeography}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="e.g. North America" />
                    </SelectTrigger>
                    <SelectContent>
                      {GEOGRAPHY_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </aside>

          {/* Center - Main form */}
          <main className="lg:col-span-6 order-1 lg:order-2">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
              Join StartupSphere as an investor
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              Create your account to discover exclusive startup deal flow.
            </p>

            <form id="investor-signup-form" onSubmit={handleSubmit} className="space-y-6">
              <section className="space-y-3">
                <h2 className="font-semibold text-foreground">1. Personal information</h2>
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-sm">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="e.g., Jane Smith"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-9 h-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="e.g., jane@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-sm">Username / Handle</Label>
                    <div className="flex gap-2 items-center flex-wrap">
                      <div className="relative flex-1 min-w-[140px]">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="username"
                          placeholder={useAutoHandle ? suggestedHandle : "your.handle"}
                          value={useAutoHandle ? "" : username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-9 h-9"
                          disabled={useAutoHandle}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
                        <Checkbox
                          checked={useAutoHandle}
                          onCheckedChange={(v) => setUseAutoHandle(v === true)}
                        />
                        Auto-generate
                      </label>
                    </div>
                    {useAutoHandle && (
                      <p className="text-xs text-muted-foreground">
                        Suggested: <span className="font-medium text-foreground">{suggestedHandle}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 h-9"
                        minLength={8}
                        required
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-sm">Location (city)</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="e.g., San Francisco, CA"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bio" className="text-sm">Bio</Label>
                    <textarea
                      id="bio"
                      placeholder="Short bio or background"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="linkedin" className="text-sm">LinkedIn</Label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="linkedin"
                        type="url"
                        placeholder="https://www.linkedin.com/in/yourprofile"
                        value={linkedInUrl}
                        onChange={(e) => setLinkedInUrl(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="twitter" className="text-sm">Twitter / X</Label>
                    <div className="relative">
                      <Input
                        id="twitter"
                        type="url"
                        placeholder="https://twitter.com/yourhandle"
                        value={twitterUrl}
                        onChange={(e) => setTwitterUrl(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="employerFirm" className="text-sm">Employer / Firm name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="employerFirm"
                        placeholder="e.g., Acme Ventures"
                        value={employerFirm}
                        onChange={(e) => setEmployerFirm(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="priorInvestments" className="text-sm">Prior investments (optional)</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <textarea
                        id="priorInvestments"
                        placeholder="Notable prior investments or experience"
                        value={priorInvestments}
                        onChange={(e) => setPriorInvestments(e.target.value)}
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </form>
          </main>

          {/* Right sidebar - CTA */}
          <aside className="lg:col-span-3 space-y-6 order-3">
            <div className="bg-card rounded-lg border border-border p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">Create your investor account</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Join to discover startup deal flow and connect with founders.
                </p>
              </div>
              <Button
                type="submit"
                form="investor-signup-form"
                variant="hero"
                size="lg"
                className="w-full gap-2"
                disabled={isLoading || !acceptedTerms}
              >
                {isLoading ? "Creating account…" : "Sign up"}
                <ArrowRight className="w-5 h-5" />
              </Button>
              <p className="text-xs text-muted-foreground">
                By signing up, you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
                I agree to the Terms of Service and Privacy Policy
              </label>
            </div>
          </aside>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          Already have an account?{" "}
          <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default InvestorSignup;
