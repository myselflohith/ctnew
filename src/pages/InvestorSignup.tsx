import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  ShieldCheck,
  Upload,
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  MapPin,
  Linkedin,
  Check,
} from "lucide-react";
import cardinalLogo from "@/assets/cardinal-logo.png";

const COUNTRY_PHONE = [
  { code: "+1", flag: "🇺🇸", label: "United States" },
  { code: "+44", flag: "🇬🇧", label: "United Kingdom" },
  { code: "+91", flag: "🇮🇳", label: "India" },
  { code: "+49", flag: "🇩🇪", label: "Germany" },
  { code: "+33", flag: "🇫🇷", label: "France" },
  { code: "+81", flag: "🇯🇵", label: "Japan" },
  { code: "+61", flag: "🇦🇺", label: "Australia" },
  { code: "+86", flag: "🇨🇳", label: "China" },
  { code: "+65", flag: "🇸🇬", label: "Singapore" },
  { code: "+971", flag: "🇦🇪", label: "UAE" },
];

const STAGE_OPTIONS = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Seed / Series A",
  "All stages",
];

const INVESTMENT_SIZE_OPTIONS = [
  "$25K – $250K",
  "$250K – $500K",
  "$500K – $1M",
  "$1M – $5M",
  "$5M+",
];

const PROOF_TYPES = [
  "Recent tax form (W-2, 1099, K-1, or similar)",
  "Brokerage/bank statement",
  "Professional credentials (e.g. FINRA, CPA)",
];

const RIGHT_BENEFITS = [
  "Qualified deal flow from top universities, accelerators, and syndicates",
  "Network with trusted founders and fellow investors",
  "Access early-stage investment opportunities",
];

const InvestorSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("+1");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [password, setPassword] = useState("");

  const [accreditedConfirmed, setAccreditedConfirmed] = useState(false);
  const [accreditationCriteria, setAccreditationCriteria] = useState<"income" | "networth" | "">("");
  const [proofType, setProofType] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [stagePreference, setStagePreference] = useState("");
  const [sectors, setSectors] = useState("");
  const [investmentSize, setInvestmentSize] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accreditedConfirmed) {
      toast({
        title: "Accreditation required",
        description: "You must confirm that you are an accredited investor under SEC Rule 501(a).",
        variant: "destructive",
      });
      return;
    }
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
    setIsLoading(true);
    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        role: 2,
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
      {/* Header */}
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

      {/* 3-column layout: Left sidebar | Center form | Right sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left sidebar - Investment Preferences (~25%) */}
          <aside className="lg:col-span-3 space-y-6 order-2 lg:order-1">
            <div className="bg-card rounded-lg border border-border p-4 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-4xl text-muted-foreground mb-3">
                👤
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Your profile photo will appear after signup.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Secure & confidential. All data is encrypted.
              </p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3">3. Investment Preferences</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Stage Preference</Label>
                  <Select value={stagePreference} onValueChange={setStagePreference}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seed / Series A" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sectors Interested In</Label>
                  <Input
                    placeholder="e.g. AI, HealthTech, SaaS, FinTech"
                    value={sectors}
                    onChange={(e) => setSectors(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Typical Investment Size</Label>
                  <Select value={investmentSize} onValueChange={setInvestmentSize}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="$25K – $250K" />
                    </SelectTrigger>
                    <SelectContent>
                      {INVESTMENT_SIZE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </aside>

          {/* Center - Main form (~50%) */}
          <main className="lg:col-span-6 order-1 lg:order-2">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
              Join Cardinal Talent as an accredited investor
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              Create your account to discover exclusive startup deal flow.
            </p>

            <form id="investor-signup-form" onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Personal Information */}
              <section className="space-y-3">
                <h2 className="font-semibold text-foreground">1. Personal Information</h2>
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-sm">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="e.g., David Knox"
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
                        placeholder="e.g., david.knox@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Phone Number</Label>
                    <div className="flex gap-2">
                      <Select value={phoneCountry} onValueChange={setPhoneCountry}>
                        <SelectTrigger className="w-[100px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_PHONE.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="(555) 123-4567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-9 h-9"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dob" className="text-sm">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="dob"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-sm">Residential Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="address"
                        placeholder="e.g., 123 Elm St, Palo Alto, CA 94301"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="linkedin" className="text-sm">LinkedIn Profile URL</Label>
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
                </div>
              </section>

              {/* 2. Investor Accreditation - only these options when checkbox is selected */}
              <section className="space-y-3">
                <h2 className="font-semibold text-foreground">2. Investor Accreditation</h2>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="accredited"
                    checked={accreditedConfirmed}
                    onCheckedChange={(v) => setAccreditedConfirmed(v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="accredited" className="text-sm text-foreground cursor-pointer leading-tight">
                    I am an accredited investor under SEC Rule 501(a):
                  </label>
                </div>
                {accreditedConfirmed && (
                  <>
                    <RadioGroup
                      value={accreditationCriteria}
                      onValueChange={(v) => setAccreditationCriteria(v as "income" | "networth")}
                      className="flex flex-col gap-2 ml-6"
                    >
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <RadioGroupItem value="income" id="income" />
                        Annual income over $200k individually or $300k jointly (past 2 years)
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <RadioGroupItem value="networth" id="networth" />
                        Net worth over $1 million (excluding primary residence)
                      </label>
                    </RadioGroup>
                    <div className="ml-6 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Upload proof of accreditation (optional, for faster approval)
                      </p>
                      <RadioGroup value={proofType} onValueChange={setProofType} className="flex flex-col gap-1.5">
                        {PROOF_TYPES.map((opt) => (
                          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                            <RadioGroupItem value={opt} id={opt} />
                            {opt}
                          </label>
                        ))}
                      </RadioGroup>
                      <Button type="button" variant="outline" size="sm" className="gap-1" asChild>
                        <label className="cursor-pointer">
                          <Upload className="w-4 h-4" />
                          Upload File
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.png"
                            className="hidden"
                            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      </Button>
                    </div>
                  </>
                )}
              </section>

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
            </form>
          </main>

          {/* Right sidebar - Benefits + CTA (~25%) */}
          <aside className="lg:col-span-3 space-y-6 order-3">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <ShieldCheck className="w-5 h-5 text-primary" />
                FOR ACCREDITED INVESTORS ONLY
              </div>
              <ul className="space-y-2">
                {RIGHT_BENEFITS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground mb-1">
                <Check className="w-4 h-4 text-primary" />
                ACCREDITED INVESTORS ONLY
              </div>
              <p className="text-xs text-muted-foreground">
                U.S. SEC-Qualified · Confidential · Encrypted
              </p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-1">Security & Consent</h3>
              <ul className="space-y-2 mb-4">
                {RIGHT_BENEFITS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">Sign Up as an Accredited Investor</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your account to discover exclusive startup deal flow.
                </p>
              </div>
              <Button
                type="submit"
                form="investor-signup-form"
                variant="hero"
                size="lg"
                className="w-full gap-2"
                disabled={isLoading || !accreditedConfirmed || !acceptedTerms}
              >
                {isLoading ? "Creating account…" : "Sign Up & Join"}
                <ArrowRight className="w-5 h-5" />
              </Button>
              <p className="text-xs text-muted-foreground">
                Cardinal Talent is for accredited investors only. All info is secure and confidential. By signing up, you agree to our{" "}
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
