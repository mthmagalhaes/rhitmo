import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RhythmWave } from '@/components/RhythmWave';
import { Home, BarChart3, CreditCard, LogOut, Settings, ShieldCheck, LifeBuoy, BookOpen, Copy, Check, Users, LayoutDashboard, Award, ArrowRightLeft, UserCheck, Palette, Compass, FileText, User, Download } from 'lucide-react';
import { ChromeIcon } from '@/components/icons/ChromeIcon';
import { SlackIcon } from '@/components/icons/SlackIcon';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { MemberAvatar } from '@/components/MemberAvatar';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';
import { ChromeExtensionSetupDialog } from '@/components/extension/ChromeExtensionSetupDialog';
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
  const { isAdmin } = useAdmin();
  const { isLeader, isHRAdmin, isUser, loading: roleLoading } = useUserRole();
  const { isLinkedMember, linkedMember } = useLinkedMember();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isInHRContext = location.pathname.startsWith('/hr');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
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
    toast({ title: success ? 'E-mail copiado!' : 'Copie manualmente: support@rhitmo.co' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!"
    });
    navigate('/auth', { replace: true });
  };

  const showMemberMenu = !roleLoading && !isLeader && !isHRAdmin && (isUser || isLinkedMember);

  const userName = (!isLeader && isLinkedMember && linkedMember?.name)
    || user?.user_metadata?.full_name 
    || user?.user_metadata?.name 
    || 'Usuário';

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
        {/* HR Admin menu — show when in /hr/* context */}
        {isInHRContext && isHRAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">Painel RH</SidebarGroupLabel>
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
            <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">Administração</SidebarGroupLabel>
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
            <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">Menu</SidebarGroupLabel>
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

        {/* Conectores — Chrome & Slack */}
        {!isInHRContext && !showMemberMenu && open && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">Conectores</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 space-y-2">
                <button
                  onClick={() => setExtensionDialogOpen(true)}
                  className="w-full flex items-center gap-3 h-12 px-4 rounded-xl border border-border/60 bg-background hover:bg-accent/50 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <ChromeIcon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary tracking-tight">Conector Chrome</span>
                </button>
                <button
                  onClick={() => setSlackDialogOpen(true)}
                  className="w-full flex items-center gap-3 h-12 px-4 rounded-xl border border-border/60 bg-background hover:bg-accent/50 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <SlackIcon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary tracking-tight">Conector Slack</span>
                </button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isInHRContext && user?.email === 'matheus@rhitmo.co' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">Marca</SidebarGroupLabel>
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
            <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">Administração</SidebarGroupLabel>
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
      </SidebarContent>

      <SidebarFooter>
        {/* Context switch: HR Admin → Leader view */}
        {isInHRContext && isHRAdmin && isLeader && open && (
          <div className="px-4 py-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-primary"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Ver como Líder
            </Button>
          </div>
        )}

        {/* Context switch: Leader → HR view */}
        {!isInHRContext && isHRAdmin && open && (
          <div className="px-4 py-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-primary"
              onClick={() => navigate('/hr')}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Voltar ao Painel RH
            </Button>
          </div>
        )}

        {/* Support link */}
        <div className="px-4 py-2">
          <SidebarMenuButton asChild tooltip="Suporte">
            <button 
              onClick={() => setSupportDialogOpen(true)}
              className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-primary rounded-2xl transition-all duration-200 hover:translate-x-1 w-full"
            >
              <LifeBuoy className="h-4 w-4" />
              {open && <span>Suporte / Feedback</span>}
            </button>
          </SidebarMenuButton>
        </div>

        {/* User block */}
        <div className="flex items-center gap-3 p-3 mx-2 mb-4 rounded-2xl bg-white/30 shadow-sm">
          {open && user?.id && (
            <MemberAvatar 
              memberId={user.id} 
              memberName={userName} 
              size="md"
            />
          )}
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {userName}
              </p>
            </div>
          )}
          <div className="flex gap-1">
            {open && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground hover:bg-primary/5 rounded-xl"
                onClick={() => setSettingsOpen(true)}
                title="Configurações"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground hover:bg-primary/5 rounded-xl"
              onClick={handleSignOut}
              title="Sair"
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
              Fale com a gente
            </DialogTitle>
            <DialogDescription>
              Estamos aqui para ajudar. Para dúvidas, reclamações ou feedbacks, envie um e-mail para:
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

      <ChromeExtensionSetupDialog
        open={extensionDialogOpen}
        onOpenChange={setExtensionDialogOpen}
      />

      <SlackConnectorDialog
        open={slackDialogOpen}
        onOpenChange={setSlackDialogOpen}
      />
    </Sidebar>
  );
}