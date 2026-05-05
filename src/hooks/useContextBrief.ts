// Sprint 13.1 — Hook do Briefing Executivo por liderado.
// Chama edge function `generate-context-brief` (sob demanda + cache 24h server-side).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { safeFunctionInvoke } from '@/lib/supabaseSafe';

export type BriefWindow = 7 | 14 | 30;

export interface BriefItem {
  text: string;
  evidence_ids: string[];
}

export interface ContextBrief {
  id: string;
  member_id: string;
  window_days: BriefWindow;
  window_start: string;
  window_end: string;
  wins: BriefItem[];
  risks: BriefItem[];
  in_motion: BriefItem[];
  conversations: BriefItem[];
  evidence_count: number;
  generated_at: string;
  model: string | null;
}

interface InvokeResponse {
  brief: ContextBrief;
  cached: boolean;
}

export function useContextBrief(memberId: string | null, windowDays: BriefWindow) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['context-brief', memberId, windowDays],
    enabled: !!memberId,
    staleTime: 60 * 60 * 1000, // 1h client cache
    queryFn: async () => {
      const res = await safeFunctionInvoke<InvokeResponse>('generate-context-brief', {
        member_id: memberId,
        window_days: windowDays,
      });
      return res.brief;
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error('No member selected');
      const res = await safeFunctionInvoke<InvokeResponse>('generate-context-brief', {
        member_id: memberId,
        window_days: windowDays,
        force_refresh: true,
      });
      return res.brief;
    },
    onSuccess: (brief) => {
      queryClient.setQueryData(['context-brief', memberId, windowDays], brief);
    },
  });

  return {
    brief: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refresh: refresh.mutate,
    isRefreshing: refresh.isPending,
  };
}
