// Sprint 8.1 — Read hook for the unified Context Graph timeline of a member.
// Backed by the SECURITY DEFINER RPC `get_member_timeline`.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EvidenceType =
  | 'note'
  | 'meeting'
  | 'slack_signal'
  | 'kudo'
  | 'pulse_response'
  | 'goal_event'
  | 'review_excerpt'
  | 'nudge';

export interface ContextEvidenceRow {
  id: string;
  evidence_type: EvidenceType;
  source_table: string;
  source_id: string;
  occurred_at: string;
  title: string | null;
  summary: string | null;
  sentiment: 'positive' | 'neutral' | 'constructive' | 'warning' | null;
  tags: string[];
  actor_user_id: string | null;
  visibility: 'private_leader' | 'shared' | 'workspace';
  metadata: Record<string, unknown>;
}

interface Options {
  limit?: number;
  types?: EvidenceType[];
  enabled?: boolean;
}

export function useContextTimeline(memberId: string | undefined, opts: Options = {}) {
  const { limit = 50, types, enabled = true } = opts;

  return useQuery({
    queryKey: ['context-timeline', memberId, limit, types],
    enabled: !!memberId && enabled,
    queryFn: async (): Promise<ContextEvidenceRow[]> => {
      const { data, error } = await supabase.rpc('get_member_timeline', {
        _member_id: memberId!,
        _limit: limit,
        _types: (types ?? null) as unknown as string[] | null,
      });
      if (error) throw error;
      return (data ?? []) as ContextEvidenceRow[];
    },
  });
}
