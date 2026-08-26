import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';

export interface BotHoursUsage {
  hoursUsed: number;
  hoursCap: number;
  paidSeats: number;
  unlimited: boolean;
  percent: number;
}

/**
 * Espelha exatamente o cálculo do edge function `schedule-recall-bot`
 * (RPC `get_bot_hours_usage`): teto = 4h por assento pago, ou 4h no plano grátis.
 */
export const useBotHoursUsage = () => {
  const { id: effectiveUserId } = useEffectiveUser();

  return useQuery<BotHoursUsage>({
    queryKey: ['bot-hours-usage', effectiveUserId],
    queryFn: async () => {
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
        percent: unlimited || hoursCap <= 0 ? 0 : Math.min(100, (hoursUsed / hoursCap) * 100),
      };
    },
    enabled: !!effectiveUserId,
    staleTime: 60 * 1000,
  });
};
