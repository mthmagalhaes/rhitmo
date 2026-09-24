import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';
import { useBillingStatus } from './useBillingStatus';

export interface LeaderBotAddon {
  leaderUserId: string;
  leaderName: string;
  hasAddon: boolean;
  /** 'grandfathered' = sem teto, 'addon' = 6h/ciclo, 'trial' = teste de 14 dias, 'none' = sem bot */
  basis: 'grandfathered' | 'addon' | 'trial' | 'none';
  hoursCap: number;
  hoursUsed: number;
  percent: number;
}

/** Modelo v3: o bot é um add-on do LÍDER (R$ 29,90/mês, 6h por ciclo). */
export const useLeaderBotAddon = () => {
  const { id: effectiveUserId } = useEffectiveUser();
  const { data: billing } = useBillingStatus();
  const queryClient = useQueryClient();
  const workspaceId = billing?.workspaceId ?? null;

  const query = useQuery<LeaderBotAddon[]>({
    queryKey: ['leader-bot-addon', workspaceId, effectiveUserId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any).rpc('get_leader_bot_addon', {
        p_workspace_id: workspaceId,
      });
      if (error) throw error;

      return ((data ?? []) as Array<Record<string, any>>).map((r) => {
        const hoursCap = Number(r.hours_cap ?? 0);
        const hoursUsed = Number(r.hours_used ?? 0);
        return {
          leaderUserId: r.leader_user_id as string,
          leaderName: (r.leader_name as string) || (r.name as string) || 'Líder',
          hasAddon: !!r.has_addon,
          basis: (r.basis as LeaderBotAddon['basis']) ?? 'none',
          hoursCap,
          hoursUsed,
          percent: hoursCap <= 0 ? 100 : Math.min(100, (hoursUsed / hoursCap) * 100),
        };
      });
    },
    enabled: !!workspaceId && !!effectiveUserId,
    staleTime: 30 * 1000,
  });

  const toggle = useMutation({
    mutationFn: async (vars: { leaderUserId: string; action: 'activate' | 'deactivate' }) => {
      if (!workspaceId) throw new Error('Workspace não encontrado');

      const { data, error } = await supabase.functions.invoke('toggle-seat-addon', {
        body: {
          workspace_id: workspaceId,
          leader_user_id: vars.leaderUserId,
          action: vars.action,
        },
      });

      const payload = data as { error?: string; message?: string } | null;
      if (payload?.error === 'no_subscription') {
        const err = new Error(payload.message ?? 'Assine os assentos primeiro.');
        (err as Error & { code?: string }).code = 'no_subscription';
        throw err;
      }
      if (error) {
        const err = new Error(error.message ?? 'Não foi possível atualizar o add-on.');
        if ((error as { context?: { status?: number } }).context?.status === 409) {
          (err as Error & { code?: string }).code = 'no_subscription';
        }
        throw err;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leader-bot-addon'] });
      queryClient.invalidateQueries({ queryKey: ['billing-status'] });
    },
  });

  return { ...query, toggle };
};
