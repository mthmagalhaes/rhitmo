import { useState } from 'react';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Settings, FileDown, LogOut, Home } from 'lucide-react';
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <RhitmoLogo size="sm" className="text-violet-400" />
            <Badge variant="destructive" className="text-xs">ADMIN</Badge>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
            <TabsList className="flex flex-col h-auto bg-transparent gap-2 w-full">
              <TabsTrigger 
                value="overview" 
                className="w-full justify-start gap-3 data-[state=active]:bg-slate-800 data-[state=active]:text-violet-400"
              >
                <LayoutDashboard className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger 
                value="support" 
                className="w-full justify-start gap-3 data-[state=active]:bg-slate-800 data-[state=active]:text-violet-400"
              >
                <Settings className="h-4 w-4" />
                Suporte & Edição
              </TabsTrigger>
              <TabsTrigger 
                value="export" 
                className="w-full justify-start gap-3 data-[state=active]:bg-slate-800 data-[state=active]:text-violet-400"
              >
                <FileDown className="h-4 w-4" />
                Data Export
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
            onClick={() => navigate('/')}
          >
            <Home className="h-4 w-4" />
            Voltar ao App
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};


