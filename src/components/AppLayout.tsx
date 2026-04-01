import { useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { WorkspaceOnboarding } from '@/components/WorkspaceOnboarding';
import { ActivityBadge } from '@/components/ActivityBadge';
import { ActivitySheet } from '@/components/ActivitySheet';
import { useAuth } from '@/hooks/useAuth';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isLinkedMember, isLoading: linkedMemberLoading } = useLinkedMember();
  const queryClient = useQueryClient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Query para verificar workspace do usuário
  const { data: workspace, isLoading: workspaceLoading, refetch } = useQuery({
    queryKey: ['user-workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Liderados NÃO precisam de workspace - só líderes
  const needsWorkspaceSetup = !authLoading 
    && !workspaceLoading 
    && !linkedMemberLoading
    && user 
    && !workspace 
    && !isLinkedMember;

  const isLeader = !isLinkedMember && !!user;
  const showActivity = !!user;

  const handleWorkspaceComplete = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['workspace'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
  };

  return (
    <SidebarProvider>
      {/* Modal de Workspace Onboarding */}
      {needsWorkspaceSetup && (
        <WorkspaceOnboarding 
          userId={user.id}
          userMetadata={user.user_metadata}
          onComplete={handleWorkspaceComplete}
        />
      )}

      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header mobile com trigger */}
          <header className="flex h-14 items-center gap-4 border-b px-4 lg:hidden bg-card">
            <SidebarTrigger />
            <span className="font-semibold text-foreground flex-1">Rhitmo</span>
            {isLeader && (
              <SyncNotificationBadge onClick={() => setNotificationsOpen(true)} />
            )}
          </header>
          
          {/* Header desktop - notification bell */}
          {isLeader && (
            <div className="hidden lg:flex h-12 items-center justify-end px-6">
              <SyncNotificationBadge onClick={() => setNotificationsOpen(true)} />
            </div>
          )}
          
          {/* Conteúdo principal */}
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>

      {/* Notification Sheet */}
      {isLeader && (
        <SyncNotificationSheet
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
        />
      )}
    </SidebarProvider>
  );
}
