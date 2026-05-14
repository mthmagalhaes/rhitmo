import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (!session) {
          setUser(null);
          setLoading(false);
          initializedRef.current = true;
          return;
        }

        const { data: { user: verifiedUser }, error } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (error) {
          console.warn('[AuthProvider] getUser failed, using session user:', error.message);
        }

        setUser(verifiedUser ?? session.user ?? null);
      } catch (error) {
        console.error('[AuthProvider] Failed to initialize auth:', error);
        if (!isMounted) return;
        setUser(null);
      } finally {
        if (isMounted) {
          initializedRef.current = true;
          setLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);

      // Auto-claim: quando o user acabou de logar/cadastrar, tenta vincular
      // qualquer team_members órfão criado pelo líder com o mesmo e-mail.
      // Resolve o caso "preencheu o Sync mas a conta não estava vinculada"
      // sem exigir invite_token explícito.
      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') &&
        session?.user?.id &&
        session.user.email
      ) {
        // fire-and-forget; nunca bloqueia auth
        setTimeout(() => {
          (supabase.rpc as any)('claim_team_member_by_email', {
            p_user_id: session.user.id,
            p_email: session.user.email!,
          }).then(({ data, error }: { data: unknown; error: unknown }) => {
            if (error) {
              const msg = (error as { message?: string })?.message ?? String(error);
              console.warn('[AuthProvider] claim_team_member_by_email falhou:', msg);
            } else if (typeof data === 'number' && data > 0) {
              console.info(`[AuthProvider] Auto-vinculado a ${data} liderado(s) pré-cadastrado(s)`);
            }
          });
        }, 0);
      }

      // Wait for initializeAuth on the very first page load
      if (initializedRef.current || event !== 'INITIAL_SESSION') {
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
      console.warn('Server logout error, clearing local session:', error.message);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      localStorage.removeItem(`sb-${projectId}-auth-token`);
      setUser(null);
    }

    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}
