import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useImpersonation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    try {
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

      // Refetch impersonation query first so UI knows
      await queryClient.refetchQueries({ queryKey: ['admin-impersonation'] });

      toast.success(`Visualizando como ${email}`, {
        description: 'Recarregando para aplicar contexto…',
      });

      // Hard reload guarantees AccountContext re-resolves effective_user_id via RLS
      window.location.href = '/';
    } catch (err: any) {
      console.error('[Impersonation] start error:', err);
      toast.error('Erro ao iniciar visualização', { description: err.message });
    }
  };

  const stopImpersonation = async () => {
    if (!user) return;
    try {
      await supabase
        .from('admin_impersonation')
        .delete()
        .eq('admin_user_id', user.id);

      await queryClient.refetchQueries({ queryKey: ['admin-impersonation'] });

      toast.success('Visualização encerrada');

      // Hard reload back to admin
      window.location.href = '/admin';
    } catch (err: any) {
      console.error('[Impersonation] stop error:', err);
      toast.error('Erro ao encerrar visualização', { description: err.message });
    }
  };

  return {
    isImpersonating: !!impersonation,
    impersonatedEmail: impersonation?.impersonated_email ?? null,
    impersonatedUserId: impersonation?.impersonated_user_id ?? null,
    startImpersonation,
    stopImpersonation,
    isLoading,
  };
};
