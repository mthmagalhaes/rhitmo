import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    // Se o servidor retornou erro (ex: session_not_found), 
    // limpar localmente mesmo assim
    if (error) {
      console.warn('Erro no logout do servidor, limpando sessão local:', error.message);
      // Limpar tokens do localStorage manualmente
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      localStorage.removeItem(`sb-${projectId}-auth-token`);
      setUser(null);
    }
    
    return { error };
  };

  return { user, loading, signOut };
};
