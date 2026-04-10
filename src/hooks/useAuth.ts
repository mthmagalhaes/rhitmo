import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let initialized = false;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (!session) {
          setUser(null);
          setLoading(false);
          initialized = true;
          return;
        }

        const { data: { user: verifiedUser }, error } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (error) {
          console.warn('[useAuth] getUser fallback failed, using session user:', error.message);
        }

        setUser(verifiedUser ?? session.user ?? null);
      } catch (error) {
        console.error('[useAuth] Failed to initialize auth:', error);
        if (!isMounted) return;
        setUser(null);
      } finally {
        if (isMounted) {
          initialized = true;
          setLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);

      // During the very first page load, wait for initializeAuth() to finish
      // so all downstream queries only run after auth is truly restored.
      if (initialized || event !== 'INITIAL_SESSION') {
        setLoading(false);
      }
    });

    void initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.warn('Erro no logout do servidor, limpando sessão local:', error.message);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      localStorage.removeItem(`sb-${projectId}-auth-token`);
      setUser(null);
    }
    
    return { error };
  };

  return { user, loading, signOut };
};
