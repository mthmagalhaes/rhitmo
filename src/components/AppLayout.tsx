import { useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { WorkspaceOnboarding } from '@/components/WorkspaceOnboarding';
import { ActivityBadge } from '@/components/ActivityBadge';
import { ActivitySheet } from '@/components/ActivitySheet';
import { useAuth } from '@/hooks/useAuth';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isLinkedMember, isLoading: linkedMemberLoading } = useLinkedMember();
  const queryClient = useQueryClient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Query para verificar workspace do usuário — tenta como owner primeiro, depois por RLS
  const { data: workspace, isLoading: workspaceLoading, error: workspaceError, refetch } = useQuery({
    queryKey: ['user-workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: ownedWorkspace, error: ownedError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (ownedError) console.warn('[AppLayout] Owned workspace query error:', ownedError.message);
      if (ownedWorkspace) return ownedWorkspace;

      const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('[AppLayout] Workspace fallback query error:', error.message);
        throw error;
      }
      return data;
    },
    enabled: !!user && !authLoading,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  // Read-only check used only to prevent onboarding flash while an invited member
  // account is still being linked elsewhere in the auth flow.
  const { data: hasPendingInviteByEmail, isLoading: pendingInviteLoading } = useQuery({
    queryKey: ['pending-invite-email', user?.email],
    queryFn: async () => {
      if (!user?.email) return false;
      const { data: pendingMember, error } = await supabase
        .from('team_members')
        .select('id')
        .eq('email', user.email)
        .eq('invite_status', 'pending')
        .is('linked_user_id', null)
        .maybeSingle();

      if (error) {
        console.warn('[AppLayout] Pending invite query error:', error.message);
        return false;
      }

      return !!pendingMember;
    },
    enabled: !!user?.email && !authLoading && !isLinkedMember,
    staleTime: 30 * 1000,
  });

  // Liderados NÃO precisam de workspace - só líderes
  // Also block if there's a pending invite by email (auto-link will handle it)
  const needsWorkspaceSetup = !authLoading 
    && !workspaceLoading 
    && !linkedMemberLoading
    && !pendingInviteLoading
    && user 
    && !workspace 
    && !workspaceError
    && !isLinkedMember
    && !hasPendingInviteByEmail;

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

      <ImpersonationBanner />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header mobile com trigger */}
          <header className="flex h-14 items-center gap-4 border-b px-4 lg:hidden bg-card">
            <SidebarTrigger />
            <span className="font-semibold text-foreground flex-1">Rhitmo</span>
            {showActivity && (
              <ActivityBadge onClick={() => setNotificationsOpen(true)} />
            )}
          </header>
          
          {/* Header desktop - notification bell */}
          {showActivity && (
            <div className="hidden lg:flex h-12 items-center justify-end px-6">
              <ActivityBadge onClick={() => setNotificationsOpen(true)} />
            </div>
          )}
          
          {/* Conteúdo principal */}
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>

      {/* Notification Sheet */}
      {showActivity && (
        <ActivitySheet
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
        />
      )}
    </SidebarProvider>
  );
}
