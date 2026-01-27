import { useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  // Query para verificar workspace do usuário - CORRIGIDO: usar order().limit(1) para evitar loop infinito
  const { data: workspace, isLoading: workspaceLoading, refetch } = useQuery({
    queryKey: ['user-workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const needsWorkspaceSetup = !authLoading && !workspaceLoading && user && !workspace && !isCreatingWorkspace;

  // Auto-criar workspace silenciosamente
  useEffect(() => {
    const createWorkspaceAutomatically = async () => {
      if (!needsWorkspaceSetup || !user) return;
      
      setIsCreatingWorkspace(true);
      
      try {
        // Extrair nome do usuário
        const userName = user.user_metadata?.full_name || 
                         user.email?.split('@')[0] || 
                         'Meu';
        
        const planTier = user.user_metadata?.assigned_plan || 'pulse';
        const workspaceName = `Workspace de ${userName}`;
        
        // Criar workspace silenciosamente
        const { data: newWorkspace, error: workspaceError } = await supabase
          .from('workspaces')
          .insert({
            owner_id: user.id,
            name: workspaceName,
            plan_tier: planTier,
          })
          .select()
          .single();

        if (workspaceError) throw workspaceError;

        // Criar time padrão "Sem Time"
        const { error: teamError } = await supabase
          .from('teams')
          .insert({
            workspace_id: newWorkspace.id,
            name: 'Sem Time',
          });

        if (teamError) throw teamError;

        // Atualizar queries
        refetch();
        queryClient.invalidateQueries({ queryKey: ['workspace'] });
        queryClient.invalidateQueries({ queryKey: ['teams'] });
      } catch (error) {
        console.error('Erro ao criar workspace automaticamente:', error);
      } finally {
        setIsCreatingWorkspace(false);
      }
    };

    createWorkspaceAutomatically();
  }, [needsWorkspaceSetup, user, refetch, queryClient]);

  return (
    <SidebarProvider>

      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header mobile com trigger */}
          <header className="flex h-14 items-center gap-4 border-b px-4 lg:hidden bg-card">
            <SidebarTrigger />
            <span className="font-semibold text-foreground">Rhitmo</span>
          </header>
          
          {/* Conteúdo principal */}
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
