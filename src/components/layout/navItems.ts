import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  Calendar,
  Search,
  Heart,
  FileText,
} from "lucide-react";

export type AppRole = "talent" | "employer" | "admin" | "recruiter";

export interface NavItem {
  icon: any;
  label: string;
  path: string;
}

export const employerNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employer/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/employer/jobs" },
  { icon: Users, label: "Candidates", path: "/employer/candidates" },
  { icon: Calendar, label: "Interviews", path: "/employer/interviews" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

export const talentNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent/dashboard" },
  { icon: Search, label: "Find Jobs", path: "/talent/jobs" },
  { icon: Heart, label: "Saved Jobs", path: "/talent/saved" },
  { icon: FileText, label: "Applications", path: "/talent/applications" },
  { icon: Calendar, label: "Interviews", path: "/talent/interviews" },
  { icon: Settings, label: "Settings", path: "/talent/settings" },
];
