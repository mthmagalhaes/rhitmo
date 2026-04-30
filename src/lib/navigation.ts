import {
  Calendar,
  BookOpen,
  Activity,
  ClipboardList,
  Settings,
  Compass,
  Heart,
  Target,
  FileText,
  Users,
  MessageSquare,
  Search,
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
  { id: '1on1s', labelKey: 'nav.lider.um_pra_um', icon: Calendar, to: '/lider/1on1s' },
  { id: 'diario', labelKey: 'nav.lider.diario', icon: BookOpen, to: '/lider/diario' },
  { id: 'pulse', labelKey: 'nav.lider.pulse', icon: Activity, to: '/lider/pulse' },
  { id: 'avaliacoes', labelKey: 'nav.lider.avaliacoes', icon: ClipboardList, to: '/lider/avaliacoes' },
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

export interface QuickAction {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  /** Either a route to navigate to, or a special action handled inline. */
  to?: string;
  action?: 'open-mentor' | 'open-search';
}

export const LEADER_QUICK_ACTIONS: QuickAction[] = [
  { id: 'cal', labelKey: 'nav.quick.calendar', icon: Calendar, to: '/lider/1on1s' },
  { id: 'people', labelKey: 'nav.quick.people', icon: Users, to: '/lider/pessoas' },
  { id: 'chat', labelKey: 'nav.quick.chat', icon: MessageSquare, action: 'open-mentor' },
  { id: 'search', labelKey: 'nav.quick.search', icon: Search, action: 'open-search' },
];

export const DIRECT_REPORT_QUICK_ACTIONS: QuickAction[] = [
  { id: 'cal', labelKey: 'nav.quick.calendar', icon: Calendar, to: '/liderado/1on1s' },
  { id: 'chat', labelKey: 'nav.quick.chat', icon: MessageSquare, to: '/liderado/meu-rhitmo' },
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
