import { useState } from 'react';
import { RhythmWave } from '@/components/RhythmWave';
import { Home, BarChart3, CreditCard, LogOut, Settings, ShieldCheck, LifeBuoy, BookOpen, Copy, Check, Users, LayoutDashboard, Award, ArrowRightLeft, UserCheck, Palette, Compass, FileText, User, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { MemberAvatar } from '@/components/MemberAvatar';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';
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
import { Separator } from '@/components/ui/separator';

const menuItems = [
  { title: 'Início', url: '/dashboard', icon: Home },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Central de Conhecimento', url: '/help', icon: BookOpen },
  { title: 'Extensão Chrome', url: '#extension', icon: Download },
  { title: 'Assinatura', url: '/billing', icon: CreditCard },
];

const leaderOnlyItems = ['Analytics', 'Assinatura', 'Central de Conhecimento'];

const memberMenuItems = [
  { title: 'Início', url: '/dashboard', icon: Home },
  { title: 'Minha Carreira', url: '/dashboard/carreira', icon: Compass },
  { title: 'Feedbacks', url: '/dashboard/feedbacks', icon: FileText },
  { title: 'Meu Perfil', url: '/dashboard/perfil', icon: User },
];

const hrMenuItems = [
  { title: 'Visão Geral', url: '/hr', icon: LayoutDashboard },
  { title: 'Times e Líderes', url: '/hr/teams', icon: Users },
  { title: 'Liderados', url: '/hr/members', icon: UserCheck },
  { title: 'Analytics', url: '/hr/analytics', icon: BarChart3 },
  { title: 'Competências', url: '/hr/competency-framework', icon: Award },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { isLeader, isHRAdmin, isUser } = useUserRole();
  const { isLinkedMember, linkedMember } = useLinkedMember();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isInHRContext = location.pathname.startsWith('/hr');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@rhitmo.co');
    setCopied(true);
    toast({ title: "E-mail copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadExtension = () => {
    fetch('/rhitmo-recorder-extension.zip')
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'rhitmo-recorder-extension.zip';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast({ title: 'Erro ao baixar extensão', variant: 'destructive' }));
  };

  const handleCopyToken = async () => {
    const { data } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getSession());
    const token = data?.session?.access_token;
    if (token) {
      navigator.clipboard.writeText(token);
      setTokenCopied(true);
      toast({ title: 'Token copiado!' });
      setTimeout(() => setTokenCopied(false), 2000);
    } else {
      toast({ title: 'Faça login novamente para copiar o token', variant: 'destructive' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!"
    });
    navigate('/auth', { replace: true });
  };

  const userName = (isLinkedMember && linkedMember?.name) 
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
                {((isUser || isLinkedMember) ? memberMenuItems : menuItems)
                  .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      {item.url === '#extension' ? (
                        <button
                          onClick={() => setExtensionDialogOpen(true)}
                          className="rounded-[10px] tracking-tight font-medium transition-all duration-200 hover:translate-x-1 hover:bg-[rgba(124,58,237,0.05)] hover:text-primary text-muted-foreground flex items-center gap-2 w-full"
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </button>
                      ) : (
                        <NavLink 
                          to={item.url} 
                          end
                          className="rounded-[10px] tracking-tight font-medium transition-all duration-200 hover:translate-x-1 hover:bg-[rgba(124,58,237,0.05)] hover:text-primary text-muted-foreground"
                          activeClassName="bg-[rgba(124,58,237,0.08)] text-primary font-bold"
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Design System — only for matheus@rhitmo.co */}
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

      <Dialog open={extensionDialogOpen} onOpenChange={setExtensionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Extensão Chrome — Rhitmo Recorder
            </DialogTitle>
            <DialogDescription>
              Grave reuniões no Google Meet automaticamente. Ao entrar em uma chamada, a extensão inicia a gravação e envia o áudio para transcrição pela IA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <Button onClick={handleDownloadExtension} className="w-full rounded-xl gap-2">
              <Download className="h-4 w-4" />
              Baixar Extensão (.zip)
            </Button>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Como instalar:</p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Descompacte o arquivo ZIP em uma pasta.</li>
                <li>No Chrome, acesse <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">chrome://extensions</code></li>
                <li>Ative o <strong>Modo Desenvolvedor</strong> (toggle no canto superior direito).</li>
                <li>Clique em <strong>"Carregar sem compactação"</strong> e selecione a pasta.</li>
              </ol>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Token de Conexão:</p>
              <p className="text-xs text-muted-foreground">Cole este token no popup da extensão para autenticá-la.</p>
              <Button variant="outline" size="sm" className="w-full rounded-xl gap-2" onClick={handleCopyToken}>
                {tokenCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {tokenCopied ? 'Token copiado!' : 'Copiar Token'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}