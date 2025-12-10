import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UpdatePasswordDialog } from './UpdatePasswordDialog';

export function AuthEventProvider({ children }: { children: React.ReactNode }) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    // Verificar URL no mount (para #type=invite ou #type=recovery)
    const hash = window.location.hash;
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      setShowPasswordDialog(true);
    }

    // Escutar eventos de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('Auth event:', event);
      
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordDialog(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
