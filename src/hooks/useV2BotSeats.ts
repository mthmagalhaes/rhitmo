import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';

export interface V2BotSeat {
  memberId: string;
  memberName: string;
  hasAddon: boolean;
  /** 'addon' = 4h/ciclo, 'trial' = trial vitalício do workspace, 'none' = sem bot */
  basis: 'addon' | 'trial' | 'none';
  hoursCap: number;
  hoursUsed: number;
  percent: number;
}

export interface V2BotSeatsData {
  workspaceId: string | null;
  trialHoursUsed: number;
  trialHoursTotal: number;
  trialHoursRemaining: number;
  seats: V2BotSeat[];
}

/**
 * Modelo v2: o teto de bot é por liderado.
 *  - Com add-on ativo: 4h por ciclo de cobrança.
 *  - Sem add-on: horas restantes do trial único de 5h do workspace.
 *  - Trial esgotado e sem add-on: zero.
 */
export const useV2BotSeats = () => {
  const { id: effectiveUserId } = useEffectiveUser();
  const queryClient = useQueryClient();

  const query = useQuery<V2BotSeatsData>({
    queryKey: ['v2-bot-seats', effectiveUserId],
    queryFn: async () => {
      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (wsError) throw wsError;

      const workspaceId = (ws as { id?: string } | null)?.id ?? null;
      if (!workspaceId) {
        return {
          workspaceId: null,
          trialHoursUsed: 0,
          trialHoursTotal: 5,
          trialHoursRemaining: 5,
          seats: [],
        };
      }

      const { data, error } = await (supabase as any).rpc('get_v2_bot_seats', {
        p_workspace_id: workspaceId,
      });
      if (error) throw error;

      const rows = (data ?? []) as Array<Record<string, any>>;
      const trialHoursUsed = Number(rows[0]?.trial_hours_used ?? 0);
      const trialHoursTotal = Number(rows[0]?.trial_hours_total ?? 5);

      return {
        workspaceId,
        trialHoursUsed,
        trialHoursTotal,
        trialHoursRemaining: Math.max(trialHoursTotal - trialHoursUsed, 0),
        seats: rows.map((r) => {
          const hoursCap = Number(r.hours_cap ?? 0);
          const hoursUsed = Number(r.hours_used ?? 0);
          return {
            memberId: r.member_id as string,
            memberName: (r.member_name as string) ?? 'Liderado',
            hasAddon: !!r.has_addon,
            basis: (r.basis as V2BotSeat['basis']) ?? 'none',
            hoursCap,
            hoursUsed,
            percent: hoursCap <= 0 ? 100 : Math.min(100, (hoursUsed / hoursCap) * 100),
          };
        }),
      };
    },
    enabled: !!effectiveUserId,
    staleTime: 30 * 1000,
  });

  const toggle = useMutation({
    mutationFn: async (vars: { memberId: string; action: 'activate' | 'deactivate' }) => {
      const workspaceId = query.data?.workspaceId;
      if (!workspaceId) throw new Error('Workspace não encontrado');

      const { data, error } = await supabase.functions.invoke('toggle-seat-addon', {
        body: {
          workspace_id: workspaceId,
          member_id: vars.memberId,
          action: vars.action,
        },
      });

      // A edge function devolve 409 { error: 'no_subscription' } quando o
      // workspace ainda não assinou o assento.
      const payload = data as { error?: string; message?: string } | null;
      if (payload?.error === 'no_subscription') {
        const err = new Error(payload.message ?? 'Assine o assento primeiro.');
        (err as Error & { code?: string }).code = 'no_subscription';
        throw err;
      }
      if (error) {
        const err = new Error(error.message ?? 'Não foi possível atualizar o add-on.');
        // Erros HTTP não-2xx não trazem o corpo: tratamos 409 como no_subscription.
        if ((error as { context?: { status?: number } }).context?.status === 409) {
          (err as Error & { code?: string }).code = 'no_subscription';
        }
        throw err;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2-bot-seats'] });
    },
  });

  return { ...query, toggle };
};
