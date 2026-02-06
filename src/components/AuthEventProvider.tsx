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

    // Process pending invite after login
    const processPendingInvite = async () => {
      const pendingCode = sessionStorage.getItem('pending_invite');
      if (!pendingCode) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        }
      } catch (err) {
        console.error('Error processing pending invite:', err);
      } finally {
        sessionStorage.removeItem('pending_invite');
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
        setTimeout(() => {
          processPendingInvite();
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
