// Diário de Bordo V2 — rota piloto AI-Native.
// Visão cross-member: insight de cobertura no topo + feed cronológico de
// TODAS as notas do líder agrupadas por bucket temporal. Sem master list lateral.
// Coexiste com /lider/diario (clássico, master-detail) — banner permite alternar.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isToday, isThisWeek, subDays } from 'date-fns';
import { Lock, PenSquare, Inbox } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/supabaseSafe';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { DiaryCoverageInsight } from '@/components/leader/diario-v2/DiaryCoverageInsight';
import { DiaryFeedItem, type FeedItem } from '@/components/leader/diario-v2/DiaryFeedItem';
import {
  DiaryFilters,
  type Period,
  type SortOrder,
} from '@/components/leader/diario-v2/DiaryFilters';
import { VersionSwitchBanner } from '@/components/leader/diario-v2/VersionSwitchBanner';

interface FeedbackRow {
  id: string;
  member_id: string;
  title: string | null;
  content: string;
  tags: string[] | null;
  visibility: string | null;
  occurred_at: string;
  created_at: string;
}

export default function LiderDiarioV2() {
  const { id: effectiveUserId } = useEffectiveUser();
  const { workspace, teams, members } = useLeaderMembers();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const memberId = searchParams.get('member') ?? 'all';
  const teamId = searchParams.get('team') ?? 'all';
  const period = (searchParams.get('period') as Period) || '30d';
  const query = searchParams.get('q') ?? '';
  const tagsParam = searchParams.get('tags') ?? '';
  const selectedTags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];
  const sort = (searchParams.get('sort') as SortOrder) || 'newest';
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const dateRange: DateRange | undefined = fromParam
    ? { from: new Date(fromParam), to: toParam ? new Date(toParam) : undefined }
    : undefined;

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [presetMemberId, setPresetMemberId] = useState<string | undefined>();

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'all' && value !== '') next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const updateDateRange = (range: DateRange | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (range?.from) next.set('from', range.from.toISOString());
    else next.delete('from');
    if (range?.to) next.set('to', range.to.toISOString());
    else next.delete('to');
    setSearchParams(next, { replace: true });
  };

  // Carrega TODAS as notas do líder (cross-member) — RLS garante manager_id = auth.uid()
  // Quando dateRange está setado, ignoramos o período e buscamos sem limite temporal.
  const hasCustomDate = !!dateRange?.from;
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['diario-v2-feedbacks', effectiveUserId, period, hasCustomDate],
    enabled: !!effectiveUserId,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('feedbacks')
        .select('id, member_id, title, content, tags, visibility, occurred_at, created_at')
        .eq('manager_id', effectiveUserId!)
        .order('occurred_at', { ascending: false })
        .limit(200);
      if (!hasCustomDate && period !== 'all') {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        q = q.gte('occurred_at', subDays(new Date(), days).toISOString());
      }
      return await safeQuery<FeedbackRow[]>(q);
    },
  });

  // Index de membros para join client-side
  const memberById = useMemo(() => {
    const m = new Map(members.map((x) => [x.id, x]));
    return m;
  }, [members]);

  // Aplica filtros + faz join com membros
  const items: FeedItem[] = useMemo(() => {
    const teamMemberIds =
      teamId === 'all'
        ? null
        : new Set(members.filter((m) => m.team_id === teamId).map((m) => m.id));
    const q = query.trim().toLowerCase();
    const fromTime = dateRange?.from ? new Date(dateRange.from).setHours(0, 0, 0, 0) : null;
    const toTime = dateRange?.to ? new Date(dateRange.to).setHours(23, 59, 59, 999) : null;

    const filtered = feedbacks.filter((fb) => {
      if (memberId !== 'all' && fb.member_id !== memberId) return false;
      if (teamMemberIds && !teamMemberIds.has(fb.member_id)) return false;
      if (selectedTags.length > 0) {
        const tags = fb.tags ?? [];
        if (!selectedTags.some((t) => tags.includes(t))) return false;
      }
      if (fromTime !== null) {
        const t = new Date(fb.occurred_at || fb.created_at).getTime();
        if (t < fromTime) return false;
        if (toTime !== null && t > toTime) return false;
      }
      if (q) {
        const titleMatch = fb.title?.toLowerCase().includes(q);
        const plain = (fb.content ?? '').replace(/<[^>]*>/g, '').toLowerCase();
        if (!titleMatch && !plain.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const ta = new Date(a.occurred_at || a.created_at).getTime();
      const tb = new Date(b.occurred_at || b.created_at).getTime();
      return sort === 'newest' ? tb - ta : ta - tb;
    });

    return sorted.map((fb) => {
      const m = memberById.get(fb.member_id);
      return {
        ...fb,
        member_name: m?.name ?? 'Liderado removido',
        member_role: m?.role ?? null,
        member_avatar: m?.avatar ?? null,
      };
    });
  }, [feedbacks, memberId, teamId, query, members, memberById, selectedTags, dateRange, sort]);

  // Agrupa por bucket temporal (sempre na ordem visual: Hoje → Semana → Antigas pra newest;
  // Antigas → Semana → Hoje pra oldest)
  const buckets = useMemo(() => {
    const today: FeedItem[] = [];
    const week: FeedItem[] = [];
    const older: FeedItem[] = [];
    items.forEach((it) => {
      const d = new Date(it.occurred_at || it.created_at);
      if (isToday(d)) today.push(it);
      else if (isThisWeek(d, { weekStartsOn: 1 })) week.push(it);
      else older.push(it);
    });
    return { today, week, older };
  }, [items]);

  const orderedSections =
    sort === 'newest'
      ? [
          { title: 'Hoje', items: buckets.today },
          { title: 'Esta semana', items: buckets.week },
          { title: 'Mais antigas', items: buckets.older },
        ]
      : [
          { title: 'Mais antigas', items: buckets.older },
          { title: 'Esta semana', items: buckets.week },
          { title: 'Hoje', items: buckets.today },
        ];

  const handleCreateNoteFor = (m: { id: string }) => {
    setPresetMemberId(m.id);
    setNoteDialogOpen(true);
  };

  const onNoteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['diario-v2-feedbacks'] });
    queryClient.invalidateQueries({ queryKey: ['team-members'] });
  };

  const presetMember = presetMemberId ? memberById.get(presetMemberId) : undefined;
  const total = items.length;
  const selectedMemberName =
    memberId !== 'all' ? memberById.get(memberId)?.name : undefined;

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-bold tracking-tight">Diário de Bordo</h1>
          <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Suas notas privadas sobre o time, em um só lugar.
          </p>
        </div>
        <VersionSwitchBanner variant="v2-to-v1" />
      </header>

      {/* Insight Card */}
      {members.length > 0 && (
        <DiaryCoverageInsight members={members} onCreateNoteFor={handleCreateNoteFor} />
      )}

      {/* Bloco Anotações + contador dinâmico + CTA Nova nota */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-lg font-bold tracking-tight">Anotações</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total === 0
              ? 'Nenhuma anotação para os filtros atuais.'
              : `${total} ${total === 1 ? 'registro' : 'registros'} no histórico${
                  selectedMemberName ? ` de ${selectedMemberName.split(' ')[0]}` : ''
                }.`}
          </p>
        </div>
        <Button
          onClick={() => {
            setPresetMemberId(undefined);
            setNoteDialogOpen(true);
          }}
          className="rounded-xl gap-2 shrink-0"
        >
          <PenSquare className="h-4 w-4" />
          Nova nota
        </Button>
      </div>

      {/* Filtros */}
      <DiaryFilters
        members={members}
        teams={teams}
        memberId={memberId}
        teamId={teamId}
        period={period}
        query={query}
        selectedTags={selectedTags}
        dateRange={dateRange}
        sort={sort}
        onMemberChange={(v) => updateParam('member', v)}
        onTeamChange={(v) => updateParam('team', v)}
        onPeriodChange={(v) => updateParam('period', v)}
        onQueryChange={(v) => updateParam('q', v)}
        onTagsChange={(tags) => updateParam('tags', tags.join(','))}
        onDateRangeChange={updateDateRange}
        onSortChange={(v) => updateParam('sort', v === 'newest' ? '' : v)}
      />

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center rounded-2xl border-dashed bg-transparent">
          <Inbox className="h-7 w-7 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {feedbacks.length === 0
              ? 'Você ainda não tem anotações no período selecionado.'
              : 'Nenhuma nota encontrada para estes filtros.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {orderedSections.map(
            (s) =>
              s.items.length > 0 && (
                <FeedSection key={s.title} title={s.title} items={s.items} />
              ),
          )}
        </div>
      )}

      <NewNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        selectedMemberId={presetMemberId}
        memberName={presetMember?.name}
        workspaceId={workspace?.id}
        onSuccess={onNoteSuccess}
      />
    </div>
  );
}

function FeedSection({ title, items }: { title: string; items: FeedItem[] }) {
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2.5">
        {title}{' '}
        <span className="text-muted-foreground/60 font-normal normal-case tracking-normal">
          · {items.length}
        </span>
      </h2>
      <div className="space-y-1.5">
        {items.map((it) => (
          <DiaryFeedItem key={it.id} item={it} />
        ))}
      </div>
    </section>
  );
}
