import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./contexts/AuthContext";
import { AccountProvider } from "./contexts/AccountContext";
import { AppLayout } from "./components/AppLayout";
import { AuthEventProvider } from "./components/AuthEventProvider";
import { DirectReportGuard } from "./components/DirectReportGuard";
import { RoleRouteGuard } from "./components/RoleRouteGuard";
// ── Critical-path pages (kept eager for fast first paint) ──
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { AdminGuard } from "./components/admin/AdminGuard";
import { AdminLayout } from "./components/admin/AdminLayout";
import { HRAdminGuard } from "./components/HRAdminGuard";
import { EvidenceDrawer } from "./components/context/EvidenceDrawer";

// ── Lazy-loaded pages ──
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

const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const GoogleCalendarCallback = lazy(() => import("./pages/GoogleCalendarCallback"));
const Evidence = lazy(() => import("./pages/Evidence"));
const SlackChannels = lazy(() => import("./pages/SlackChannels"));
const HelpRedirect = lazy(() => import("./pages/HelpRedirect"));

// ── New role-based pages ──
const LiderInicio = lazy(() => import("./pages/lider/Inicio"));
const LiderOneOnOnes = lazy(() => import("./pages/lider/OneOnOnes"));
const LiderDiario = lazy(() => import("./pages/lider/Diario"));
const LiderPulse = lazy(() => import("./pages/lider/Pulse"));
const LiderPulseDetail = lazy(() => import("./pages/lider/PulseDetail"));
const LiderAvaliacoes = lazy(() => import("./pages/lider/Avaliacoes"));
const LiderObjetivos = lazy(() => import("./pages/lider/Objetivos"));
const LiderPessoas = lazy(() => import("./pages/lider/Pessoas"));
const LiderConfiguracoes = lazy(() => import("./pages/lider/Configuracoes"));
const LiderContexto = lazy(() => import("./pages/lider/Contexto"));
const LideradoInicio = lazy(() => import("./pages/liderado/Inicio"));
const LideradoCompass = lazy(() => import("./pages/liderado/Compass"));
const LideradoOneOnOnes = lazy(() => import("./pages/liderado/OneOnOnes"));
const LideradoPulse = lazy(() => import("./pages/liderado/Pulse"));
const LideradoPDI = lazy(() => import("./pages/liderado/PDI"));
const LideradoAvaliacoes = lazy(() => import("./pages/liderado/Avaliacoes"));
const LideradoMeuRhitmo = lazy(() => import("./pages/liderado/MeuRhitmo"));
const LideradoConfiguracoes = lazy(() => import("./pages/liderado/Configuracoes"));

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

// Helper: wrap a leaf in DirectReportGuard + AppLayout + RoleRouteGuard
const Leader = (node: React.ReactNode) => (
  <DirectReportGuard>
    <AppLayout>
      <RoleRouteGuard expects="leader">{node}</RoleRouteGuard>
    </AppLayout>
  </DirectReportGuard>
);
const DirectReport = (node: React.ReactNode) => (
  <DirectReportGuard>
    <AppLayout>
      <RoleRouteGuard expects="direct_report">{node}</RoleRouteGuard>
    </AppLayout>
  </DirectReportGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <AccountProvider>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <EvidenceDrawer />
      <AuthEventProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Landing */}
              <Route path="/" element={<Landing />} />

              {/* Auth */}
              <Route path="/auth/start" element={<PersonaSelector />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Onboarding */}
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Legacy redirects → DirectReportGuard decides leader vs direct report */}
              <Route path="/dashboard" element={
                <DirectReportGuard>
                  <AppLayout><Index /></AppLayout>
                </DirectReportGuard>
              } />
              <Route path="/dashboard/carreira" element={<Navigate to="/liderado/compass" replace />} />
              <Route path="/dashboard/feedbacks" element={<Navigate to="/lider/diario" replace />} />
              <Route path="/dashboard/perfil" element={<Navigate to="/lider/configuracoes" replace />} />

              {/* ── Leader routes (/lider/*) ── */}
              <Route path="/lider/inicio" element={Leader(<LiderInicio />)} />
              <Route path="/lider/1on1s" element={Leader(<LiderOneOnOnes />)} />
              <Route path="/lider/1on1s/:meetingId" element={Leader(<BriefPage />)} />
              <Route path="/lider/diario" element={Leader(<LiderDiario />)} />
              <Route path="/lider/pulse" element={Leader(<LiderPulse />)} />
              <Route path="/lider/pulse/:id" element={Leader(<LiderPulseDetail />)} />
              <Route path="/lider/avaliacoes" element={Leader(<LiderAvaliacoes />)} />
              <Route path="/lider/objetivos" element={Leader(<LiderObjetivos />)} />
              <Route path="/lider/pessoas" element={Leader(<LiderPessoas />)} />
              <Route path="/lider/configuracoes" element={Leader(<LiderConfiguracoes />)} />
              <Route path="/lider/contexto" element={Leader(<LiderContexto />)} />

              {/* ── Direct report routes (/liderado/*) ── */}
              <Route path="/liderado/inicio" element={DirectReport(<LideradoInicio />)} />
              <Route path="/liderado/compass" element={DirectReport(<LideradoCompass />)} />
              <Route path="/liderado/1on1s" element={DirectReport(<LideradoOneOnOnes />)} />
              <Route path="/liderado/pulse" element={DirectReport(<LideradoPulse />)} />
              <Route path="/liderado/pdi" element={DirectReport(<LideradoPDI />)} />
              <Route path="/liderado/avaliacoes" element={DirectReport(<LideradoAvaliacoes />)} />
              <Route path="/liderado/meu-rhitmo" element={DirectReport(<LideradoMeuRhitmo />)} />
              <Route path="/liderado/configuracoes" element={DirectReport(<LideradoConfiguracoes />)} />

              {/* Other in-app routes (kept) */}
              <Route path="/member/:id" element={Leader(<MemberDetails />)} />
              {/* Legacy deep-links → redirect to new host pages with tab pre-selected */}
              <Route path="/analytics" element={<Navigate to="/lider/pessoas?tab=analytics" replace />} />
              <Route path="/billing" element={<Navigate to="/lider/configuracoes?tab=faturamento" replace />} />
              <Route path="/help" element={<DirectReportGuard><HelpRedirect /></DirectReportGuard>} />
              <Route path="/evidence" element={Leader(<Evidence />)} />
              <Route path="/slack/channels" element={Leader(<SlackChannels />)} />
              {/* Legacy brief redirect */}
              <Route path="/brief/:meetingId" element={Leader(<BriefPage />)} />

              {/* Design System (super admin) */}
              <Route path="/design-system" element={
                <AdminGuard>
                  <AdminLayout><DesignSystem /></AdminLayout>
                </AdminGuard>
              } />

              {/* Recorder standalone */}
              <Route path="/recorder" element={<RecorderPopup />} />

              {/* Slack OAuth connect */}
              <Route path="/slack/connect" element={<SlackConnect />} />

              {/* Public routes */}
              <Route path="/sync/:memberId" element={<RhitmoSync />} />
              <Route path="/invite" element={<Invite />} />
              <Route path="/review/:reviewId" element={<DirectReportReviewView />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/enterprise" element={<Enterprise />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/google/callback" element={<GoogleCalendarCallback />} />
              

              {/* Admin */}
              <Route path="/admin" element={
                <AdminGuard>
                  <AdminLayout><Admin /></AdminLayout>
                </AdminGuard>
              } />

              {/* HR */}
              <Route path="/hr" element={<AppLayout><HRAdminGuard><HRDashboard /></HRAdminGuard></AppLayout>} />
              <Route path="/hr/teams" element={<AppLayout><HRAdminGuard><HRTeams /></HRAdminGuard></AppLayout>} />
              <Route path="/hr/analytics" element={<AppLayout><HRAdminGuard><HRAnalytics /></HRAdminGuard></AppLayout>} />
              <Route path="/hr/members" element={<AppLayout><HRAdminGuard><HRMembers /></HRAdminGuard></AppLayout>} />
              <Route path="/hr/competency-framework" element={<AppLayout><HRAdminGuard><CompetencyFramework /></HRAdminGuard></AppLayout>} />

              {/* Unsubscribe */}
              <Route path="/unsubscribe" element={<Unsubscribe />} />

              {/* CATCH-ALL */}
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
