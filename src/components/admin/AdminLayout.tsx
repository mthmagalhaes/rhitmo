import { useState, useEffect } from 'react';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Users, LogOut, ShieldCheck, Network, Brain, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const handleExternalTabChange = (e: CustomEvent) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('admin-tab-change', handleExternalTabChange as EventListener);
    return () => window.removeEventListener('admin-tab-change', handleExternalTabChange as EventListener);
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: value }));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    toast({ title: "Logout realizado", description: "Até logo!" });
  };

  const tabs = [
    { value: 'overview', icon: LayoutDashboard, label: 'Command Center' },
    { value: 'users', icon: Users, label: 'Usuários' },
    { value: 'structure', icon: Network, label: 'Estrutura' },
    { value: 'access', icon: ShieldCheck, label: 'Acessos & Export' },
    { value: 'intelligence', icon: Brain, label: 'Inteligência' },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="w-64 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <RhitmoLogo size="sm" className="text-violet-400" />
            <Badge variant="destructive" className="text-xs">ADMIN</Badge>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <Tabs value={activeTab} onValueChange={handleTabChange} orientation="vertical" className="w-full">
            <TabsList className="flex flex-col h-auto bg-transparent gap-2 w-full">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="w-full justify-start gap-3 text-slate-300 hover:text-white hover:bg-slate-800 data-[state=active]:bg-slate-800 data-[state=active]:text-violet-400"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-300 hover:text-slate-100 hover:bg-slate-800" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1">{children}</main>
    </div>
  );
};
