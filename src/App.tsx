import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { JobsProvider } from "@/contexts/JobsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Jobs from "./pages/Jobs";
import Employers from "./pages/Employers";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import InvestorsDashboard from "./pages/investors/Dashboard";
import OrganizationJobs from "./pages/investors/OrganizationJobs";
import InvestorSignup from "./pages/InvestorSignup";

// Talent pages
import TalentDashboard from "./pages/talent/Dashboard";
import TalentJobs from "./pages/talent/Jobs";
import TalentApplications from "./pages/talent/Applications";
import TalentSavedJobs from "./pages/talent/SavedJobs";
import TalentInterviews from "./pages/talent/Interviews";
import InterviewScreeningPage from "./pages/talent/InterviewScreeningPage";
import TalentSettings from "./pages/talent/Settings";
import TalentInterviewSession from "./pages/talent/InterviewSession";
import InterviewAccessGate from "./pages/talent/InterviewAccessGate";

// Public/Interview pages

// Employer pages
import EmployerDashboard from "./pages/employer/Dashboard";
import EmployerJobs from "./pages/employer/Jobs";
import EmployerCandidates from "./pages/employer/Candidates";
import EmployerInterviews from "./pages/employer/Interviews";
import InterviewDetails from "./pages/employer/InterviewDetails";
import CandidateReportPage from "./pages/employer/CandidateReportPage";
import InviteCandidates from "./pages/employer/InviteCandidates";
import EmployerCompany from "./pages/employer/Company";
import EmployerSettings from "./pages/employer/Settings";
import EmployerSetCompany from "./pages/employer/SetCompany";
import EmployerRequireCompany from "./components/EmployerRequireCompany";
import InvestorRequireAuth from "./components/InvestorRequireAuth";
import NewJob from "./pages/employer/NewJob";
import SetupInterview from "./pages/employer/SetupInterview";

// Recruiter pages
import RecruiterDashboard from "./pages/recruiter/Dashboard";
import RecruiterJobs from "./pages/recruiter/Jobs";
import RecruiterCandidates from "./pages/recruiter/Candidates";
import RecruiterClients from "./pages/recruiter/Clients";
import RecruiterSettings from "./pages/recruiter/Settings";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminOrganizations from "./pages/admin/Organizations";
import AdminUsers from "./pages/admin/Users";
import AdminSecurity from "./pages/admin/Security";
import AdminSettings from "./pages/admin/Settings";
import VerifyEmail from "./pages/VerifyEmail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <JobsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/investor" element={<InvestorSignup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/employers" element={<Employers />} />
            <Route path="/about" element={<About />} />
            <Route path="/investors/startups/:companyName" element={<InvestorRequireAuth><OrganizationJobs /></InvestorRequireAuth>} />
            <Route path="/investors" element={<InvestorRequireAuth><InvestorsDashboard /></InvestorRequireAuth>} />

            {/* Public interview access by email link */}
            <Route path="/interview/:token" element={<InterviewScreeningPage />} />
            <Route path="/interview/:token/access" element={<InterviewAccessGate />} />
            <Route path="/interview/:token/session" element={<TalentInterviewSession />} />
            
            {/* Talent routes */}
            <Route path="/talent/dashboard" element={<TalentDashboard />} />
            <Route path="/talent/jobs" element={<TalentJobs />} />
            <Route path="/talent/applications" element={<TalentApplications />} />
            <Route path="/talent/saved" element={<TalentSavedJobs />} />
            <Route path="/talent/interviews" element={<TalentInterviews />} />
            <Route path="/interview/:token" element={<InterviewScreeningPage />} />
            <Route path="/interview/:token/access" element={<InterviewAccessGate />} />
            <Route path="/interview/:token/session" element={<TalentInterviewSession />} />
            <Route path="/talent/profile" element={<TalentSettings />} />
            <Route path="/talent/settings" element={<Navigate to="/talent/profile" replace />} />
            
            {/* Employer routes: set-company is unwrapped; all others require company (redirect if missing) */}
            <Route path="/employer/set-company" element={<EmployerSetCompany />} />
            <Route path="/employer/dashboard" element={<EmployerRequireCompany><EmployerDashboard /></EmployerRequireCompany>} />
            <Route path="/employer/jobs" element={<EmployerRequireCompany><EmployerJobs /></EmployerRequireCompany>} />
            <Route path="/employer/jobs/new" element={<EmployerRequireCompany><NewJob /></EmployerRequireCompany>} />
            <Route path="/employer/candidates" element={<EmployerRequireCompany><EmployerCandidates /></EmployerRequireCompany>} />
            <Route path="/employer/interviews" element={<EmployerRequireCompany><EmployerInterviews /></EmployerRequireCompany>} />
            <Route path="/employer/interviews/setup" element={<EmployerRequireCompany><SetupInterview /></EmployerRequireCompany>} />
            <Route path="/employer/interviews/:id" element={<EmployerRequireCompany><InterviewDetails /></EmployerRequireCompany>} />
            <Route path="/employer/interviews/:id/candidate-report/:inviteId" element={<EmployerRequireCompany><CandidateReportPage /></EmployerRequireCompany>} />
            <Route path="/employer/interviews/:id/invite" element={<EmployerRequireCompany><InviteCandidates /></EmployerRequireCompany>} />
            <Route path="/employer/candidate-report/:reportId" element={<EmployerRequireCompany><CandidateReportPage /></EmployerRequireCompany>} />
            <Route path="/employer/company" element={<EmployerRequireCompany><EmployerCompany /></EmployerRequireCompany>} />
            <Route path="/employer/settings" element={<EmployerRequireCompany><EmployerSettings /></EmployerRequireCompany>} />
            
            {/* Recruiter routes */}
            <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
            <Route path="/recruiter/jobs" element={<RecruiterJobs />} />
            <Route path="/recruiter/candidates" element={<RecruiterCandidates />} />
            <Route path="/recruiter/clients" element={<RecruiterClients />} />
            <Route path="/recruiter/settings" element={<RecruiterSettings />} />
            
            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/organizations" element={<AdminOrganizations />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/security" element={<AdminSecurity />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </JobsProvider>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
