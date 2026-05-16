// Agrega monthly_recaps + performance_reviews por liderado para a tabela
// cross-member de /lider/avaliacoes. Tudo no client, sem RPC nova.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/supabaseSafe';
import { deriveRhitmoState, type RhitmoState } from '@/lib/rhitmoState';

interface MonthlyRecapRow {
  id: string;
  member_id: string;
  period_month: string;
  status: string;
}

interface PerfReviewRow {
  id: string;
  member_id: string;
  review_type: string;
  period_type: string;
  created_at: string;
}

export interface MemberReviewsSummary {
  memberId: string;
  rhitmoState: RhitmoState;
  lastMonthlyAt: string | null;       // period_month (yyyy-mm-dd) do último recap mensal
  lastQuarterlyAt: string | null;     // created_at do último review com period_type contendo 'quarter'
  lastFormalAt: string | null;        // created_at do último review_type='manager'
  hasCurrentMonthRecap: boolean;
  nextAction: 'monthly' | 'formal' | 'none';
}

function currentMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function useTeamReviewsSummary(memberIds: string[]) {
  const idsKey = useMemo(() => [...memberIds].sort().join(','), [memberIds]);

  const { data: recaps = [], isLoading: rLoading } = useQuery({
    queryKey: ['team-monthly-recaps', idsKey],
    enabled: memberIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      if (memberIds.length === 0) return [] as MonthlyRecapRow[];
      const q = supabase
        .from('monthly_recaps')
        .select('id, member_id, period_month, status')
        .in('member_id', memberIds)
        .order('period_month', { ascending: false });
      return await safeQuery<MonthlyRecapRow[]>(q);
    },
  });

  const { data: reviews = [], isLoading: pLoading } = useQuery({
    queryKey: ['team-performance-reviews', idsKey],
    enabled: memberIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      if (memberIds.length === 0) return [] as PerfReviewRow[];
      const q = supabase
        .from('performance_reviews')
        .select('id, member_id, review_type, period_type, created_at')
        .in('member_id', memberIds)
        .order('created_at', { ascending: false });
      return await safeQuery<PerfReviewRow[]>(q);
    },
  });

  const summaryByMember = useMemo(() => {
    const map = new Map<string, MemberReviewsSummary>();
    const curMonth = currentMonthIso();

    for (const id of memberIds) {
      map.set(id, {
        memberId: id,
        rhitmoState: 'C',
        lastMonthlyAt: null,
        lastQuarterlyAt: null,
        lastFormalAt: null,
        hasCurrentMonthRecap: false,
        nextAction: 'none',
      });
    }

    // Group recaps by member
    const byMemberRecaps = new Map<string, MonthlyRecapRow[]>();
    for (const r of recaps) {
      const arr = byMemberRecaps.get(r.member_id) ?? [];
      arr.push(r);
      byMemberRecaps.set(r.member_id, arr);
    }
    for (const [memberId, arr] of byMemberRecaps) {
      const s = map.get(memberId);
      if (!s) continue;
      s.rhitmoState = deriveRhitmoState(arr);
      s.lastMonthlyAt = arr[0]?.period_month?.slice(0, 10) ?? null;
      s.hasCurrentMonthRecap = arr.some((r) => r.period_month.slice(0, 10) === curMonth);
    }

    // Last review per type
    for (const r of reviews) {
      const s = map.get(r.member_id);
      if (!s) continue;
      const isQuarter = (r.period_type ?? '').toLowerCase().includes('quarter');
      if (r.review_type === 'manager' && !s.lastFormalAt) s.lastFormalAt = r.created_at;
      if (isQuarter && !s.lastQuarterlyAt) s.lastQuarterlyAt = r.created_at;
    }

    // Next action
    for (const s of map.values()) {
      if (!s.hasCurrentMonthRecap) s.nextAction = 'monthly';
      else if (!s.lastFormalAt) s.nextAction = 'formal';
      else s.nextAction = 'none';
    }

    return map;
  }, [recaps, reviews, memberIds]);

  return { summaryByMember, isLoading: rLoading || pLoading };
}
