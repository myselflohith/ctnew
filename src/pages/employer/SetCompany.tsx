import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Mail } from "lucide-react";
import { apiClient } from "@/lib/api";
import cardinalLogo from "@/assets/cardinal-logo.png";

/** Normalize company name: trim and collapse multiple spaces */
function normalizeCompanyName(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

const NOT_APPROVED_EMAIL = "lokesha@poornam.com";

const SetCompany = () => {
  const navigate = useNavigate();
  const [companyInput, setCompanyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [user, setUser] = useState<{
    first_name?: string | null;
    last_name?: string | null;
    email?: string;
  } | null>(null);
  const [notApprovedOpen, setNotApprovedOpen] = useState(false);
  const [notApprovedCompany, setNotApprovedCompany] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setSuggestedLoading(true);
        const [userRes, suggestedRes] = await Promise.all([
          apiClient.getCurrentUser(),
          apiClient.getEmployerSuggestedOrg(),
        ]);
        if (userRes.success && userRes.user) {
          const u = userRes.user as { first_name?: string | null; last_name?: string | null; email?: string; organization_id?: string | null };
          setUser(u);
          if (u.organization_id != null && u.organization_id !== "") {
            navigate("/employer/dashboard", { replace: true });
            return;
          }
        }
        if (suggestedRes.success && suggestedRes.data?.name) {
          setCompanyInput(suggestedRes.data.name);
        }
      } catch {
        // ignore
      } finally {
        setSuggestedLoading(false);
      }
    };
    run();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = normalizeCompanyName(companyInput);
    if (!name) return;
    setLoading(true);
    try {
      const res = await apiClient.validateEmployerCompany(name);
      if (res.success && res.found && res.organization) {
        await apiClient.setEmployerCompany(res.organization.id, res.organization.name ?? name);
        navigate("/employer/dashboard");
        return;
      }
      setNotApprovedCompany(name);
      setNotApprovedOpen(true);
    } catch (err) {
      // handle error via toast if needed
    } finally {
      setLoading(false);
    }
  };

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || "User"
    : "User";
  const mailtoSubject = encodeURIComponent("Cardinal Talent - Company not approved");
  const mailtoBody = encodeURIComponent(
    `Name: ${displayName}\nCompany entered: ${notApprovedCompany}\n\nPlease add this company as an approved organization for Cardinal Talent.`
  );
  const mailtoUrl = `mailto:${NOT_APPROVED_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <img src={cardinalLogo} alt="CardinalTalent" className="w-9 h-9 object-contain" />
        <span className="font-display text-lg font-bold text-gradient">CardinalTalent</span>
      </Link>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Enter your company</h1>
          <p className="text-muted-foreground text-sm">
            Only approved organizations can use Cardinal Talent. Enter your company name as it is registered.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company name</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="company"
                type="text"
                placeholder="e.g. Acme Inc"
                className="pl-10"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                disabled={suggestedLoading}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We may have prefilled this from your email domain. You can change it.
            </p>
          </div>

          <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>
            {loading ? "Checking…" : "Continue"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Your company must be pre-approved. If you don’t see it, contact your admin.
        </p>
      </div>

      <Dialog open={notApprovedOpen} onOpenChange={setNotApprovedOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Company not approved</DialogTitle>
            <DialogDescription>
              The company you entered is not an approved company for Cardinal Talent. If you believe this is an error,
              you can send a message to our team to request approval.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2 text-sm">
            <p>
              <strong>Name:</strong> {displayName}
            </p>
            <p>
              <strong>Company entered:</strong> {notApprovedCompany}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotApprovedOpen(false)}>
              Close
            </Button>
            <a href={mailtoUrl}>
              <Button type="button" variant="hero" className="gap-2">
                <Mail className="w-4 h-4" />
                Send message to {NOT_APPROVED_EMAIL}
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SetCompany;
