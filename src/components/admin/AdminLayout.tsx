import { RhitmoLogo } from '@/components/RhitmoLogo';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Building2,
  Coins,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

import { cn } from '@/lib/utils';
import type { AdminTab } from '@/pages/Admin';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}

const TABS: Array<{ value: AdminTab; icon: React.ElementType; label: string }> = [
  { value: 'overview', icon: LayoutDashboard, label: 'Visão geral' },
  { value: 'users', icon: Users, label: 'Pessoas' },
  { value: 'workspaces', icon: Building2, label: 'Empresas' },
  { value: 'costs', icon: Coins, label: 'Custos' },
];

export const AdminLayout = ({ children, activeTab, onTabChange }: AdminLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    toast({ title: 'Logout realizado', description: 'Até logo!' });
  };

  const userName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Admin';

  return (
    <div className="flex min-h-dvh w-full bg-background">
      <aside className="w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="px-4 pt-5 pb-3 flex items-center gap-2">
          <RhitmoLogo size="sm" className="text-primary" />
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            Admin
          </div>
        </div>

        <nav className="px-2 flex flex-col gap-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange?.(tab.value)}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm transition-colors',
                  isActive
                    ? 'bg-background text-sidebar-foreground font-semibold border border-border/50 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:bg-primary/10 dark:text-primary dark:border-primary/20'
                    : 'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/40',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-3 mx-2 pt-3 border-t border-sidebar-border/60 space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl">
            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-semibold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <p className="text-xs font-semibold truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start gap-2 rounded-xl text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </Button>
          <p className="px-2 pt-1 text-[10px] text-muted-foreground">
            Logs: <a href="/admin/logs" className="underline hover:text-foreground">/admin/logs</a>
          </p>
        </div>

        <div className="flex-1" />
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
};
