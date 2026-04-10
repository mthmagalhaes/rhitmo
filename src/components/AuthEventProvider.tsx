import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UpdatePasswordDialog } from './UpdatePasswordDialog';
import { useToast } from '@/hooks/use-toast';

export function AuthEventProvider({ children }: { children: React.ReactNode }) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const { toast } = useToast();
  const processedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      setShowPasswordDialog(true);
    }

    const processPendingInvite = async (userId: string) => {
      const pendingCode = localStorage.getItem('pending_invite');
      if (!pendingCode) return false;

      try {
        const { error } = await supabase
          .from('team_members')
          .update({
            linked_user_id: userId,
            invite_status: 'accepted',
            invite_token: null,
          })
          .eq('invite_token', pendingCode)
          .eq('invite_status', 'pending')
          .is('linked_user_id', null);

        if (!error) {
          toast({
            title: 'Convite aceito com sucesso!',
            description: 'Você foi vinculado à equipe.',
          });
          return true;
        }
      } catch (err) {
        console.error('Error processing pending invite:', err);
      } finally {
        localStorage.removeItem('pending_invite');
      }

      return false;
    };

    const autoLinkByEmail = async (userId: string, email: string) => {
      try {
        const [ownedWorkspaceResult, ledTeamResult, existingLinkResult, pendingMembersResult] = await Promise.all([
          supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', userId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('teams')
            .select('id')
            .eq('leader_user_id', userId)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('team_members')
            .select('id')
            .eq('linked_user_id', userId)
            .eq('invite_status', 'accepted')
            .limit(1)
            .maybeSingle(),
          supabase
            .from('team_members')
            .select('id')
            .eq('email', email)
            .eq('invite_status', 'pending')
            .is('linked_user_id', null)
            .limit(2),
        ]);

        // Never auto-link someone who already owns/leads a workspace.
        if (ownedWorkspaceResult.data || ledTeamResult.data || existingLinkResult.data) {
          return;
        }

        const pendingMembers = pendingMembersResult.data ?? [];
        if (pendingMembers.length !== 1) {
          if (pendingMembers.length > 1) {
            console.warn('[AuthEventProvider] Multiple pending invites for same email. Auto-link skipped.');
          }
          return;
        }

        const { error } = await supabase
          .from('team_members')
          .update({
            linked_user_id: userId,
            invite_status: 'accepted',
            invite_token: null,
          })
          .eq('id', pendingMembers[0].id)
          .eq('invite_status', 'pending')
          .is('linked_user_id', null);

        if (!error) {
          toast({
            title: 'Conta vinculada automaticamente!',
            description: 'Você foi vinculado à equipe pelo seu e-mail.',
          });
        }
      } catch (err) {
        console.error('Error auto-linking by email:', err);
      }
    };

    const processInviteFlows = async (sessionUser?: { id: string; email?: string | null } | null) => {
      const resolvedUser = sessionUser ?? (await supabase.auth.getUser()).data.user;
      if (!resolvedUser?.id || processedUserIdRef.current === resolvedUser.id) return;

      processedUserIdRef.current = resolvedUser.id;

      const linked = await processPendingInvite(resolvedUser.id);
      if (!linked && resolvedUser.email) {
        await autoLinkByEmail(resolvedUser.id, resolvedUser.email);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordDialog(true);
      }

      if (event === 'SIGNED_OUT') {
        processedUserIdRef.current = null;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        setTimeout(() => {
          void processInviteFlows(session?.user ?? null);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const handlePasswordComplete = () => {
    setShowPasswordDialog(false);
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  return (
    <>
      {children}
      <UpdatePasswordDialog 
        open={showPasswordDialog} 
        onComplete={handlePasswordComplete} 
      />
    </>
  );
}
