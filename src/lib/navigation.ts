import {
  Calendar,
  BookOpen,
  ClipboardList,
  Home,
  FileText,
  Users,
  LayoutDashboard,
  Activity,
  // Compass, Heart, Target, Building2, BarChart3 e ListChecks ficam reservados
  // para reativar Compass/Pulse/PDI/Times/Analytics/Frameworks no menu.
  type LucideIcon,
} from 'lucide-react';


export interface NavItem {
  id: string;
  /** i18n key under the `nav` namespace (translation file). */
  labelKey: string;
  icon: LucideIcon;
  to: string;
  ariaLabel?: string;
}

/**
 * Primary navigation for Leaders / Owners / HR Admins (when in leader context).
 * Settings does NOT belong here — it lives in the WorkspaceSwitcher dropdown
 * along with Help Center and Invite Members. The primary nav is reserved for
 * leadership workflows only.
 */
export const LEADER_NAV_ITEMS: NavItem[] = [
  { id: 'inicio', labelKey: 'nav.lider.inicio', icon: Home, to: '/lider/inicio' },
  { id: 'pessoas', labelKey: 'nav.lider.pessoas', icon: Users, to: '/lider/pessoas' },
  { id: 'diario', labelKey: 'nav.lider.diario', icon: BookOpen, to: '/lider/diario' },
  // Objetivos: oculto da sidebar enquanto repensamos a feature.
  // Rota, tabela `goals`, hooks e consumo por IA continuam vivos. Não re-adicionar sem decisão de produto.
  // { id: 'objetivos', labelKey: 'nav.lider.objetivos', icon: Target, to: '/lider/objetivos' },
  { id: 'avaliacoes', labelKey: 'nav.lider.avaliacoes', icon: ClipboardList, to: '/lider/avaliacoes' },
];


/**
 * Primary navigation for HR Admins that don't also own the workspace.
 * Replaces the leader sidebar to avoid empty 1:1/Diário/Objetivos screens
 * and to make /hr the obvious entry point.
 */
export const HR_ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'overview', labelKey: 'nav.hr.overview', icon: LayoutDashboard, to: '/hr' },
  { id: 'members', labelKey: 'nav.hr.members', icon: Users, to: '/hr/pessoas' },
  // Visão BP: cobertura e cadência das 1:1s por líder (só metadados, nunca conteúdo).
  { id: 'ritmo', labelKey: 'nav.hr.ritmo', icon: Activity, to: '/hr/ritmo' },
  // Rhitmo Lean: Times e Analytics ocultos do menu. Rotas /hr/teams e /hr/analytics
  // continuam vivas (links salvos funcionam), mas não competem com o fluxo principal
  // enquanto a base não pede analytics de RH. Não re-adicionar sem decisão de produto.
  // { id: 'teams', labelKey: 'nav.hr.teams', icon: Building2, to: '/hr/teams' },
  // { id: 'analytics', labelKey: 'nav.hr.analytics', icon: BarChart3, to: '/hr/analytics' },
  // Frameworks oculto no menu enquanto a feature não está pronta — rota continua viva.
  // { id: 'framework', labelKey: 'nav.hr.framework', icon: ListChecks, to: '/hr/competency-framework' },
];

/**
 * Primary navigation for Direct Reports (linked members without leader role).
 * Settings lives in the WorkspaceSwitcher dropdown, not here.
 */
export const DIRECT_REPORT_NAV_ITEMS: NavItem[] = [
  { id: 'inicio', labelKey: 'nav.liderado.inicio', icon: Home, to: '/liderado/inicio' },
  { id: '1on1s', labelKey: 'nav.liderado.um_pra_um', icon: Calendar, to: '/liderado/1on1s' },
  { id: 'avaliacoes', labelKey: 'nav.liderado.avaliacoes', icon: FileText, to: '/liderado/avaliacoes' },
  // Rhitmo Lean: Compass virou seção da home (/liderado/inicio); Pulse (0 surveys criados)
  // e PDI (1 registro) saíram do menu. Rotas, tabelas e RLS intactos.
  // { id: 'compass', labelKey: 'nav.liderado.compass', icon: Compass, to: '/liderado/compass' },
  // { id: 'pulse', labelKey: 'nav.liderado.pulse', icon: Heart, to: '/liderado/pulse' },
  // { id: 'pdi', labelKey: 'nav.liderado.pdi', icon: Target, to: '/liderado/pdi' },
];


export type SidebarPersona = 'leader' | 'hr_admin' | 'direct_report';

export type ActiveMode = 'leader' | 'company';

export interface PersonaOpts {
  isLinkedMember: boolean;
  isLeader: boolean;
  isHRAdmin: boolean;
  isWorkspaceOwner?: boolean;
  /**
   * True when the user is `leader_user_id` of at least one team in the
   * active workspace (vem do RPC `get_account_context.is_team_leader`).
   * Fonte da verdade para "tem visão de líder real"; `isLeader` no
   * AccountContext é amplo (inclui HR Admin) e não serve para isso.
   */
  isTeamLeader?: boolean;
  /**
   * For users that hold both leader and owner/HR roles, indicates which
   * "view" they're actively using. Defaults to 'leader'.
   */
  activeMode?: ActiveMode;
}

export function resolvePersona(opts: PersonaOpts): SidebarPersona {
  if (opts.isLinkedMember && !opts.isLeader && !opts.isHRAdmin) return 'direct_report';

  const hasLeaderAccess = opts.isTeamLeader ?? (opts.isLeader && !opts.isHRAdmin);
  const hasCompanyAccess = !!opts.isHRAdmin || !!opts.isWorkspaceOwner;

  // Multi-role (líder de time + Owner/HR): activeMode decide.
  if (hasLeaderAccess && hasCompanyAccess) {
    return opts.activeMode === 'company' ? 'hr_admin' : 'leader';
  }

  // Single-role.
  if (hasCompanyAccess && !hasLeaderAccess) return 'hr_admin';
  return 'leader';
}

export const LEADER_HOME = '/lider/inicio';
export const HR_ADMIN_HOME = '/hr';
export const DIRECT_REPORT_HOME = '/liderado/inicio';

/**
 * Returns the correct home route for a given persona context.
 * Use inside authenticated pages (NotFound, MemberDetails, etc.)
 * to avoid the legacy /dashboard hop.
 */
export function getHomeRoute(opts: PersonaOpts): string {
  const persona = resolvePersona(opts);
  if (persona === 'direct_report') return DIRECT_REPORT_HOME;
  if (persona === 'hr_admin') return HR_ADMIN_HOME;
  return LEADER_HOME;
}
