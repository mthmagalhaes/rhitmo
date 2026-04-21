import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';
import { toast } from 'sonner';

export interface MirrorInsight {
  id: string;
  manager_id: string;
  workspace_id: string | null;
  week_starting: string;
  summary: string;
  contradiction_score: number;
  declared_priorities: unknown[];
  observed_themes: unknown[];
  evidence: Array<{ transcript_id: string; quote: string; date: string }>;
  recommended_action: string | null;
  created_at: string;
  dismissed_at: string | null;
}

export function useMirrorInsight() {
  const { id: userId } = useEffectiveUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mirror-insight', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('mirror_insights')
        .select('*')
        .eq('manager_id', userId)
        .is('dismissed_at', null)
        .order('week_starting', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn('[useMirrorInsight] query error', error.message);
        return null;
      }
      return data as unknown as MirrorInsight | null;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const dismiss = async (id: string) => {
    const { error } = await supabase
      .from('mirror_insights')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('Não foi possível reconhecer o insight');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['mirror-insight', userId] });
  };

  return { insight: query.data, isLoading: query.isLoading, dismiss };
}
