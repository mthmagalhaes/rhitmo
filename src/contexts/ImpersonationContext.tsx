import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ImpersonatedUser {
  id: string;
  email: string;
}

interface ImpersonationContextType {
  impersonatedUser: ImpersonatedUser | null;
  isImpersonating: boolean;
  startImpersonation: (userId: string, email: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  loading: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar impersonation ativa ao carregar
  useEffect(() => {
    const checkActiveImpersonation = async () => {
      if (!user) {
        setImpersonatedUser(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admin_impersonation')
          .select('impersonated_user_id, impersonated_email')
          .eq('admin_user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar impersonation:', error);
          setImpersonatedUser(null);
        } else if (data) {
          setImpersonatedUser({
            id: data.impersonated_user_id,
            email: data.impersonated_email || 'Usuário',
          });
        } else {
          setImpersonatedUser(null);
        }
      } catch (err) {
        console.error('Erro ao verificar impersonation:', err);
        setImpersonatedUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkActiveImpersonation();
  }, [user]);

  const startImpersonation = async (userId: string, email: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Remover impersonation anterior se existir
      await supabase
        .from('admin_impersonation')
        .delete()
        .eq('admin_user_id', user.id);

      // Criar nova impersonation
      const { error } = await supabase
        .from('admin_impersonation')
        .insert({
          admin_user_id: user.id,
          impersonated_user_id: userId,
          impersonated_email: email,
        });

      if (error) {
        console.error('Erro ao iniciar impersonation:', error);
        throw error;
      }

      setImpersonatedUser({ id: userId, email });
      
      // Recarregar página para aplicar novas RLS
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Erro ao iniciar impersonation:', err);
    } finally {
      setLoading(false);
    }
  };

  const stopImpersonation = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('admin_impersonation')
        .delete()
        .eq('admin_user_id', user.id);

      if (error) {
        console.error('Erro ao parar impersonation:', error);
        throw error;
      }

      setImpersonatedUser(null);
      
      // Recarregar página para aplicar RLS normal
      window.location.href = '/admin';
    } catch (err) {
      console.error('Erro ao parar impersonation:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUser,
        isImpersonating: !!impersonatedUser,
        startImpersonation,
        stopImpersonation,
        loading,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
