import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';

export interface BillingStatus {
  workspaceId: string | null;
  billingModel: 'v3' | 'legacy';
  trialEndsAt: string | null;
  daysLeft: number;
  trialActive: boolean;
  hasSubscription: boolean;
  isGrandfathered: boolean;
  /** true = teste acabou e não há assinatura: recursos de escrita ficam travados. */
  locked: boolean;
  seatCount: number;
}

const EMPTY: BillingStatus = {
  workspaceId: null,
  billingModel: 'legacy',
  trialEndsAt: null,
  daysLeft: 0,
  trialActive: false,
  hasSubscription: false,
  isGrandfathered: false,
  locked: false,
  seatCount: 0,
};

/** Estado comercial do workspace: teste de 14 dias, assinatura e travas. */
export const useBillingStatus = () => {
  const { id: effectiveUserId } = useEffectiveUser();

  return useQuery<BillingStatus>({
    queryKey: ['billing-status', effectiveUserId],
    queryFn: async () => {
      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (wsError) throw wsError;

      const workspaceId = (ws as { id?: string } | null)?.id ?? null;
      if (!workspaceId) return EMPTY;

      const { data, error } = await (supabase as any).rpc('get_billing_status', {
        p_workspace_id: workspaceId,
      });
      if (error) throw error;

      const row = (Array.isArray(data) ? data[0] : data) as Record<string, any> | null;
      if (!row) return { ...EMPTY, workspaceId };

      return {
        workspaceId,
        billingModel: (row.billing_model as BillingStatus['billingModel']) ?? 'legacy',
        trialEndsAt: (row.trial_ends_at as string | null) ?? null,
        daysLeft: Number(row.days_left ?? 0),
        trialActive: !!row.trial_active,
        hasSubscription: !!row.has_subscription,
        isGrandfathered: !!row.is_grandfathered,
        locked: !!row.locked,
        seatCount: Number(row.seat_count ?? 0),
      };
    },
    enabled: !!effectiveUserId,
    staleTime: 60 * 1000,
  });
};
