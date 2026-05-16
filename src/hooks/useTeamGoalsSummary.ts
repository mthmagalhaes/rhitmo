// Agrega goals por liderado para a tabela cross-member de /lider/objetivos.
// Considera "ativa" toda meta com status 'active' (não 'done' nem 'archived').
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/supabaseSafe';

export interface GoalRow {
  id: string;
  member_id: string;
  title: string;
  status: string;
  target_date: string | null;
  metric_current: number | null;
  metric_target: number | null;
  completed_at: string | null;
}

export interface MemberGoalsSummary {
  memberId: string;
  active: number;
  done: number;
  overdue: number;
  nextDue: string | null; // ISO date or null
  percentComplete: number; // 0..100 média entre metas com metric_target
}

export function useTeamGoalsSummary(memberIds: string[]) {
  const idsKey = useMemo(() => [...memberIds].sort().join(','), [memberIds]);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['team-goals-summary', idsKey],
    enabled: memberIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      if (memberIds.length === 0) return [] as GoalRow[];
      const q = supabase
        .from('goals')
        .select('id, member_id, title, status, target_date, metric_current, metric_target, completed_at')
        .in('member_id', memberIds);
      return await safeQuery<GoalRow[]>(q);
    },
  });

  const summaryByMember = useMemo(() => {
    const map = new Map<string, MemberGoalsSummary>();
    for (const id of memberIds) {
      map.set(id, { memberId: id, active: 0, done: 0, overdue: 0, nextDue: null, percentComplete: 0 });
    }
    const todayIso = new Date().toISOString().slice(0, 10);
    const pctAccum = new Map<string, { sum: number; n: number }>();

    for (const g of goals) {
      const s = map.get(g.member_id);
      if (!s) continue;
      if (g.status === 'done') s.done++;
      else if (g.status === 'active') {
        s.active++;
        if (g.target_date && g.target_date < todayIso) s.overdue++;
        if (g.target_date) {
          if (!s.nextDue || g.target_date < s.nextDue) s.nextDue = g.target_date;
        }
        if (g.metric_target && g.metric_target > 0) {
          const cur = g.metric_current ?? 0;
          const pct = Math.min(100, Math.max(0, (Number(cur) / Number(g.metric_target)) * 100));
          const acc = pctAccum.get(g.member_id) ?? { sum: 0, n: 0 };
          acc.sum += pct;
          acc.n += 1;
          pctAccum.set(g.member_id, acc);
        }
      }
    }
    for (const [id, acc] of pctAccum) {
      const s = map.get(id);
      if (s && acc.n > 0) s.percentComplete = Math.round(acc.sum / acc.n);
    }
    return map;
  }, [goals, memberIds]);

  return { goals, summaryByMember, isLoading };
}
