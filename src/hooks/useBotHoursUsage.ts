import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';
import { useBillingStatus } from './useBillingStatus';

export interface BotHoursUsage {
  hoursUsed: number;
  hoursCap: number;
  paidSeats: number;
  unlimited: boolean;
  /** Modelo v3: horas do líder (teste de 14 dias ou add-on de 6h). */
  isV3: boolean;
  basis?: string;
  percent: number;
}

/**
 * Espelha exatamente o cálculo do edge function `schedule-recall-bot`
 * Legado: RPC `get_bot_hours_usage` (4h por assento pago).
 * Modelo v3: RPC `get_leader_bot_addon` (6h do líder no teste ou no add-on).
 */
export const useBotHoursUsage = () => {
  const { id: effectiveUserId } = useEffectiveUser();
  const { data: billing } = useBillingStatus();
  const isV3 = billing?.billingModel === 'v3';

  return useQuery<BotHoursUsage>({
    queryKey: ['bot-hours-usage', effectiveUserId, isV3],
    queryFn: async () => {
      if (isV3 && billing?.workspaceId) {
        const { data, error } = await (supabase as any).rpc('get_leader_bot_addon', {
          p_workspace_id: billing.workspaceId,
        });
        if (error) throw error;
        const rows = (Array.isArray(data) ? data : [data]).filter(Boolean) as any[];
        const row = rows.find((r) => r.leader_user_id === effectiveUserId) ?? rows[0];
        const basis = row?.basis as string | undefined;
        const unlimited = basis === 'grandfathered';
        const hoursUsed = Number(row?.hours_used ?? 0);
        const hoursCap = Number(row?.hours_cap ?? 0);
        return {
          hoursUsed,
          hoursCap,
          paidSeats: 0,
          unlimited,
          isV3: true,
          basis,
          percent: unlimited || hoursCap <= 0 ? (hoursCap <= 0 && !unlimited ? 100 : 0) : Math.min(100, (hoursUsed / hoursCap) * 100),
        };
      }
      const { data, error } = await (supabase as any).rpc('get_bot_hours_usage');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const hoursUsed = Number(row?.hours_used ?? 0);
      const hoursCap = Number(row?.hours_cap ?? 4);
      const unlimited = !!row?.unlimited;
      return {
        hoursUsed,
        hoursCap,
        paidSeats: Number(row?.paid_seats ?? 0),
        unlimited,
        isV3: false,
        percent: unlimited || hoursCap <= 0 ? 0 : Math.min(100, (hoursUsed / hoursCap) * 100),
      };
    },
    enabled: !!effectiveUserId && !!billing,
    staleTime: 60 * 1000,
  });
};
