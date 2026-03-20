import { useState } from 'react';
import { Home, BarChart3, CreditCard, LogOut, Settings, ShieldCheck, LifeBuoy, BookOpen, Copy, Check, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

const menuItems = [
  { title: 'Início', url: '/dashboard', icon: Home },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Assinatura', url: '/billing', icon: CreditCard },
  { title: 'Guia Rhitmo', url: '/help', icon: BookOpen },
];

// Itens que só líderes podem ver
const leaderOnlyItems = ['Analytics', 'Assinatura', 'Guia Rhitmo'];

export function AppSidebar() {
  const { open } = useSidebar();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { isLinkedMember, linkedMember } = useLinkedMember();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@rhitmo.co');
    setCopied(true);
    toast({ title: "E-mail copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    
    toast({
      title: "Logout realizado",
      description: "Até logo!"
    });
    
    // Redirecionar para página de login
    navigate('/auth', { replace: true });
  };

  const userName = (isLinkedMember && linkedMember?.name) 
    || user?.user_metadata?.full_name 
    || user?.user_metadata?.name 
    || 'Usuário';

  return (
    <Sidebar collapsible="icon" className="border-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <SidebarHeader className="px-5 py-6">
        <div className="flex items-center gap-2">
          <RhitmoLogo size="sm" className="text-primary" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 tracking-tight uppercase text-[11px] font-semibold">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter(item => !isLinkedMember || !leaderOnlyItems.includes(item.title))
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
        {/* Link de Suporte */}
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

        {/* Bloco de usuário */}
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

      {/* Dialog de Suporte */}
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
    </Sidebar>
  );
}
