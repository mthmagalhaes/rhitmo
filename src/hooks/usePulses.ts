// Sprint 13.x — Lista de pulses do líder (parent rows) com agregados.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export type PulseStatus = 'draft' | 'active' | 'closed';

export interface PulseListRow {
  id: string;
  name: string;
  motivation: string | null;
  type: string;
  status: PulseStatus;
  anonymity: 'named' | 'anonymous';
  created_at: string;
  launched_at: string | null;
  participants: number;
  responses: number;
  questions: Array<{ id: string; text: string }>;
}

const ACTIVE_LIKE: PulseStatus[] = ['active'];

function mapStatus(raw: string): PulseStatus {
  if (raw === 'draft') return 'draft';
  if (raw === 'closed' || raw === 'expired') return 'closed';
  return 'active';
}

export function usePulses() {
  const { id: userId } = useEffectiveUser();

  return useQuery({
    queryKey: ['leader-pulses', userId],
    enabled: !!userId,
    queryFn: async (): Promise<PulseListRow[]> => {
      // Parent rows: rows criadas pelo líder que não são "filhas" (parent_pulse_id IS NULL)
      // OU rows de status='draft'. Listamos só essas para a tela.
      const { data, error } = await supabase
        .from('pulse_surveys')
        .select(
          'id, name, motivation, type, status, anonymity, created_at, launched_at, questions',
        )
        .eq('requested_by', userId!)
        .is('parent_pulse_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[usePulses]', error);
        return [];
      }

      const parents = (data ?? []) as Array<{
        id: string;
        name: string | null;
        motivation: string | null;
        type: string;
        status: string;
        anonymity: string;
        created_at: string;
        launched_at: string | null;
        questions: unknown;
      }>;

      // Para cada parent ativo/fechado, conta filhas e completas.
      const rows: PulseListRow[] = await Promise.all(
        parents.map(async (p) => {
          const status = mapStatus(p.status);
          let participants = 0;
          let responses = 0;

          if (status !== 'draft') {
            const { count: total } = await supabase
              .from('pulse_surveys')
              .select('id', { count: 'exact', head: true })
              .eq('parent_pulse_id', p.id);
            participants = total ?? 0;

            const { count: done } = await supabase
              .from('pulse_surveys')
              .select('id', { count: 'exact', head: true })
              .eq('parent_pulse_id', p.id)
              .eq('status', 'completed');
            responses = done ?? 0;
          }

          return {
            id: p.id,
            name: p.name ?? 'Pulse sem nome',
            motivation: p.motivation,
            type: p.type,
            status,
            anonymity: (p.anonymity === 'anonymous' ? 'anonymous' : 'named'),
            created_at: p.created_at,
            launched_at: p.launched_at,
            participants,
            responses,
            questions: Array.isArray(p.questions)
              ? (p.questions as Array<{ id: string; text: string }>)
              : [],
          };
        }),
      );

      return rows;
    },
    staleTime: 15_000,
  });
}

export function usePulse(pulseId: string | undefined) {
  return useQuery({
    queryKey: ['leader-pulse', pulseId],
    enabled: !!pulseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_surveys')
        .select('*')
        .eq('id', pulseId!)
        .maybeSingle();
      if (error) {
        console.error('[usePulse]', error);
        return null;
      }
      return data;
    },
  });
}

export function usePulseChildren(parentId: string | undefined) {
  return useQuery({
    queryKey: ['pulse-children', parentId],
    enabled: !!parentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_surveys')
        .select('id, member_id, status, completed_at, sent_at, dm_sent_at')
        .eq('parent_pulse_id', parentId!);
      if (error) {
        console.error('[usePulseChildren]', error);
        return [];
      }
      return data ?? [];
    },
  });
}

export { ACTIVE_LIKE };
