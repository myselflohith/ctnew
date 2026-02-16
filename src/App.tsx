import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { JobsProvider } from "@/contexts/JobsContext";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Jobs from "./pages/Jobs";
import Employers from "./pages/Employers";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

// Talent pages
import TalentDashboard from "./pages/talent/Dashboard";
import TalentJobs from "./pages/talent/Jobs";
import TalentApplications from "./pages/talent/Applications";
import TalentSavedJobs from "./pages/talent/SavedJobs";
import TalentInterviews from "./pages/talent/Interviews";
import InterviewScreeningPage from "./pages/talent/InterviewScreeningPage";
import TalentSettings from "./pages/talent/Settings";

// Public/Interview pages - consolidated into InterviewScreeningPage

// Employer pages
import EmployerDashboard from "./pages/employer/Dashboard";
import EmployerJobs from "./pages/employer/Jobs";
import EmployerCandidates from "./pages/employer/Candidates";
import EmployerInterviews from "./pages/employer/Interviews";
import InterviewDetails from "./pages/employer/InterviewDetails";
import InviteCandidates from "./pages/employer/InviteCandidates";
import EmployerCompany from "./pages/employer/Company";
import EmployerSettings from "./pages/employer/Settings";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <JobsProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/employers" element={<Employers />} />
            <Route path="/about" element={<About />} />
            
            {/* Public interview access by email link - single unified route */}
            <Route path="/interview/:token" element={<InterviewScreeningPage />} />
            
            {/* Talent routes */}
            <Route path="/talent/dashboard" element={<TalentDashboard />} />
            <Route path="/talent/jobs" element={<TalentJobs />} />
            <Route path="/talent/applications" element={<TalentApplications />} />
            <Route path="/talent/saved" element={<TalentSavedJobs />} />
            <Route path="/talent/interviews" element={<TalentInterviews />} />
            <Route path="/interview/:token" element={<InterviewScreeningPage />} />
            <Route path="/talent/settings" element={<TalentSettings />} />
            
            {/* Employer routes */}
            <Route path="/employer/dashboard" element={<EmployerDashboard />} />
            <Route path="/employer/jobs" element={<EmployerJobs />} />
            <Route path="/employer/jobs/new" element={<NewJob />} />
            <Route path="/employer/candidates" element={<EmployerCandidates />} />
            <Route path="/employer/interviews" element={<EmployerInterviews />} />
            <Route path="/employer/interviews/setup" element={<SetupInterview />} />
            <Route path="/employer/interviews/:id" element={<InterviewDetails />} />
            <Route path="/employer/interviews/:id/invite" element={<InviteCandidates />} />
            <Route path="/employer/company" element={<EmployerCompany />} />
            <Route path="/employer/settings" element={<EmployerSettings />} />
            
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
  </QueryClientProvider>
);

export default App;
