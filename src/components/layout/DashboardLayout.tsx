import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Briefcase,
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  Bell,
  User,
  Building2,
  MessageSquare,
  Calendar,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import cardinalLogo from "@/assets/cardinal-logo.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  role: "talent" | "employer" | "recruiter" | "admin";
  navItems: NavItem[];
  userName?: string;
  companyName?: string;
}

const DashboardLayout = ({
  children,
  role,
  navItems,
  userName = "John Doe",
  companyName,
}: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Will be replaced with actual logout logic
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border flex-shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <img src={cardinalLogo} alt="CardinalTalent" className="w-9 h-9 object-contain" />
            <span className="font-display text-lg font-bold text-gradient">
              CardinalTalent
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-sidebar-accent transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cardinal to-amber flex items-center justify-center text-white font-semibold">
                  {userName.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-sidebar-foreground">
                    {userName}
                  </p>
                  {companyName && (
                    <p className="text-xs text-muted-foreground">{companyName}</p>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate(`/${role}/settings`)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-end px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
