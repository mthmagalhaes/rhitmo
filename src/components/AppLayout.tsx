import { useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { WorkspaceOnboarding } from '@/components/WorkspaceOnboarding';
import { ActivityBadge } from '@/components/ActivityBadge';
import { ActivitySheet } from '@/components/ActivitySheet';
import { useAuth } from '@/hooks/useAuth';
import { useAccount } from '@/contexts/AccountContext';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const {
    workspaceId,
    loading: accountLoading,
    hasError,
    isLinkedMember,
    isLeader,
    isHRAdmin,
    hasPendingInviteByEmail,
    refetchWorkspace,
  } = useAccount();
  const queryClient = useQueryClient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // CRITICAL: All context must be fully resolved before deciding on onboarding.
  const allContextResolved = !authLoading && !accountLoading;

  // CRITICAL: Never show onboarding if there was an error resolving workspace.
  // RLS errors return null workspace + error, and treating that as "no workspace"
  // would trap existing users in onboarding.
  const needsWorkspaceSetup = allContextResolved
    && user 
    && !workspaceId 
    && !hasError
    && !isLinkedMember
    && !hasPendingInviteByEmail
    && !isLeader
    && !isHRAdmin;

  const showActivity = !!user;

  const handleWorkspaceComplete = () => {
    refetchWorkspace();
    queryClient.invalidateQueries({ queryKey: ['workspace'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
  };

  return (
    <SidebarProvider>
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
          <header className="flex h-14 items-center gap-4 border-b px-4 lg:hidden bg-card">
            <SidebarTrigger />
            <span className="font-semibold text-foreground flex-1">Rhitmo</span>
            {showActivity && (
              <ActivityBadge onClick={() => setNotificationsOpen(true)} />
            )}
          </header>
          
          {showActivity && (
            <div className="hidden lg:flex h-12 items-center justify-end px-6">
              <ActivityBadge onClick={() => setNotificationsOpen(true)} />
            </div>
          )}
          
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>

      {showActivity && (
        <ActivitySheet
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
        />
      )}
    </SidebarProvider>
  );
}
