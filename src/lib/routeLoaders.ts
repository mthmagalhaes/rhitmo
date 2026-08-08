// Centralized route loaders + prefetch map.
// Each loader is a `() => import(...)` so the SAME promise is shared between
// React.lazy() and the prefetch helper (Vite/HTTP cache dedup it).
//
// Why: keeping the loader functions in one place lets the sidebar warm the
// next route's chunk on hover/focus, eliminating the "click → spinner → page"
// gap that made navigation feel laggy.
import { lazy } from 'react';

// ── Lazy chunk loaders (one function per route) ─────────────────────────────
export const loadMemberDetails = () => import('@/pages/MemberDetails');
export const loadAnalytics = () => import('@/pages/Analytics');
export const loadBilling = () => import('@/pages/Billing');
export const loadPersonaSelector = () => import('@/pages/PersonaSelector');
export const loadRhitmoSync = () => import('@/pages/RhitmoSync');
export const loadInvite = () => import('@/pages/Invite');
export const loadOnboarding = () => import('@/pages/Onboarding');
export const loadAdmin = () => import('@/pages/Admin');
export const loadAdminLogs = () => import('@/pages/AdminLogs');
export const loadBriefPage = () => import('@/pages/BriefPage');
export const loadHRDashboard = () => import('@/pages/HRDashboard');
export const loadCompetencyFramework = () => import('@/pages/CompetencyFramework');
export const loadHRTeams = () => import('@/pages/HRTeams');
export const loadHRMembers = () => import('@/pages/HRMembers');
export const loadHRPessoas = () => import('@/pages/HRPessoas');
export const loadHRAnalytics = () => import('@/pages/HRAnalytics');
export const loadHRRitmo = () => import('@/pages/HRRitmo');
export const loadTermsOfService = () => import('@/pages/TermsOfService');
export const loadPrivacyPolicy = () => import('@/pages/PrivacyPolicy');
export const loadDirectReportReviewView = () => import('@/pages/DirectReportReviewView');
export const loadSlackConnect = () => import('@/pages/SlackConnect');
export const loadDesignSystem = () => import('@/pages/DesignSystem');
export const loadUnsubscribe = () => import('@/pages/Unsubscribe');
export const loadRecorderPopup = () => import('@/pages/RecorderPopup');
export const loadEnterprise = () => import('@/pages/Enterprise');
export const loadResetPassword = () => import('@/pages/ResetPassword');
export const loadGoogleCalendarCallback = () => import('@/pages/GoogleCalendarCallback');

export const loadSlackChannels = () => import('@/pages/SlackChannels');

export const loadLiderInicio = () => import('@/pages/lider/Inicio');
export const loadLiderOneOnOnes = () => import('@/pages/lider/OneOnOnes');
export const loadLiderDiario = () => import('@/pages/lider/Diario');
export const loadLiderAvaliacoes = () => import('@/pages/lider/Avaliacoes');
export const loadLiderObjetivos = () => import('@/pages/lider/Objetivos');
export const loadLiderPessoas = () => import('@/pages/lider/Pessoas');
export const loadLiderConfiguracoes = () => import('@/pages/lider/Configuracoes');
export const loadLiderContexto = () => import('@/pages/lider/Contexto');
export const loadLiderMentor = () => import('@/pages/lider/Mentor');
export const loadLiderMentorThread = () => import('@/pages/lider/MentorThread');

export const loadLideradoInicio = () => import('@/pages/liderado/Inicio');
export const loadLideradoCompass = () => import('@/pages/liderado/Compass');
export const loadLideradoOneOnOnes = () => import('@/pages/liderado/OneOnOnes');
export const loadLideradoPDI = () => import('@/pages/liderado/PDI');
export const loadLideradoAvaliacoes = () => import('@/pages/liderado/Avaliacoes');
export const loadLideradoMeuRhitmo = () => import('@/pages/liderado/MeuRhitmo');
export const loadLideradoConfiguracoes = () => import('@/pages/liderado/Configuracoes');

// ── React.lazy components (single source of truth) ──────────────────────────
export const MemberDetails = lazy(loadMemberDetails);
export const Analytics = lazy(loadAnalytics);
export const Billing = lazy(loadBilling);
export const PersonaSelector = lazy(loadPersonaSelector);
export const RhitmoSync = lazy(loadRhitmoSync);
export const Invite = lazy(loadInvite);
export const Onboarding = lazy(loadOnboarding);
export const Admin = lazy(loadAdmin);
export const AdminLogs = lazy(loadAdminLogs);
export const BriefPage = lazy(loadBriefPage);
export const HRDashboard = lazy(loadHRDashboard);
export const CompetencyFramework = lazy(loadCompetencyFramework);
export const HRTeams = lazy(loadHRTeams);
export const HRMembers = lazy(loadHRMembers);
export const HRPessoas = lazy(loadHRPessoas);
export const HRAnalytics = lazy(loadHRAnalytics);
export const HRRitmo = lazy(loadHRRitmo);
export const TermsOfService = lazy(loadTermsOfService);
export const PrivacyPolicy = lazy(loadPrivacyPolicy);
export const DirectReportReviewView = lazy(loadDirectReportReviewView);
export const SlackConnect = lazy(loadSlackConnect);
export const DesignSystem = lazy(loadDesignSystem);
export const Unsubscribe = lazy(loadUnsubscribe);
export const RecorderPopup = lazy(loadRecorderPopup);
export const Enterprise = lazy(loadEnterprise);
export const ResetPassword = lazy(loadResetPassword);
export const GoogleCalendarCallback = lazy(loadGoogleCalendarCallback);

export const SlackChannels = lazy(loadSlackChannels);

export const LiderInicio = lazy(loadLiderInicio);
export const LiderOneOnOnes = lazy(loadLiderOneOnOnes);
export const LiderDiario = lazy(loadLiderDiario);
export const LiderAvaliacoes = lazy(loadLiderAvaliacoes);
export const LiderObjetivos = lazy(loadLiderObjetivos);
export const LiderPessoas = lazy(loadLiderPessoas);
export const LiderConfiguracoes = lazy(loadLiderConfiguracoes);
export const LiderContexto = lazy(loadLiderContexto);
export const LiderMentor = lazy(loadLiderMentor);
export const LiderMentorThread = lazy(loadLiderMentorThread);

export const LideradoInicio = lazy(loadLideradoInicio);
export const LideradoCompass = lazy(loadLideradoCompass);
export const LideradoOneOnOnes = lazy(loadLideradoOneOnOnes);
export const LideradoPDI = lazy(loadLideradoPDI);
export const LideradoAvaliacoes = lazy(loadLideradoAvaliacoes);
export const LideradoMeuRhitmo = lazy(loadLideradoMeuRhitmo);
export const LideradoConfiguracoes = lazy(loadLideradoConfiguracoes);

// ── Prefetch map: route prefix → loader ─────────────────────────────────────
// Keep keys aligned with the actual route paths from App.tsx.
const PREFETCH_MAP: Record<string, () => Promise<unknown>> = {
  '/lider/inicio': loadLiderInicio,
  '/lider/1on1s': loadLiderOneOnOnes,
  '/lider/diario': loadLiderDiario,
  '/lider/avaliacoes': loadLiderAvaliacoes,
  '/lider/objetivos': loadLiderObjetivos,
  '/lider/pessoas': loadLiderPessoas,
  '/lider/configuracoes': loadLiderConfiguracoes,
  '/lider/contexto': loadLiderContexto,
  '/lider/mentor': loadLiderMentor,

  '/liderado/inicio': loadLideradoInicio,
  '/liderado/compass': loadLideradoCompass,
  '/liderado/1on1s': loadLideradoOneOnOnes,
  '/liderado/pdi': loadLideradoPDI,
  '/liderado/avaliacoes': loadLideradoAvaliacoes,
  '/liderado/meu-rhitmo': loadLideradoMeuRhitmo,
  '/liderado/configuracoes': loadLideradoConfiguracoes,

  '/hr': loadHRDashboard,
  '/hr/teams': loadHRTeams,
  '/hr/members': loadHRMembers,
  '/hr/pessoas': loadHRPessoas,
  '/hr/analytics': loadHRAnalytics,
  '/hr/ritmo': loadHRRitmo,
  '/hr/competency-framework': loadCompetencyFramework,

  '/admin': loadAdmin,
  '/design-system': loadDesignSystem,
};

const prefetched = new Set<string>();

/**
 * Warm a route's JS chunk into the browser cache.
 * Safe to call repeatedly — only triggers the import once per route.
 */
export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;
  const loader = PREFETCH_MAP[path];
  if (!loader) return;
  prefetched.add(path);
  // Fire and forget. If it fails, lazy() will retry on actual navigation.
  loader().catch(() => prefetched.delete(path));
}
