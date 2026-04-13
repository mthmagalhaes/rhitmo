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

    const processPendingInvite = async (userId: string, userEmail?: string | null) => {
      const pendingCode = localStorage.getItem('pending_invite');
      if (!pendingCode) return false;

      try {
        // Try by invite_token first
        const { data: tokenResult, error } = await supabase
          .from('team_members')
          .update({
            linked_user_id: userId,
            invite_status: 'accepted',
            invite_token: null,
          })
          .eq('invite_token', pendingCode)
          .eq('invite_status', 'pending')
          .is('linked_user_id', null)
          .select('id');

        if (!error && tokenResult && tokenResult.length > 0) {
          toast({
            title: 'Convite aceito com sucesso!',
            description: 'Você foi vinculado à equipe.',
          });
          return true;
        }

        // Fallback: try matching by email if token match failed
        if (userEmail) {
          const { data: emailResult, error: emailError } = await supabase
            .from('team_members')
            .update({
              linked_user_id: userId,
              invite_status: 'accepted',
              invite_token: null,
            })
            .eq('email', userEmail)
            .eq('invite_status', 'pending')
            .is('linked_user_id', null)
            .select('id');

          if (!emailError && emailResult && emailResult.length > 0) {
            toast({
              title: 'Convite aceito com sucesso!',
              description: 'Você foi vinculado à equipe.',
            });
            return true;
          }
        }
      } catch (err) {
        console.error('Error processing pending invite:', err);
      } finally {
        localStorage.removeItem('pending_invite');
      }

      return false;
    };

    // Auto-link by email has been REMOVED from the auth event flow.
    // It was causing race conditions where leaders could be momentarily
    // linked as team members during session restoration.
    // Email-based linking should only happen via explicit invite acceptance.

    const processInviteFlows = async (sessionUser?: { id: string; email?: string | null } | null) => {
      const resolvedUser = sessionUser ?? (await supabase.auth.getUser()).data.user;
      if (!resolvedUser?.id || processedUserIdRef.current === resolvedUser.id) return;

      processedUserIdRef.current = resolvedUser.id;

      await processPendingInvite(resolvedUser.id, resolvedUser.email);
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
