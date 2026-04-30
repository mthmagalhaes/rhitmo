// Sprint 9.2 — Lista pulse_surveys pendentes para o liderado vinculado.
// RLS já restringe ao próprio member (linked_user_id) — query direta basta.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PulseQuestion, PulseType } from '@/lib/pulseTemplates';

export interface PendingPulseSurvey {
  id: string;
  type: PulseType;
  questions: PulseQuestion[];
  sent_at: string;
  requested_by: string;
  member_id: string;
}

export function usePendingPulseSurveys(memberId: string | null | undefined) {
  return useQuery({
    queryKey: ['pending-pulse-surveys', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<PendingPulseSurvey[]> => {
      const { data, error } = await supabase
        .from('pulse_surveys')
        .select('id, type, questions, sent_at, requested_by, member_id')
        .eq('member_id', memberId!)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('[usePendingPulseSurveys]', error);
        return [];
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        type: row.type as PulseType,
        questions: Array.isArray(row.questions) ? (row.questions as unknown as PulseQuestion[]) : [],
        sent_at: row.sent_at,
        requested_by: row.requested_by,
        member_id: row.member_id,
      }));
    },
    staleTime: 30_000,
  });
}
