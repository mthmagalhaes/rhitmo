import {
  Calendar,
  BookOpen,
  Activity,
  ClipboardList,
  Settings,
  Compass,
  Heart,
  Home,
  Target,
  FileText,
  Layers,
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
 * Maximum 5 items. Settings is the 6th, always last.
 */
export const LEADER_NAV_ITEMS: NavItem[] = [
  { id: 'inicio', labelKey: 'nav.lider.inicio', icon: Home, to: '/lider/inicio' },
  { id: '1on1s', labelKey: 'nav.lider.um_pra_um', icon: Calendar, to: '/lider/1on1s' },
  { id: 'diario', labelKey: 'nav.lider.diario', icon: BookOpen, to: '/lider/diario' },
  { id: 'pulse', labelKey: 'nav.lider.pulse', icon: Activity, to: '/lider/pulse' },
  { id: 'objetivos', labelKey: 'nav.lider.objetivos', icon: Target, to: '/lider/objetivos' },
  { id: 'avaliacoes', labelKey: 'nav.lider.avaliacoes', icon: ClipboardList, to: '/lider/avaliacoes' },
  { id: 'contexto', labelKey: 'nav.lider.contexto', icon: Layers, to: '/lider/contexto' },
  { id: 'configuracoes', labelKey: 'nav.lider.configuracoes', icon: Settings, to: '/lider/configuracoes' },
];

/**
 * Primary navigation for Direct Reports (linked members without leader role).
 * Maximum 6 items including Settings.
 */
export const DIRECT_REPORT_NAV_ITEMS: NavItem[] = [
  { id: 'compass', labelKey: 'nav.liderado.compass', icon: Compass, to: '/liderado/compass' },
  { id: '1on1s', labelKey: 'nav.liderado.um_pra_um', icon: Calendar, to: '/liderado/1on1s' },
  { id: 'pulse', labelKey: 'nav.liderado.pulse', icon: Heart, to: '/liderado/pulse' },
  { id: 'pdi', labelKey: 'nav.liderado.pdi', icon: Target, to: '/liderado/pdi' },
  { id: 'avaliacoes', labelKey: 'nav.liderado.avaliacoes', icon: FileText, to: '/liderado/avaliacoes' },
  { id: 'configuracoes', labelKey: 'nav.liderado.configuracoes', icon: Settings, to: '/liderado/configuracoes' },
];

export type SidebarPersona = 'leader' | 'direct_report';

export function resolvePersona(opts: {
  isLinkedMember: boolean;
  isLeader: boolean;
  isHRAdmin: boolean;
}): SidebarPersona {
  if (opts.isLinkedMember && !opts.isLeader && !opts.isHRAdmin) return 'direct_report';
  return 'leader';
}

export const LEADER_HOME = '/lider/inicio';
export const DIRECT_REPORT_HOME = '/liderado/inicio';

/**
 * Returns the correct home route for a given persona context.
 * Use inside authenticated pages (NotFound, MemberDetails, etc.)
 * to avoid the legacy /dashboard hop.
 */
export function getHomeRoute(opts: {
  isLinkedMember: boolean;
  isLeader: boolean;
  isHRAdmin: boolean;
}): string {
  return resolvePersona(opts) === 'leader' ? LEADER_HOME : DIRECT_REPORT_HOME;
}
