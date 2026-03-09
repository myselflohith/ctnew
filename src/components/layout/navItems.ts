import {
  LayoutDashboard,
  Briefcase,
  Users,
  Database,
  Building2,
  Settings,
  Calendar,
  Search,
  Heart,
  FileText,
  User,
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
  { icon: Database, label: "Resume Database", path: "/employer/resume-database" },
  { icon: Calendar, label: "Interviews", path: "/employer/interviews" },
  { icon: Building2, label: "Company", path: "/employer/company" },
  { icon: Settings, label: "Settings", path: "/employer/settings" },
];

export const recruiterNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/recruiter/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/recruiter/jobs" },
  { icon: Users, label: "Candidates", path: "/recruiter/candidates" },
  { icon: Calendar, label: "Interviews", path: "/recruiter/interviews" },
  { icon: Settings, label: "Settings", path: "/recruiter/settings" },
];

export const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Building2, label: "Organizations", path: "/admin/organizations" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

export const talentNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent/dashboard" },
  { icon: Search, label: "Find Jobs", path: "/talent/jobs" },
  { icon: Heart, label: "Saved Jobs", path: "/talent/saved" },
  { icon: FileText, label: "Applications", path: "/talent/applications" },
  { icon: Calendar, label: "Interviews", path: "/talent/interviews" },
];
