import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UpdatePasswordDialog } from './UpdatePasswordDialog';
import { useToast } from '@/hooks/use-toast';

export function AuthEventProvider({ children }: { children: React.ReactNode }) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Verificar URL no mount (para #type=invite ou #type=recovery)
    const hash = window.location.hash;
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      setShowPasswordDialog(true);
    }

    // Process pending invite after login (token-based)
    const processPendingInvite = async () => {
      const pendingCode = localStorage.getItem('pending_invite');
      if (!pendingCode) return false;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      try {
        const { error } = await supabase
          .from('team_members')
          .update({
            linked_user_id: user.id,
            invite_status: 'accepted',
            invite_token: null
          })
          .eq('invite_token', pendingCode);

        if (!error) {
          toast({
            title: "Convite aceito com sucesso!",
            description: "Você foi vinculado à equipe.",
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

    // Auto-link by email: safety net when token is lost (e.g. OAuth redirect)
    const autoLinkByEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      try {
        // Check if there's a pending member with this email not yet linked
        const { data: pendingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('email', user.email)
          .eq('invite_status', 'pending')
          .is('linked_user_id', null)
          .maybeSingle();

        if (!pendingMember) return;

        const { error } = await supabase
          .from('team_members')
          .update({
            linked_user_id: user.id,
            invite_status: 'accepted',
            invite_token: null
          })
          .eq('id', pendingMember.id);

        if (!error) {
          toast({
            title: "Conta vinculada automaticamente!",
            description: "Você foi vinculado à equipe pelo seu e-mail.",
          });
        }
      } catch (err) {
        console.error('Error auto-linking by email:', err);
      }
    };

    // Escutar eventos de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('Auth event:', event);
      
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordDialog(true);
      }

      // Process pending invite on sign in
      if (event === 'SIGNED_IN') {
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(async () => {
          const linked = await processPendingInvite();
          // If no token was found, try auto-link by email
          if (!linked) {
            await autoLinkByEmail();
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const handlePasswordComplete = () => {
    setShowPasswordDialog(false);
    // Limpar hash da URL para evitar re-trigger
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
