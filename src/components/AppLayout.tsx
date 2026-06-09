import { Suspense, useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { RouteSkeleton } from '@/components/RouteSkeleton';
import { AppSidebar } from '@/components/AppSidebar';
import { WorkspaceOnboarding } from '@/components/WorkspaceOnboarding';
import { HRAdminWorkspaceOnboarding } from '@/components/HRAdminWorkspaceOnboarding';
import { ActivityBadge } from '@/components/ActivityBadge';
import { ActivitySheet } from '@/components/ActivitySheet';
import { LeaderTour } from '@/components/onboarding/LeaderTour';
import { useAuth } from '@/hooks/useAuth';
import { useAccount } from '@/contexts/AccountContext';
import { AccountLoadFailed, AccountLoadingSlow, AccountLoadingDelayedBanner } from '@/components/AccountLoadFailed';

import { useQueryClient } from '@tanstack/react-query';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const {
    workspaceId,
    loading: accountLoading,
    hasError,
    isLoadingDelayed,
    isSlowLoad,
    isLinkedMember,
    isLeader,
    isHRAdmin,
    hasPendingInviteByEmail,
    refetchWorkspace,
  } = useAccount();
  const queryClient = useQueryClient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tourRunning, setTourRunning] = useState(false);

  // Listen to URL ?startTour=1 and `rhitmo:start-tour` event from anywhere in the app.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('startTour') === '1') {
      const url = new URL(window.location.href);
      url.searchParams.delete('startTour');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      setTourRunning(true);
    }
    const handler = () => setTourRunning(true);
    window.addEventListener('rhitmo:start-tour', handler);
    return () => window.removeEventListener('rhitmo:start-tour', handler);
  }, []);

  // Read persona intent from localStorage (set during signup persona selector or OAuth round-trip).
  const [signupPersona, setSignupPersona] = useState<'leader' | 'hr_admin' | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const v = localStorage.getItem('signup_persona');
      return v === 'leader' || v === 'hr_admin' ? v : null;
    } catch {
      return null;
    }
  });

  // CRITICAL: All context must be fully resolved before deciding on onboarding.
  const allContextResolved = !authLoading && !accountLoading;

  // CRITICAL: Never show onboarding if there was an error resolving workspace.
  // RLS errors return null workspace + error, and treating that as "no workspace"
  // would trap existing users in onboarding.
  // Guard extra: só mostra setup quando o usuário declarou intent='leader'.
  // Sem essa intent, liderados vinculados que tiveram falha temporária em
  // `get_account_context` (RLS, cache, race) seriam empurrados a criar
  // workspace duplicado — foi a causa raiz do incidente Faster/Guto.
  const baseNeedsWorkspaceSetup = allContextResolved
    && user
    && !workspaceId
    && !hasError
    && !isLinkedMember
    && !hasPendingInviteByEmail
    && !isLeader
    && !isHRAdmin;

  // Persona === 'leader' should ALWAYS get the workspace onboarding modal,
  // even if the heuristic above fails (e.g., RLS resolved but no traces yet).
  const personaForcesLeader = allContextResolved
    && user
    && !workspaceId
    && !hasError
    && !isLinkedMember
    && !hasPendingInviteByEmail
    && signupPersona === 'leader';

  const personaForcesHRAdmin = allContextResolved
    && user
    && !workspaceId
    && !hasError
    && !isLinkedMember
    && !hasPendingInviteByEmail
    && signupPersona === 'hr_admin';

  // Só mostra setup de líder quando o usuário declarou explicitamente persona='leader'.
  // A heurística (`baseNeedsWorkspaceSetup`) sozinha causava criação de workspace
  // duplicado por liderados — agora exige confirmação via signup_persona.
  const needsWorkspaceSetup = personaForcesLeader;
  const needsHRAdminWorkspaceSetup = personaForcesHRAdmin;

  const showActivity = !!user;

  const handleWorkspaceComplete = () => {
    try { localStorage.removeItem('signup_persona'); } catch { /* ignore */ }
    setSignupPersona(null);
    refetchWorkspace();
    queryClient.invalidateQueries({ queryKey: ['workspace'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
  };

  // Clean up persona once the user is properly resolved as leader/HR/linked member.
  useEffect(() => {
    if (!allContextResolved) return;
    if (workspaceId || isLinkedMember || isHRAdmin) {
      try { localStorage.removeItem('signup_persona'); } catch { /* ignore */ }
      if (signupPersona !== null) setSignupPersona(null);
    }
  }, [allContextResolved, workspaceId, isLinkedMember, isHRAdmin, signupPersona]);

  // Gate hard error / very slow load before rendering layout. Logged-in
  // users only — public routes don't reach AppLayout.
  if (user && hasError) {
    return <AccountLoadFailed onRetry={() => refetchWorkspace()} />;
  }
  if (user && accountLoading && isSlowLoad) {
    return <AccountLoadingSlow onRetry={() => window.location.reload()} />;
  }

  return (
    <SidebarProvider>
      {needsHRAdminWorkspaceSetup && (
        <HRAdminWorkspaceOnboarding
          onComplete={() => {
            handleWorkspaceComplete();
            window.location.href = '/hr';
          }}
        />
      )}

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
          <header className="flex h-14 items-center gap-4 border-b px-4 lg:hidden bg-card">
            <SidebarTrigger data-tour="sidebar" />
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
          
          <main className="flex-1" id="main-content">
            <Suspense fallback={<RouteSkeleton />}>
              {children}
            </Suspense>
          </main>
        </SidebarInset>
      </div>

      {showActivity && (
        <ActivitySheet
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
        />
      )}

      {tourRunning && <LeaderTour autoStart onClose={() => setTourRunning(false)} />}

      {user && accountLoading && isLoadingDelayed && !isSlowLoad && (
        <AccountLoadingDelayedBanner onRetry={() => refetchWorkspace()} />
      )}
    </SidebarProvider>
  );
}
