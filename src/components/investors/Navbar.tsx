import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import cardinalLogo from "@/assets/cardinal-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";

export type InvestorsTabKey = "feed" | "startups" | "investors" | "pitchroom";

interface InvestorsNavbarProps {
  activeTab: InvestorsTabKey;
  setActiveTab: (tab: InvestorsTabKey) => void;
}

const tabs: { key: InvestorsTabKey; label: string }[] = [
  { key: "feed", label: "Feed" },
  { key: "startups", label: "Startups" },
  { key: "investors", label: "Investors" },
  { key: "pitchroom", label: "Pitch Room" },
];

const InvestorsNavbar = ({ activeTab, setActiveTab }: InvestorsNavbarProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await apiClient.logout();
    navigate("/");
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          <img src={cardinalLogo} alt="Cardinal Talent" className="w-9 h-9 object-contain" />
          <span className="text-lg font-bold text-foreground">Cardinal Talent</span>
        </div>

        <nav className="flex items-center gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-sm font-medium pb-1 transition-colors ${
                activeTab === tab.key
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
            Post Update
          </button>
          <button className="border border-primary text-primary text-sm font-medium px-4 py-2 rounded-md hover:bg-primary/5 transition-colors">
            Find Investors
          </button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default InvestorsNavbar;
