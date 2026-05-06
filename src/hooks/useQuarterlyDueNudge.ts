// Sprint 17.3 — Surfaces leader_nudges (type='quarterly_due') inside
// QuarterlyRecapSection so leaders without Slack still see the prompt.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QuarterlyDueNudge {
  id: string;
  message: string;
  action_url: string | null;
  created_at: string;
  // Parsed from action_url for convenience
  period_start?: string;
  period_end?: string;
}

function parseSuggestedPeriod(actionUrl: string | null): { start?: string; end?: string } {
  if (!actionUrl) return {};
  try {
    const qIndex = actionUrl.indexOf('?');
    if (qIndex < 0) return {};
    const params = new URLSearchParams(actionUrl.slice(qIndex + 1));
    return { start: params.get('start') ?? undefined, end: params.get('end') ?? undefined };
  } catch {
    return {};
  }
}

export function useQuarterlyDueNudge(memberId: string | undefined) {
  return useQuery({
    queryKey: ['quarterly-due-nudge', memberId],
    queryFn: async (): Promise<QuarterlyDueNudge | null> => {
      if (!memberId) return null;
      const { data, error } = await supabase
        .from('leader_nudges')
        .select('id, message, action_url, created_at')
        .eq('member_id', memberId)
        .eq('nudge_type', 'quarterly_due')
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { start, end } = parseSuggestedPeriod(data.action_url);
      return { ...data, period_start: start, period_end: end };
    },
    enabled: !!memberId,
  });
}

export function useDismissQuarterlyDueNudge(memberId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (nudgeId: string) => {
      const { error } = await supabase
        .from('leader_nudges')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', nudgeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quarterly-due-nudge', memberId] });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao dispensar', description: e.message, variant: 'destructive' });
    },
  });
}
