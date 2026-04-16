import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useImpersonation } from './useImpersonation';

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isImpersonating, isLoading: impersonationLoading } = useImpersonation();
  const [isRealAdmin, setIsRealAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        setIsRealAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('check_is_admin');
        if (error) throw error;
        setIsRealAdmin(data === true);
      } catch (err) {
        console.error('Error checking admin:', err);
        setIsRealAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user, authLoading]);

  // While impersonating, the admin should be treated as the impersonated user
  // by the rest of the app — so we report isAdmin=false here.
  const isAdmin = isRealAdmin && !isImpersonating;

  return {
    isAdmin,
    isRealAdmin,
    loading: loading || impersonationLoading,
  };
};
