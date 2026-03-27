import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { AppLayout } from "./components/AppLayout";
import { AuthEventProvider } from "./components/AuthEventProvider";
import { DirectReportGuard } from "./components/DirectReportGuard";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import MemberDetails from "./pages/MemberDetails";
import Analytics from "./pages/Analytics";
import Billing from "./pages/Billing";
import AuthPage from "./pages/AuthPage";
import RhitmoSync from "./pages/RhitmoSync";
import Invite from "./pages/Invite";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import HelpCenter from "./pages/HelpCenter";
import BriefPage from "@/pages/BriefPage";
import { AdminGuard } from "./components/admin/AdminGuard";
import { AdminLayout } from "./components/admin/AdminLayout";
import { HRAdminGuard } from "./components/HRAdminGuard";
import HRDashboard from "./pages/HRDashboard";
import CompetencyFramework from "./pages/CompetencyFramework";
import HRTeams from "./pages/HRTeams";
import HRMembers from "./pages/HRMembers";
import HRAnalytics from "./pages/HRAnalytics";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DirectReportReviewView from "./pages/DirectReportReviewView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthEventProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing Page pública com redirect inteligente */}
            <Route path="/" element={<Landing />} />
            
            {/* Auth */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Onboarding para liderados */}
            <Route path="/onboarding" element={<Onboarding />} />
            
            {/* Dashboard (antigo Index) - autenticado com guard para linked members */}
            <Route path="/dashboard" element={
              <DirectReportGuard>
                <AppLayout><Index /></AppLayout>
              </DirectReportGuard>
            } />
            <Route path="/member/:id" element={
              <DirectReportGuard>
                <AppLayout><MemberDetails /></AppLayout>
              </DirectReportGuard>
            } />
            <Route path="/analytics" element={
              <DirectReportGuard>
                <AppLayout><Analytics /></AppLayout>
              </DirectReportGuard>
            } />
            <Route path="/billing" element={
              <DirectReportGuard>
                <AppLayout><Billing /></AppLayout>
              </DirectReportGuard>
            } />
            <Route path="/help" element={
              <DirectReportGuard>
                <AppLayout><HelpCenter /></AppLayout>
              </DirectReportGuard>
            } />
            
            {/* Brief pré-reunião */}
            <Route path="/brief/:meetingId" element={
              <DirectReportGuard>
                <AppLayout><BriefPage /></AppLayout>
              </DirectReportGuard>
            } />
            
            {/* Rotas públicas (sem sidebar) */}
            <Route path="/sync/:memberId" element={<RhitmoSync />} />
            <Route path="/invite" element={<Invite />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            
            {/* Rota Admin */}
            <Route 
              path="/admin" 
              element={
                <AdminGuard>
                  <AdminLayout>
                    <Admin />
                  </AdminLayout>
                </AdminGuard>
              } 
            />
            
            {/* Rota HR Admin */}
            <Route path="/hr" element={
              <AppLayout>
                <HRAdminGuard>
                  <HRDashboard />
                </HRAdminGuard>
              </AppLayout>
            } />
            <Route path="/hr/teams" element={
              <AppLayout>
                <HRAdminGuard>
                  <HRTeams />
                </HRAdminGuard>
              </AppLayout>
            } />
            <Route path="/hr/analytics" element={
              <AppLayout>
                <HRAdminGuard>
                  <HRAnalytics />
                </HRAdminGuard>
              </AppLayout>
            } />
            <Route path="/hr/members" element={
              <AppLayout>
                <HRAdminGuard>
                  <HRMembers />
                </HRAdminGuard>
              </AppLayout>
            } />
            <Route path="/hr/competency-framework" element={
              <AppLayout>
                <HRAdminGuard>
                  <CompetencyFramework />
                </HRAdminGuard>
              </AppLayout>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthEventProvider>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
