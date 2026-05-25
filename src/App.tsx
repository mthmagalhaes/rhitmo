import { Suspense } from "react";
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
import { RouteSkeleton } from "./components/RouteSkeleton";
// ── Lazy components (centralized in routeLoaders so the sidebar can prefetch) ──
import {
  MemberDetails,
  Analytics,
  Billing,
  PersonaSelector,
  RhitmoSync,
  Invite,
  Onboarding,
  Admin,
  BriefPage,
  HRDashboard,
  CompetencyFramework,
  HRTeams,
  HRMembers,
  HRAnalytics,
  TermsOfService,
  PrivacyPolicy,
  DirectReportReviewView,
  SlackConnect,
  DesignSystem,
  Unsubscribe,
  RecorderPopup,
  Enterprise,
  ResetPassword,
  GoogleCalendarCallback,
  Evidence,
  SlackChannels,
  LiderInicio,
  LiderOneOnOnes,
  LiderDiario,
  LiderPulse,
  LiderPulseDetail,
  LiderAvaliacoes,
  LiderObjetivos,
  LiderPessoas,
  LiderConfiguracoes,
  LiderContexto,
  LiderMentor,
  LiderMentorThread,
  LideradoInicio,
  LideradoCompass,
  LideradoOneOnOnes,
  LideradoPulse,
  LideradoPDI,
  LideradoAvaliacoes,
  LideradoMeuRhitmo,
  LideradoConfiguracoes,
} from "@/lib/routeLoaders";

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

const PublicFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
  </div>
);

// Helper: wrap a leaf in DirectReportGuard + AppLayout + RoleRouteGuard.
// AppLayout owns its own internal <Suspense> so the sidebar/header stay
// mounted while the route chunk loads.
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

// Wrap a leaf with a full-screen Suspense — used for public/auth routes
// where there is no AppLayout to absorb the fallback.
const Public = (node: React.ReactNode) => (
  <Suspense fallback={<PublicFallback />}>{node}</Suspense>
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
          <Routes>
              {/* Landing */}
              <Route path="/" element={<Landing />} />

              {/* Auth */}
              <Route path="/auth/start" element={Public(<PersonaSelector />)} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Onboarding */}
              <Route path="/onboarding" element={Public(<Onboarding />)} />

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
              <Route path="/lider/diario-v2" element={<Navigate to="/lider/diario" replace />} />
              <Route path="/lider/pulse" element={Leader(<LiderPulse />)} />
              <Route path="/lider/pulse/:id" element={Leader(<LiderPulseDetail />)} />
              <Route path="/lider/avaliacoes" element={Leader(<LiderAvaliacoes />)} />
              <Route path="/lider/objetivos" element={Leader(<LiderObjetivos />)} />
              <Route path="/lider/pessoas" element={Leader(<LiderPessoas />)} />
              <Route path="/lider/pessoas-v2" element={<Navigate to="/lider/pessoas" replace />} />
              <Route path="/lider/configuracoes" element={Leader(<LiderConfiguracoes />)} />
              <Route path="/lider/contexto" element={Leader(<LiderContexto />)} />
              <Route path="/lider/mentor" element={Leader(<LiderMentor />)} />
              <Route path="/lider/mentor/:threadId" element={Leader(<LiderMentorThread />)} />

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

              <Route path="/evidence" element={Leader(<Evidence />)} />
              <Route path="/slack/channels" element={Leader(<SlackChannels />)} />
              {/* Legacy brief redirect */}
              <Route path="/brief/:meetingId" element={Leader(<BriefPage />)} />

              {/* Design System (super admin) */}
              <Route path="/design-system" element={
                <AdminGuard>
                  <AdminLayout>{Public(<DesignSystem />)}</AdminLayout>
                </AdminGuard>
              } />

              {/* Recorder standalone */}
              <Route path="/recorder" element={Public(<RecorderPopup />)} />

              {/* Slack OAuth connect */}
              <Route path="/slack/connect" element={Public(<SlackConnect />)} />

              {/* Public routes */}
              <Route path="/sync/:memberId" element={Public(<RhitmoSync />)} />
              <Route path="/invite" element={Public(<Invite />)} />
              <Route path="/review/:reviewId" element={Public(<DirectReportReviewView />)} />
              <Route path="/terms-of-service" element={Public(<TermsOfService />)} />
              <Route path="/privacy-policy" element={Public(<PrivacyPolicy />)} />
              <Route path="/enterprise" element={Public(<Enterprise />)} />
              <Route path="/reset-password" element={Public(<ResetPassword />)} />
              <Route path="/auth/google/callback" element={Public(<GoogleCalendarCallback />)} />

              {/* Admin (self-wraps with AdminLayout) */}
              <Route path="/admin" element={
                <AdminGuard>{Public(<Admin />)}</AdminGuard>
              } />

              {/* HR */}
              <Route path="/hr" element={<AppLayout><HRAdminGuard><HRDashboard /></HRAdminGuard></AppLayout>} />
              <Route path="/hr/teams" element={<AppLayout><HRAdminGuard><HRTeams /></HRAdminGuard></AppLayout>} />
              <Route path="/hr/analytics" element={<AppLayout><HRAdminGuard><HRAnalytics /></HRAdminGuard></AppLayout>} />
              <Route path="/hr/members" element={<AppLayout><HRAdminGuard><HRMembers /></HRAdminGuard></AppLayout>} />
              <Route path="/hr/competency-framework" element={<AppLayout><HRAdminGuard><CompetencyFramework /></HRAdminGuard></AppLayout>} />

              {/* Unsubscribe */}
              <Route path="/unsubscribe" element={Public(<Unsubscribe />)} />

              {/* CATCH-ALL */}
              <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
      </AuthEventProvider>
    </TooltipProvider>
    </ThemeProvider>
    </AccountProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
// Re-export RouteSkeleton so AppLayout can import it without circular deps.
export { RouteSkeleton };
