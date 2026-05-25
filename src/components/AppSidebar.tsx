import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

import { ShieldCheck, Palette, ArrowLeft, ArrowRightLeft, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useAccount } from '@/contexts/AccountContext';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/hooks/useImpersonation';


import {
  LEADER_NAV_ITEMS,
  DIRECT_REPORT_NAV_ITEMS,
  HR_ADMIN_NAV_ITEMS,
  LEADER_HOME,

  resolvePersona,
} from '@/lib/navigation';
import { NavLink } from '@/components/NavLink';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';
import { WorkspaceSwitcher } from '@/components/sidebar/WorkspaceSwitcher';

import { SidebarFooterCTA } from '@/components/sidebar/SidebarFooterCTA';
import { SidebarProfileBlock } from '@/components/sidebar/SidebarProfileBlock';
import { GlobalSearchDialog } from '@/components/sidebar/GlobalSearchDialog';
import { MentorChat } from '@/components/MentorChat';
import { NewMemberDialog } from '@/components/NewMemberDialog';
import { cn } from '@/lib/utils';
import { prefetchRoute } from '@/lib/routeLoaders';

export function AppSidebar() {
  const { t } = useTranslation();
  const { open } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { id: effectiveUserId, isImpersonating } = useEffectiveUser();
  const { stopImpersonation, impersonatedEmail } = useImpersonation();
  const { isLeader, isHRAdmin, isLinkedMember, isWorkspaceOwner, linkedMember, workspaceId } = useAccount();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);


  const isSuperAdmin = isAdmin && user?.email === 'matheus@rhitmo.co' && !isImpersonating;
  const isInHRContext = location.pathname.startsWith('/hr');

  const persona = resolvePersona({ isLinkedMember, isLeader, isHRAdmin, isWorkspaceOwner });
  const navItems =
    persona === 'leader'
      ? LEADER_NAV_ITEMS
      : persona === 'hr_admin'
        ? HR_ADMIN_NAV_ITEMS
        : DIRECT_REPORT_NAV_ITEMS;
  

  const userName =
    (persona === 'direct_report' && linkedMember?.name) ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    t('common.user');

  // Super admin (god's eye) keeps a minimal dedicated sidebar.
  if (isSuperAdmin) {
    return (
      <Sidebar collapsible="icon" className="border-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <SidebarHeader className={open ? 'py-6 px-5' : 'py-6 px-3 flex justify-center'}>
          <RhitmoLogo size="sm" className="text-primary" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Painel Admin">
                <NavLink
                  to="/admin"
                  end
                  className="rounded-xl tracking-tight font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  activeClassName="bg-primary/10 text-primary font-semibold"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Painel Admin</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Design System">
                <NavLink
                  to="/design-system"
                  end
                  className="rounded-xl tracking-tight font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  activeClassName="bg-primary/10 text-primary font-semibold"
                >
                  <Palette className="h-4 w-4" />
                  <span>Design System</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:px-3 focus:py-1 focus:rounded-lg"
      >
        {t('nav.skip_to_content')}
      </a>

      {/* Zone A — Workspace Switcher */}
      <SidebarHeader className={cn('pt-4 pb-2', open ? 'px-3' : 'px-2')}>
        {open ? (
          <WorkspaceSwitcher
            onOpenInvite={persona === 'leader' ? () => setInviteOpen(true) : undefined}
          />
        ) : (
          <RhitmoLogo size="sm" className="text-primary mx-auto" />
        )}
      </SidebarHeader>

      <SidebarContent className="gap-0 pt-2">

        {/* Zone C — Primary nav */}
        <SidebarMenu className="px-2 gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild tooltip={t(item.labelKey)}>
                  <NavLink
                    to={item.to}
                    end
                    aria-label={item.ariaLabel ?? t(item.labelKey)}
                    onMouseEnter={() => prefetchRoute(item.to)}
                    onFocus={() => prefetchRoute(item.to)}
                    className={cn(
                      'rounded-xl tracking-tight font-medium transition-colors',
                      'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/40',
                    )}
                    activeClassName={cn(
                      'bg-background text-sidebar-foreground font-semibold',
                      'border border-border/50 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
                      'dark:bg-primary/10 dark:text-primary dark:border-primary/20',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* CTA — Pergunte à Rhitmo (alinhado com a navegação) */}
        {persona === 'leader' && (
          <div className="px-2 pt-2 mt-2 border-t border-border/40">
            <SidebarFooterCTA persona={persona} />
          </div>
        )}

        {/* HR context switcher (kept for HR Admins) */}
        {open && !isInHRContext && isHRAdmin && (
          <div className="px-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 rounded-xl text-xs text-muted-foreground hover:text-primary"
              onClick={() => navigate('/hr')}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              {t('sidebar.backToHRPanel')}
            </Button>
          </div>
        )}
        {open && isInHRContext && isHRAdmin && (
          <div className="px-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 rounded-xl text-xs text-muted-foreground hover:text-primary"
              onClick={() => navigate(LEADER_HOME)}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              {t('sidebar.viewAsLeader')}
            </Button>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-1 pb-2 pt-2 border-t border-border/30">
        {/* Stop impersonation banner */}
        {isImpersonating && open && (
          <div className="px-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={stopImpersonation}
              className="w-full justify-start gap-2 rounded-xl border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <div className="flex flex-col items-start min-w-0 leading-tight">
                <span className="text-xs font-semibold">Encerrar visualização</span>
                {impersonatedEmail && (
                  <span className="text-[10px] truncate max-w-[160px] text-amber-800/80">
                    {impersonatedEmail}
                  </span>
                )}
              </div>
            </Button>
          </div>
        )}

        {/* Persistent AI CTA — only direct_report (leader CTA is at top) */}
        {open && persona === 'direct_report' && <SidebarFooterCTA persona={persona} />}

        {/* Discreet global search shortcut (cmd+K also works) */}
        {open && (
          <div className="mx-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
              aria-label={t('nav.quick.search', 'Buscar')}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">{t('nav.quick.search', 'Buscar')}</span>
              <kbd className="hidden sm:inline text-[10px] font-mono text-muted-foreground/70 border border-border/40 rounded px-1 py-0.5">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Profile block — avatar opens personal profile dialog */}
        {open && effectiveUserId && (
          <SidebarProfileBlock
            memberId={effectiveUserId}
            name={userName}
            avatarUrl={(user?.user_metadata?.avatar as string | undefined) ?? null}
            onOpenProfileSettings={() => setSettingsOpen(true)}
          />
        )}
      </SidebarFooter>

      <ProfileSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Mentor / Meu Rhitmo chat */}
      <MentorChat
        open={mentorOpen}
        onOpenChange={setMentorOpen}
        userType={persona === 'leader' ? 'leader' : 'direct_report'}
        memberName={userName}
        memberId={persona === 'direct_report' ? linkedMember?.id : undefined}
        userId={effectiveUserId ?? undefined}
      />

      {/* Global cmdk search */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} persona={persona} />

      {/* Add member (single, leader-style) */}
      {persona === 'leader' && workspaceId && (
        <NewMemberDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          workspaceId={workspaceId}
        />
      )}

    </Sidebar>
  );
}
