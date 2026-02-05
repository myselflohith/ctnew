import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Talent pages
import TalentDashboard from "./pages/talent/Dashboard";

// Employer pages
import EmployerDashboard from "./pages/employer/Dashboard";
import NewJob from "./pages/employer/NewJob";

// Recruiter pages
import RecruiterDashboard from "./pages/recruiter/Dashboard";

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
          
          {/* Talent routes */}
          <Route path="/talent/dashboard" element={<TalentDashboard />} />
          
          {/* Employer routes */}
          <Route path="/employer/dashboard" element={<EmployerDashboard />} />
          <Route path="/employer/jobs/new" element={<NewJob />} />
          
          {/* Recruiter routes */}
          <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
          
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
