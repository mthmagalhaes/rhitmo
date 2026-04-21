import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';

export interface HRAlert {
  id: string;
  message: string;
  severity: string | null;
  action_url: string | null;
  created_at: string;
  dismissed_at: string | null;
  nudge_type: string;
}

export function useHRRiskAlerts() {
  const { id: userId } = useEffectiveUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['hr-risk-alerts', userId],
    queryFn: async () => {
      if (!userId) return [];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      const { data, error } = await supabase
        .from('leader_nudges')
        .select('id, message, severity, action_url, created_at, dismissed_at, nudge_type')
        .eq('leader_id', userId)
        .eq('nudge_type', 'hr_auto_alert')
        .is('dismissed_at', null)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.warn('[useHRRiskAlerts] error', error.message);
        return [];
      }
      return (data || []) as HRAlert[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const dismiss = async (id: string) => {
    await supabase
      .from('leader_nudges')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['hr-risk-alerts', userId] });
  };

  return {
    alerts: query.data ?? [],
    count: query.data?.length ?? 0,
    isLoading: query.isLoading,
    dismiss,
  };
}
