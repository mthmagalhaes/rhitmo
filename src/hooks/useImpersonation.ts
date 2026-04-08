import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const useImpersonation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: impersonation, isLoading } = useQuery({
    queryKey: ['admin-impersonation', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('admin_impersonation')
        .select('*')
        .eq('admin_user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const startImpersonation = async (userId: string, email: string) => {
    if (!user) return;
    // Remove old records
    await supabase
      .from('admin_impersonation')
      .delete()
      .eq('admin_user_id', user.id);

    // Insert new
    const { error } = await supabase
      .from('admin_impersonation')
      .insert({
        admin_user_id: user.id,
        impersonated_user_id: userId,
        impersonated_email: email,
      });

    if (error) throw error;

    // Invalidate everything so RLS picks up new effective_user_id
    await queryClient.invalidateQueries();
    navigate('/');
  };

  const stopImpersonation = async () => {
    if (!user) return;
    await supabase
      .from('admin_impersonation')
      .delete()
      .eq('admin_user_id', user.id);

    await queryClient.invalidateQueries();
    navigate('/admin');
  };

  return {
    isImpersonating: !!impersonation,
    impersonatedEmail: impersonation?.impersonated_email ?? null,
    startImpersonation,
    stopImpersonation,
    isLoading,
  };
};
