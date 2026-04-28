import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./contexts/AuthContext";
import { AccountProvider } from "./contexts/AccountContext";
import { AppLayout } from "./components/AppLayout";
import { AuthEventProvider } from "./components/AuthEventProvider";
import { DirectReportGuard } from "./components/DirectReportGuard";
// ── Critical-path pages (kept eager for fast first paint) ──
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { AdminGuard } from "./components/admin/AdminGuard";
import { AdminLayout } from "./components/admin/AdminLayout";
import { HRAdminGuard } from "./components/HRAdminGuard";

// ── Lazy-loaded pages (split out of the initial bundle) ──
const MemberDetails = lazy(() => import("./pages/MemberDetails"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Billing = lazy(() => import("./pages/Billing"));
const PersonaSelector = lazy(() => import("./pages/PersonaSelector"));
const RhitmoSync = lazy(() => import("./pages/RhitmoSync"));
const Invite = lazy(() => import("./pages/Invite"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Admin = lazy(() => import("./pages/Admin"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const BriefPage = lazy(() => import("@/pages/BriefPage"));
const HRDashboard = lazy(() => import("./pages/HRDashboard"));
const CompetencyFramework = lazy(() => import("./pages/CompetencyFramework"));
const HRTeams = lazy(() => import("./pages/HRTeams"));
const HRMembers = lazy(() => import("./pages/HRMembers"));
const HRAnalytics = lazy(() => import("./pages/HRAnalytics"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const DirectReportReviewView = lazy(() => import("./pages/DirectReportReviewView"));
const SlackConnect = lazy(() => import("./pages/SlackConnect"));
const DesignSystem = lazy(() => import("./pages/DesignSystem"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const RecorderPopup = lazy(() => import("./pages/RecorderPopup"));
const Enterprise = lazy(() => import("./pages/Enterprise"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const GoogleCalendarCallback = lazy(() => import("./pages/GoogleCalendarCallback"));
const Evidence = lazy(() => import("./pages/Evidence"));
const SlackChannels = lazy(() => import("./pages/SlackChannels"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <AccountProvider>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthEventProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Landing Page pública com redirect inteligente */}
              <Route path="/" element={<Landing />} />

              {/* Auth */}
              <Route path="/auth/start" element={<PersonaSelector />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Onboarding para liderados */}
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Dashboard (antigo Index) - autenticado com guard para linked members */}
              <Route path="/dashboard" element={
                <DirectReportGuard>
                  <AppLayout><Index /></AppLayout>
                </DirectReportGuard>
              } />
              <Route path="/dashboard/carreira" element={
                <DirectReportGuard>
                  <AppLayout><Index activeTab="carreira" /></AppLayout>
                </DirectReportGuard>
              } />
              <Route path="/dashboard/feedbacks" element={
                <DirectReportGuard>
                  <AppLayout><Index activeTab="feedbacks" /></AppLayout>
                </DirectReportGuard>
              } />
              <Route path="/dashboard/perfil" element={
                <DirectReportGuard>
                  <AppLayout><Index activeTab="perfil" /></AppLayout>
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
              <Route path="/evidence" element={
                <DirectReportGuard>
                  <AppLayout><Evidence /></AppLayout>
                </DirectReportGuard>
              } />
              <Route path="/slack/channels" element={
                <DirectReportGuard>
                  <AppLayout><SlackChannels /></AppLayout>
                </DirectReportGuard>
              } />

              {/* Brief pré-reunião */}
              <Route path="/brief/:meetingId" element={
                <DirectReportGuard>
                  <AppLayout><BriefPage /></AppLayout>
                </DirectReportGuard>
              } />

              {/* Design System (matheus@rhitmo.co only) */}
              <Route path="/design-system" element={
                <AdminGuard>
                  <AdminLayout>
                    <DesignSystem />
                  </AdminLayout>
                </AdminGuard>
              } />


              {/* Recorder popup (standalone, no layout) */}
              <Route path="/recorder" element={<RecorderPopup />} />

              {/* Slack OAuth connect */}
              <Route path="/slack/connect" element={<SlackConnect />} />

              {/* Rotas públicas (sem sidebar) */}
              <Route path="/sync/:memberId" element={<RhitmoSync />} />
              <Route path="/invite" element={<Invite />} />
              <Route path="/review/:reviewId" element={<DirectReportReviewView />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/enterprise" element={<Enterprise />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/google/callback" element={<GoogleCalendarCallback />} />
              <Route path="/roadmap" element={<Roadmap />} />

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

              {/* Unsubscribe */}
              <Route path="/unsubscribe" element={<Unsubscribe />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthEventProvider>
    </TooltipProvider>
    </ThemeProvider>
    </AccountProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
