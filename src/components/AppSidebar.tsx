import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Palette, ArrowLeft, ArrowRightLeft, UserPlus, LifeBuoy, Copy, Check, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useAccount } from '@/contexts/AccountContext';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  LEADER_NAV_ITEMS,
  DIRECT_REPORT_NAV_ITEMS,
  LEADER_QUICK_ACTIONS,
  DIRECT_REPORT_QUICK_ACTIONS,
  LEADER_HOME,
  DIRECT_REPORT_HOME,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';
import { WorkspaceSwitcher } from '@/components/sidebar/WorkspaceSwitcher';
import { QuickActionsRow } from '@/components/sidebar/QuickActionsRow';
import { ThreadsList } from '@/components/sidebar/ThreadsList';
import { SidebarFooterCTA } from '@/components/sidebar/SidebarFooterCTA';
import { SidebarProfileBlock } from '@/components/sidebar/SidebarProfileBlock';
import { GlobalSearchDialog } from '@/components/sidebar/GlobalSearchDialog';
import { MentorChat } from '@/components/MentorChat';
import { BulkOnboardDialog } from '@/components/admin/BulkOnboardDialog';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { t } = useTranslation();
  const { open } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { id: effectiveUserId, isImpersonating } = useEffectiveUser();
  const { stopImpersonation, impersonatedEmail } = useImpersonation();
  const { isLeader, isHRAdmin, isLinkedMember, linkedMember } = useAccount();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Workspace names for the bulk-onboard dialog (loaded only on demand).
  const { data: workspaceNames = [] } = useQuery({
    queryKey: ['sidebar-workspace-names', effectiveUserId],
    queryFn: async (): Promise<string[]> => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase.from('workspaces').select('name');
      if (error) return [];
      return (data ?? []).map((w: { name: string }) => w.name);
    },
    enabled: !!effectiveUserId && inviteOpen,
    staleTime: 5 * 60 * 1000,
  });

  const isSuperAdmin = isAdmin && user?.email === 'matheus@rhitmo.co' && !isImpersonating;
  const isInHRContext = location.pathname.startsWith('/hr');

  const persona = resolvePersona({ isLinkedMember, isLeader, isHRAdmin });
  const navItems = persona === 'leader' ? LEADER_NAV_ITEMS : DIRECT_REPORT_NAV_ITEMS;
  const quickActions = persona === 'leader' ? LEADER_QUICK_ACTIONS : DIRECT_REPORT_QUICK_ACTIONS;
  const homeRoute = persona === 'leader' ? LEADER_HOME : DIRECT_REPORT_HOME;

  const userName =
    (persona === 'direct_report' && linkedMember?.name) ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    t('common.user');

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('support@rhitmo.co');
      setCopied(true);
      toast({ title: t('sidebar.emailCopied') });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t('sidebar.copyManually') });
    }
  };

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
          <WorkspaceSwitcher />
        ) : (
          <RhitmoLogo size="sm" className="text-primary mx-auto" />
        )}
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Zone B — Quick actions row */}
        {open && (
          <div className="pt-1 pb-3">
            <QuickActionsRow
              homeRoute={homeRoute}
              actions={quickActions}
              onOpenMentor={() => setMentorOpen(true)}
              onOpenSearch={() => setSearchOpen(true)}
            />
          </div>
        )}

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

        {/* Zone D — Threads list (silent empty) */}
        {open && <ThreadsList persona={persona} />}

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

        {/* Persistent AI CTA */}
        {open && <SidebarFooterCTA persona={persona} />}

        {/* Invite (leader only) */}
        {open && persona === 'leader' && (
          <button
            type="button"
            onClick={() => navigate(LEADER_HOME)}
            className="mx-2 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{t('nav.convidar_membros')}</span>
          </button>
        )}

        {/* Settings + Support quick links */}
        {open && (
          <div className="mx-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>{t('common.settings')}</span>
            </button>
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
              title={t('sidebar.support')}
              aria-label={t('sidebar.support')}
            >
              <LifeBuoy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Profile block with theme toggle */}
        {open && effectiveUserId && (
          <SidebarProfileBlock
            memberId={effectiveUserId}
            name={userName}
            avatarUrl={(user?.user_metadata?.avatar as string | undefined) ?? null}
          />
        )}
      </SidebarFooter>

      <ProfileSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              {t('sidebar.talkToUs')}
            </DialogTitle>
            <DialogDescription>{t('sidebar.supportDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-4">
            <code className="flex-1 bg-muted px-4 py-2 rounded-md font-mono text-sm text-foreground">
              support@rhitmo.co
            </code>
            <Button variant="outline" size="icon" onClick={handleCopyEmail}>
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
