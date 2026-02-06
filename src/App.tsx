import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Jobs from "./pages/Jobs";
import Employers from "./pages/Employers";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

// Talent pages
import TalentDashboard from "./pages/talent/Dashboard";
import TalentJobs from "./pages/talent/Jobs";
import TalentApplications from "./pages/talent/Applications";
import TalentSavedJobs from "./pages/talent/SavedJobs";
import TalentSettings from "./pages/talent/Settings";

// Employer pages
import EmployerDashboard from "./pages/employer/Dashboard";
import EmployerJobs from "./pages/employer/Jobs";
import EmployerCandidates from "./pages/employer/Candidates";
import EmployerCompany from "./pages/employer/Company";
import EmployerSettings from "./pages/employer/Settings";
import NewJob from "./pages/employer/NewJob";

// Recruiter pages
import RecruiterDashboard from "./pages/recruiter/Dashboard";
import RecruiterJobs from "./pages/recruiter/Jobs";
import RecruiterCandidates from "./pages/recruiter/Candidates";
import RecruiterClients from "./pages/recruiter/Clients";
import RecruiterSettings from "./pages/recruiter/Settings";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/employers" element={<Employers />} />
          <Route path="/about" element={<About />} />
          
          {/* Talent routes */}
          <Route path="/talent/dashboard" element={<TalentDashboard />} />
          <Route path="/talent/jobs" element={<TalentJobs />} />
          <Route path="/talent/applications" element={<TalentApplications />} />
          <Route path="/talent/saved" element={<TalentSavedJobs />} />
          <Route path="/talent/settings" element={<TalentSettings />} />
          
          {/* Employer routes */}
          <Route path="/employer/dashboard" element={<EmployerDashboard />} />
          <Route path="/employer/jobs" element={<EmployerJobs />} />
          <Route path="/employer/jobs/new" element={<NewJob />} />
          <Route path="/employer/candidates" element={<EmployerCandidates />} />
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
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
