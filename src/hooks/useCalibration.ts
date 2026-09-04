// Rhitmo 2.0 — Bloco Calibrações
// Sessões de calibração do líder + grade cross-member com sugestão da IA
// (trimestrais confirmados) e a decisão confirmada pelo líder.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeRpc } from '@/lib/supabaseSafe';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export type CalibClassification =
  | 'precisa_subir'
  | 'dentro_esperado'
  | 'subindo_barra'
  | 'acima_esperado';
export type CalibPromotion = 'not_now' | 'in_1_2_cycles' | 'ready_now';
export type CalibRisk = 'low' | 'medium' | 'high';
export type CalibMerit = 'none' | 'inflation_only' | 'inflation_plus_merit';

export interface CalibrationSession {
  id: string;
  workspace_id: string;
  leader_user_id: string;
  cycle_label: string;
  period_start: string;
  period_end: string;
  status: string;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface CalibrationGridRow {
  member_id: string;
  member_name: string;
  member_role: string | null;
  team_id: string;
  team_name: string;
  ai_classification: CalibClassification | null;
  ai_turnover_risk: CalibRisk | null;
  ai_next_action_key: string | null;
  evolution_vs_previous: string | null;
  quarterly_confirmed_count: number;
  monthly_confirmed_count: number;
  feedbacks_count: number;
  meetings_count: number;
  last_review_classification: CalibClassification | null;
  last_review_promotion: CalibPromotion | null;
  last_review_merit: CalibMerit | null;
  last_review_loss_risk: CalibRisk | null;
  decision_classification: CalibClassification | null;
  decision_promotion: CalibPromotion | null;
  decision_loss_risk: CalibRisk | null;
  decision_merit: CalibMerit | null;
  decision_note: string | null;
  decision_confirmed_at: string | null;
}

export interface DecisionPatch {
  classification?: CalibClassification | null;
  promotion_recommendation?: CalibPromotion | null;
  loss_risk?: CalibRisk | null;
  merit_recommendation?: CalibMerit | null;
  note?: string | null;
  ai_suggested_classification?: CalibClassification | null;
  confirmed?: boolean;
}

/** Trimestre corrente como período padrão de uma nova sessão. */
export function currentCyclePeriod() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    cycle_label: `Q${q + 1} ${now.getFullYear()}`,
    period_start: iso(start),
    period_end: iso(end),
  };
}

export function useCalibrationSessions(workspaceId?: string | null) {
  const { id: effectiveUserId } = useEffectiveUser();
  const qc = useQueryClient();

  const sessions = useQuery({
    queryKey: ['calibration-sessions', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calibration_sessions')
        .select('*')
        .order('period_start', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CalibrationSession[];
    },
    enabled: !!effectiveUserId,
    staleTime: 30_000,
  });

  const createSession = useMutation({
    mutationFn: async (input?: Partial<CalibrationSession>) => {
      if (!workspaceId || !effectiveUserId) {
        throw new Error('Workspace não resolvido para esta sessão.');
      }
      const base = currentCyclePeriod();
      const { data, error } = await supabase
        .from('calibration_sessions')
        .insert({
          workspace_id: workspaceId,
          leader_user_id: effectiveUserId,
          cycle_label: input?.cycle_label ?? base.cycle_label,
          period_start: input?.period_start ?? base.period_start,
          period_end: input?.period_end ?? base.period_end,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CalibrationSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calibration-sessions'] });
    },
  });

  const closeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('calibration_sessions')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calibration-sessions'] });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ sessionId, notes }: { sessionId: string; notes: string }) => {
      const { error } = await supabase
        .from('calibration_sessions')
        .update({ notes })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calibration-sessions'] });
    },
  });

  return { sessions, createSession, closeSession, updateNotes };
}

export function useCalibrationGrid(session: CalibrationSession | null) {
  return useQuery({
    queryKey: ['calibration-grid', session?.id, session?.period_start, session?.period_end],
    queryFn: async () => {
      if (!session) return [];
      const rows = await safeRpc<CalibrationGridRow[]>('get_calibration_grid', {
        _period_start: session.period_start,
        _period_end: session.period_end,
        _session_id: session.id,
      });
      return rows ?? [];
    },
    enabled: !!session,
    staleTime: 15_000,
  });
}

export function useSaveDecision(session: CalibrationSession | null) {
  const qc = useQueryClient();
  const { id: effectiveUserId } = useEffectiveUser();

  return useMutation({
    mutationFn: async ({ memberId, patch }: { memberId: string; patch: DecisionPatch }) => {
      if (!session) throw new Error('Nenhuma sessão de calibração aberta.');
      const { confirmed, ...fields } = patch;
      const { error } = await supabase
        .from('calibration_decisions')
        .upsert(
          {
            session_id: session.id,
            member_id: memberId,
            ...fields,
            ...(confirmed === undefined
              ? {}
              : confirmed
                ? { confirmed_at: new Date().toISOString(), confirmed_by: effectiveUserId }
                : { confirmed_at: null, confirmed_by: null }),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,member_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calibration-grid'] });
    },
  });
}
