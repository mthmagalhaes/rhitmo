import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RhythmWave } from '@/components/RhythmWave';
import { Home, BarChart3, CreditCard, LogOut, Settings, ShieldCheck, LifeBuoy, BookOpen, Copy, Check, Users, LayoutDashboard, Award, ArrowRightLeft, UserCheck, Palette, Compass, FileText, User, Download, ArrowLeft, Eye, FileAudio } from 'lucide-react';
import { useImpersonation } from '@/hooks/useImpersonation';
import { SlackIcon } from '@/components/icons/SlackIcon';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { MemberAvatar } from '@/components/MemberAvatar';
import { ImpersonationIndicator } from '@/components/admin/ImpersonationIndicator';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';

import { SlackConnectorDialog } from '@/components/slack/SlackConnectorDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Menu items are now defined inside the component to use t()

export function AppSidebar() {
  const { t } = useTranslation();
  const { open } = useSidebar();

  const menuItems = [
    { title: t('sidebar.home'), url: '/dashboard', icon: Home },
    { title: t('sidebar.analytics'), url: '/analytics', icon: BarChart3 },
    { title: t('sidebar.knowledgeCenter'), url: '/help', icon: BookOpen },
    { title: t('sidebar.subscription'), url: '/billing', icon: CreditCard },
  ];

  const memberMenuItems = [
    { title: t('sidebar.home'), url: '/dashboard', icon: Home },
    { title: t('sidebar.myCareer'), url: '/dashboard/carreira', icon: Compass },
    { title: t('sidebar.feedbacks'), url: '/dashboard/feedbacks', icon: FileText },
    { title: t('sidebar.myProfile'), url: '/dashboard/perfil', icon: User },
  ];

  const hrMenuItems = [
    { title: t('sidebar.overview'), url: '/hr', icon: LayoutDashboard },
    { title: t('sidebar.teamsAndLeaders'), url: '/hr/teams', icon: Users },
    { title: t('sidebar.directReports'), url: '/hr/members', icon: UserCheck },
    { title: t('sidebar.analytics'), url: '/hr/analytics', icon: BarChart3 },
    { title: t('sidebar.competencies'), url: '/hr/competency-framework', icon: Award },
  ];
  const { user, signOut } = useAuth();
  const { id: effectiveUserId, isImpersonating } = useEffectiveUser();
  const { isAdmin } = useAdmin();
  const { isLeader, isHRAdmin, isUser, loading: roleLoading } = useUserRole();
  const { isLinkedMember, linkedMember } = useLinkedMember();
  const { stopImpersonation, impersonatedEmail } = useImpersonation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isInHRContext = location.pathname.startsWith('/hr');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slackDialogOpen, setSlackDialogOpen] = useState(false);
  const handleCopyEmail = async () => {
    const email = 'support@rhitmo.co';
    let success = false;
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(email); success = true; } catch { /* fallback */ }
    }
    if (!success) {
      const ta = document.createElement('textarea');
      ta.value = email;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { success = document.execCommand('copy'); } catch { success = false; }
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast({ title: success ? t('sidebar.emailCopied') : t('sidebar.copyManually') });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: t('sidebar.logoutDone'),
      description: t('sidebar.seeYouSoon')
    });
    navigate('/auth', { replace: true });
  };

  const showMemberMenu = !roleLoading && !isLeader && !isHRAdmin && (isUser || isLinkedMember);
  const isSuperAdmin = isAdmin && user?.email === 'matheus@rhitmo.co';

    const leaderOnlyItems = [t('sidebar.analytics'), t('sidebar.subscription'), t('sidebar.knowledgeCenter')];
    const userName = (!isLeader && isLinkedMember && linkedMember?.name)
      || user?.user_metadata?.full_name
    || user?.user_metadata?.name 
    || t('common.user');

  return (
    <Sidebar collapsible="icon" className="border-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <SidebarHeader className={`py-6 ${open ? 'px-5' : 'px-3 flex justify-center'}`}>
        <div className="flex items-center gap-2">
          <RhitmoLogo size="sm" className="text-primary" />
        </div>
        {open && (
          <div className="mt-3 -mx-2 overflow-hidden">
            <RhythmWave variant="divider" height={24} className="opacity-50" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Super Admin "God's Eye" — minimal menu */}
        {isSuperAdmin ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">Controle</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Painel Admin">
                      <NavLink 
                        to="/admin" 
                        end
                        className="rounded-[10px] tracking-tight font-medium transition-all duration-200 hover:translate-x-1 hover:bg-[rgba(124,58,237,0.05)] hover:text-primary text-muted-foreground"
                        activeClassName="bg-[rgba(124,58,237,0.08)] text-primary font-bold"
                      >
                        <ShieldCheck className="h-5 w-5" />
                        <span>Painel Admin</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Design System">
                      <NavLink 
                        to="/design-system" 
                        end
                        className="rounded-[10px] tracking-tight font-medium transition-all duration-200 hover:translate-x-1 hover:bg-[rgba(124,58,237,0.05)] hover:text-primary text-muted-foreground"
                        activeClassName="bg-[rgba(124,58,237,0.08)] text-primary font-bold"
                      >
                        <Palette className="h-5 w-5" />
                        <span>Design System</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <>
            {/* HR Admin menu — show when in /hr/* context */}
            {isInHRContext && isHRAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">{t('sidebar.hrPanel')}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {hrMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <NavLink 
                            to={item.url} 
                            end
                            className="rounded-[10px] tracking-tight font-medium transition-all duration-200 hover:translate-x-1 hover:bg-[rgba(124,58,237,0.05)] hover:text-primary text-muted-foreground"
                            activeClassName="bg-[rgba(124,58,237,0.08)] text-primary font-bold"
                          >
                            <item.icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Admin menu — show in HR context for super admins */}
            {isInHRContext && isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">{t('sidebar.administration')}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Admin">
                        <NavLink 
                          to="/admin" 
                          end
                          className="rounded-[10px] tracking-tight font-medium transition-all duration-200 hover:translate-x-1 hover:bg-[rgba(124,58,237,0.05)] hover:text-primary text-muted-foreground"
                          activeClassName="bg-[rgba(124,58,237,0.08)] text-primary font-bold"
                        >
                          <ShieldCheck className="h-5 w-5" />
                          <span>Admin</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Standard menu — show when NOT in HR context */}
            {!isInHRContext && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">{t('sidebar.menu')}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {(showMemberMenu ? memberMenuItems : menuItems)
                      .map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <NavLink 
                            to={item.url} 
                            end
                            className="rounded-[10px] tracking-tight font-medium transition-all duration-200 hover:translate-x-1 hover:bg-[rgba(124,58,237,0.05)] hover:text-primary text-muted-foreground"
                            activeClassName="bg-[rgba(124,58,237,0.08)] text-primary font-bold"
                          >
                            <item.icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Integrações — Transcrição automática & Slack */}
            {!isInHRContext && !showMemberMenu && open && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">{t('sidebar.integrations')}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-2 space-y-2">
                    <button
                      onClick={() => navigate('/help#l-auto-transcription')}
                      className="w-full flex items-center gap-3 h-12 px-4 rounded-xl border border-border/60 bg-background hover:bg-accent/50 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 group"
                    >
                      <FileAudio className="h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm font-medium text-foreground group-hover:text-primary tracking-tight">{t('sidebar.autoTranscription')}</span>
                    </button>
                    <button
                      onClick={() => setSlackDialogOpen(true)}
                      className="w-full flex items-center gap-3 h-12 px-4 rounded-xl border border-border/60 bg-background hover:bg-accent/50 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 group"
                    >
                      <SlackIcon className="h-5 w-5 shrink-0" />
                      <span className="text-sm font-medium text-foreground group-hover:text-primary tracking-tight">{t('sidebar.slackConnector')}</span>
                    </button>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {!isInHRContext && user?.email === 'matheus@rhitmo.co' && !isImpersonating && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">{t('sidebar.brand')}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Design System">
                        <NavLink 
                          to="/design-system" 
                          end
                          className="rounded-[10px] tracking-tight font-medium transition-all duration-200 hover:translate-x-1 hover:bg-[rgba(124,58,237,0.05)] hover:text-primary text-muted-foreground"
                          activeClassName="bg-[rgba(124,58,237,0.08)] text-primary font-bold"
                        >
                          <Palette className="h-5 w-5" />
                          <span>Design System</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">{t('sidebar.administration')}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Admin">
                        <NavLink 
                          to="/admin" 
                          end
                          className="rounded-[10px] tracking-tight font-medium transition-all duration-200 hover:translate-x-1 hover:bg-[rgba(124,58,237,0.05)] hover:text-primary text-muted-foreground"
                          activeClassName="bg-[rgba(124,58,237,0.08)] text-primary font-bold"
                        >
                          <ShieldCheck className="h-5 w-5" />
                          <span>Admin</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        {/* Stop impersonation — prominent CTA back to /admin */}
        {isImpersonating && (
          <div className="px-3 pt-2 pb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={stopImpersonation}
              title="Encerrar visualização e voltar ao Admin"
              className={
                open
                  ? 'w-full justify-start gap-2 rounded-xl border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 shadow-sm'
                  : 'w-full justify-center rounded-xl border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 shadow-sm h-9 px-0'
              }
            >
              {open ? (
                <>
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <div className="flex flex-col items-start min-w-0 leading-tight">
                    <span className="text-xs font-semibold">Encerrar visualização</span>
                    {impersonatedEmail && (
                      <span className="text-[10px] font-normal text-amber-800/80 truncate max-w-[160px]">
                        {impersonatedEmail}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <ArrowLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Context switch: HR Admin → Leader view */}
        {!isSuperAdmin && isInHRContext && isHRAdmin && isLeader && open && (
          <div className="px-4 py-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-primary"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowRightLeft className="h-4 w-4" />
              {t('sidebar.viewAsLeader')}
            </Button>
          </div>
        )}

        {/* Context switch: Leader → HR view */}
        {!isSuperAdmin && !isInHRContext && isHRAdmin && open && (
          <div className="px-4 py-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-primary"
              onClick={() => navigate('/hr')}
            >
              <ArrowRightLeft className="h-4 w-4" />
              {t('sidebar.backToHRPanel')}
            </Button>
          </div>
        )}

        {/* Support link */}
        <div className="px-4 py-2">
          <SidebarMenuButton asChild tooltip={t('sidebar.support')}>
            <button 
              onClick={() => setSupportDialogOpen(true)}
              className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-primary rounded-2xl transition-all duration-200 hover:translate-x-1 w-full"
            >
              <LifeBuoy className="h-4 w-4" />
              {open && <span>{t('sidebar.supportFeedback')}</span>}
            </button>
          </SidebarMenuButton>
        </div>

        {/* User block */}
        <div className="flex items-center gap-3 p-3 mx-2 mb-4 rounded-2xl bg-white/30 shadow-sm">
          {open && effectiveUserId && (
            <ImpersonationIndicator
              memberId={effectiveUserId}
              memberName={userName}
              avatarUrl={isImpersonating ? linkedMember?.avatar : user?.user_metadata?.avatar}
              size="md"
              showTag={true}
            />
          )}
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {userName}
              </p>
              {isImpersonating && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-900 mt-0.5">
                  Personificando
                </span>
              )}
            </div>
          )}
          <div className="flex gap-1">
            {open && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground hover:bg-primary/5 rounded-xl"
                onClick={() => setSettingsOpen(true)}
                title={t('common.settings')}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground hover:bg-primary/5 rounded-xl"
              onClick={handleSignOut}
              title={t('sidebar.signOut')}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>

      <ProfileSettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />

      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              {t('sidebar.talkToUs')}
            </DialogTitle>
            <DialogDescription>
              {t('sidebar.supportDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-2 mt-4">
            <code className="flex-1 bg-muted px-4 py-2 rounded-md font-mono text-sm text-foreground">
              support@rhitmo.co
            </code>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleCopyEmail}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <SlackConnectorDialog
        open={slackDialogOpen}
        onOpenChange={setSlackDialogOpen}
      />
    </Sidebar>
  );
}