import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { RecapClassification, RecapTurnoverRisk } from '@/lib/recapActions';

/**
 * Supabase `functions.invoke` only surfaces "Edge function returned a non-2xx
 * status code" as the error message — the actual body lives on
 * `error.context.body` (a Response object). Read it once and return the most
 * useful string for the user.
 */
async function extractEdgeFunctionError(error: any, fallback: string): Promise<string> {
  try {
    const body = error?.context?.body ?? error?.context;
    if (body && typeof body.text === 'function') {
      const txt = await body.text();
      try {
        const parsed = JSON.parse(txt);
        if (parsed?.error) return String(parsed.error);
      } catch {
        if (txt) return txt;
      }
    }
  } catch {
    // ignore parsing issues
  }
  return error?.message || fallback;
}

// ─── Monthly ────────────────────────────────────────────────────────────────

export interface MonthlyRecap {
  id: string;
  member_id: string;
  manager_id: string;
  workspace_id: string;
  period_month: string; // YYYY-MM-DD
  status: 'draft' | 'confirmed';
  confirmed_at: string | null;
  highlight_text: string | null;
  highlight_evidence: Array<{ feedback_id?: string; meeting_id?: string; date: string }>;
  concern_text: string | null;
  concern_evidence: Array<{ feedback_id?: string; meeting_id?: string; date: string }>;
  dominant_pattern: string | null;
  feedbacks_count: number;
  meetings_count: number;
  low_evidence: boolean;
  ai_generated_at: string | null;
  ai_model: string | null;
  created_at: string;
}

export function useMonthlyRecaps(memberId: string | undefined, monthsBack = 6) {
  return useQuery({
    queryKey: ['monthly-recaps', memberId, monthsBack],
    queryFn: async () => {
      if (!memberId) return [] as MonthlyRecap[];
      const cutoff = new Date();
      cutoff.setUTCMonth(cutoff.getUTCMonth() - monthsBack);
      cutoff.setUTCDate(1);
      const cutoffIso = cutoff.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('monthly_recaps')
        .select('*')
        .eq('member_id', memberId)
        .gte('period_month', cutoffIso)
        .order('period_month', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MonthlyRecap[];
    },
    enabled: !!memberId,
    refetchOnMount: 'always',
  });
}

export function useGenerateMonthlyRecap(memberId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (args: { periodMonth?: string; regenerate?: boolean }) => {
      if (!memberId) throw new Error('memberId required');
      const { data, error } = await supabase.functions.invoke('generate-monthly-recap', {
        body: {
          member_id: memberId,
          period_month: args.periodMonth,
          regenerate: args.regenerate ?? false,
        },
      });
      if (error) {
        const msg = await extractEdgeFunctionError(error, 'Falha ao chamar a função');
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monthly-recaps', memberId] });
      toast({ title: 'Rhitmo Mensal gerado', description: 'Revise e confirme abaixo.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao gerar mensal', description: e.message, variant: 'destructive' });
    },
  });
}

export function useUpdateMonthlyRecap(memberId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      patch: Partial<Pick<MonthlyRecap, 'highlight_text' | 'concern_text' | 'dominant_pattern'>>;
    }) => {
      const { error } = await supabase
        .from('monthly_recaps')
        .update(args.patch)
        .eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monthly-recaps', memberId] });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    },
  });
}

export function useConfirmMonthlyRecap(memberId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      patch: Partial<Pick<MonthlyRecap, 'highlight_text' | 'concern_text' | 'dominant_pattern'>>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('monthly_recaps')
        .update({
          ...args.patch,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id ?? null,
        })
        .eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monthly-recaps', memberId] });
      qc.invalidateQueries({ queryKey: ['quarterly-recaps', memberId] });
      toast({ title: 'Mensal confirmado', description: 'Vai alimentar o trimestral.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao confirmar', description: e.message, variant: 'destructive' });
    },
  });
}

// ─── Quarterly ──────────────────────────────────────────────────────────────

export interface QuarterlyRecap {
  id: string;
  member_id: string;
  manager_id: string;
  workspace_id: string;
  period_quarter: string | null;
  period_start: string | null;
  period_end: string | null;
  period_label: string | null;
  status: 'draft' | 'confirmed';
  confirmed_at: string | null;
  highlights: Array<{ title: string; detail: string; source_month: string }>;
  recurring_patterns: Array<{ pattern: string; polarity: 'positive' | 'negative'; frequency_note: string }>;
  evolution_vs_previous: string | null;
  classification: RecapClassification | null;
  ai_suggested_classification: RecapClassification | null;
  turnover_risk: RecapTurnoverRisk | null;
  turnover_risk_reason: string | null;
  next_action_key: string | null;
  next_action_note: string | null;
  ai_suggested_next_action_key: string | null;
  source_monthly_recap_ids: string[];
  source_feedbacks_count: number;
  source_meetings_count: number;
  ai_generated_at: string | null;
  ai_model: string | null;
  generation_mode: 'from_monthly' | 'from_raw' | null;
  peer_voices?: Array<{ request_id: string; peer_member_id: string | null; peer_name: string; text: string; responded_at: string; edge_strength: number | null }>;
  network_context?: { signals: Array<{ id: string; signal_type: string; severity: string; detected_at: string; payload: any }>; total_active: number };
  slack_delivered_at?: string | null;
  created_at: string;
}

export function useQuarterlyRecaps(memberId: string | undefined, quartersBack = 4) {
  return useQuery({
    queryKey: ['quarterly-recaps', memberId, quartersBack],
    queryFn: async () => {
      if (!memberId) return [] as QuarterlyRecap[];
      const cutoff = new Date();
      cutoff.setUTCMonth(cutoff.getUTCMonth() - quartersBack * 3);
      cutoff.setUTCDate(1);
      const cutoffIso = cutoff.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('quarterly_recaps')
        .select('*')
        .eq('member_id', memberId)
        .gte('period_quarter', cutoffIso)
        .order('period_quarter', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as QuarterlyRecap[];
    },
    enabled: !!memberId,
    refetchOnMount: 'always',
  });
}

export function useGenerateQuarterlyRecap(memberId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (args: { periodQuarter?: string; regenerate?: boolean; mode?: 'auto' | 'from_raw' }) => {
      if (!memberId) throw new Error('memberId required');
      const { data, error } = await supabase.functions.invoke('generate-quarterly-recap', {
        body: {
          member_id: memberId,
          period_quarter: args.periodQuarter,
          regenerate: args.regenerate ?? false,
          mode: args.mode ?? 'auto',
        },
      });
      if (error) {
        const msg = await extractEdgeFunctionError(error, 'Falha ao chamar a função');
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['quarterly-recaps', memberId] });
      const isFast = data?.generation_mode === 'from_raw';
      toast({
        title: isFast ? 'Trimestral gerado em modo rápido' : 'Rhitmo Trimestral gerado',
        description: isFast ? 'Sem mensais confirmados — revise com atenção extra.' : 'Revise, calibre e confirme.',
      });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao gerar trimestral', description: e.message, variant: 'destructive' });
    },
  });
}

export function useUpdateQuarterlyRecap(memberId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (args: { id: string; patch: Partial<QuarterlyRecap> }) => {
      const { error } = await supabase
        .from('quarterly_recaps')
        .update(args.patch as any)
        .eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quarterly-recaps', memberId] });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    },
  });
}

export function useConfirmQuarterlyRecap(memberId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (args: { id: string; patch: Partial<QuarterlyRecap> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('quarterly_recaps')
        .update({
          ...(args.patch as any),
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id ?? null,
        })
        .eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quarterly-recaps', memberId] });
      toast({ title: 'Trimestral confirmado', description: 'Vai virar a espinha da próxima Review.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao confirmar', description: e.message, variant: 'destructive' });
    },
  });
}
