import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Relatório de custos do super admin — horas de bot e custo de IA por usuário.
 * Fonte: RPC `admin_cost_report` (bot_usage_events + function_logs).
 */

export interface AdminCostRow {
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  workspace_id: string | null;
  workspace_name: string | null;
  meetings: number;
  bot_hours: number;
  transcription_hours: number;
  recall_cost_usd: number;
  ai_cost_usd: number;
  total_cost_usd: number;
}

export const USD_BRL = 5.8;

export function useAdminCostReport(month: string) {
  return useQuery({
    queryKey: ['admin-cost-report', month],
    queryFn: async (): Promise<AdminCostRow[]> => {
      const { data, error } = await (supabase as any).rpc('admin_cost_report', {
        p_month: `${month}-01`,
      });
      if (error) throw error;
      return ((data || []) as any[]).map((r) => ({
        ...r,
        meetings: Number(r.meetings ?? 0),
        bot_hours: Number(r.bot_hours ?? 0),
        transcription_hours: Number(r.transcription_hours ?? 0),
        recall_cost_usd: Number(r.recall_cost_usd ?? 0),
        ai_cost_usd: Number(r.ai_cost_usd ?? 0),
        total_cost_usd: Number(r.total_cost_usd ?? 0),
      }));
    },
    staleTime: 60 * 1000,
  });
}

export function buildMonthOptions(count = 12): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({
      value,
      label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    });
  }
  return out;
}
