// Diário de Bordo — visão cross-member AI-Native.
// Página única com anotações (notas do líder + resumos semanais do Slack como
// anotações enriquecidas). Filtros via URL; chip "Slack" isola rollups.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isToday, isThisWeek, subDays, startOfISOWeek, formatISO } from 'date-fns';
import { Lock, PenSquare, Inbox } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/supabaseSafe';
import { detectEffectiveSource } from '@/lib/diarySource';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { DiaryCoverageInsight } from '@/components/leader/diario/DiaryCoverageInsight';
import { DiaryFeedItem, type FeedItem } from '@/components/leader/diario/DiaryFeedItem';
import {
  SlackRollupFeedItem,
  type SlackRollupItem,
  type SlackRollupHighlight,
  type SlackRollupAssessment,
} from '@/components/leader/diario/SlackRollupFeedItem';
import {
  DiaryFilters,
  type Period,
  type SortOrder,
  type DiarySource,
} from '@/components/leader/diario/DiaryFilters';

type DiaryItem = FeedItem | SlackRollupItem;
function isSlackRollup(it: DiaryItem): it is SlackRollupItem {
  return (it as SlackRollupItem).kind === 'slack_rollup';
}

interface FeedbackRow {
  id: string;
  member_id: string;
  title: string | null;
  content: string;
  tags: string[] | null;
  visibility: string | null;
  occurred_at: string;
  created_at: string;
  source: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structured_summary: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  personal_lens: any | null;
}

interface SlackRollupRow {
  id: string;
  member_id: string;
  title: string | null;
  summary: string | null;
  leader_edited_summary: string | null;
  occurred_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
}

export default function LiderDiario() {
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
  const sourceParam = searchParams.get('source');
  const source = ((['recall_bot', 'transcription', 'slack', 'manual'].includes(sourceParam ?? '')
    ? sourceParam
    : 'all') as DiarySource);
  const sort = (searchParams.get('sort') as SortOrder) || 'newest';
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const dateRange: DateRange | undefined = fromParam
    ? { from: new Date(fromParam), to: toParam ? new Date(toParam) : undefined }
    : undefined;

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [presetMemberId, setPresetMemberId] = useState<string | undefined>();
  const [prefillContent, setPrefillContent] = useState<string | undefined>();
  const [prefillTitle, setPrefillTitle] = useState<string | undefined>();

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

  const hasCustomDate = !!dateRange?.from;
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['diario-feedbacks', effectiveUserId, period, hasCustomDate],
    enabled: !!effectiveUserId,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('feedbacks')
        .select('id, member_id, title, content, tags, visibility, occurred_at, created_at, source, structured_summary, personal_lens')
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

  // Rollups semanais do Slack — agora trazem highlights + avaliação + edição
  const memberIdsForRoll = useMemo(() => members.map((m) => m.id), [members]);
  const { data: slackRollups = [] } = useQuery({
    queryKey: ['diario-slack-rollups', effectiveUserId, period, hasCustomDate, memberIdsForRoll.length],
    enabled: !!effectiveUserId && memberIdsForRoll.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from('context_evidence')
        .select('id, member_id, title, summary, leader_edited_summary, occurred_at, metadata')
        .eq('evidence_type', 'slack_activity_rollup')
        .is('deleted_at', null)
        .in('member_id', memberIdsForRoll)
        .order('occurred_at', { ascending: false })
        .limit(100);
      if (!hasCustomDate && period !== 'all') {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        q = q.gte('occurred_at', subDays(new Date(), days).toISOString());
      }
      return await safeQuery<SlackRollupRow[]>(q);
    },
  });

  const memberById = useMemo(() => {
    return new Map(members.map((x) => [x.id, x]));
  }, [members]);

  const items: DiaryItem[] = useMemo(() => {
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
      // Filtro por origem usa o source EFETIVO (a heurística de transcrição
      // promove `manual` para `transcription` quando o conteúdo é claramente
      // uma transcrição importada — espelha a regra do banco).
      if (source !== 'all') {
        const effective = detectEffectiveSource(fb.source, fb.content);
        if (source === 'recall_bot' && effective !== 'recall_bot') return false;
        if (source === 'transcription' && effective !== 'transcription') return false;
        if (source === 'granola' && effective !== 'granola') return false;
        if (source === 'manual' && effective !== 'manual') return false;
        if (source === 'slack') return false; // rollups Slack são incluídos abaixo.
      }
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

    const fbItems: DiaryItem[] = filtered.map((fb) => {
      const m = memberById.get(fb.member_id);
      return {
        ...fb,
        member_name: m?.name ?? 'Liderado removido',
        member_role: m?.role ?? null,
        member_avatar: m?.avatar ?? null,
      };
    });

    // Slack rollups: 1 por (liderado, semana ISO).
    const rawRollups = selectedTags.length > 0
      ? []
      : (slackRollups ?? []).filter((r) => {
          if (memberId !== 'all' && r.member_id !== memberId) return false;
          if (teamMemberIds && !teamMemberIds.has(r.member_id)) return false;
          if (fromTime !== null) {
            const t = new Date(r.occurred_at).getTime();
            if (t < fromTime) return false;
            if (toTime !== null && t > toTime) return false;
          }
          if (q) {
            const hay = `${r.title ?? ''} ${r.summary ?? ''} ${r.leader_edited_summary ?? ''}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });

    const seenWeek = new Set<string>();
    const dedupedRollups = [...rawRollups]
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .filter((r) => {
        const weekKey = `${r.member_id}:${formatISO(startOfISOWeek(new Date(r.occurred_at)), { representation: 'date' })}`;
        if (seenWeek.has(weekKey)) return false;
        seenWeek.add(weekKey);
        return true;
      });

    const slackItems: DiaryItem[] = dedupedRollups.map<SlackRollupItem>((r) => {
      const m = memberById.get(r.member_id);
      const md = r.metadata ?? {};
      return {
        kind: 'slack_rollup',
        id: r.id,
        member_id: r.member_id,
        member_name: m?.name ?? 'Liderado removido',
        member_avatar: m?.avatar ?? null,
        title: r.title ?? 'Atividade no Slack',
        summary: r.summary ?? '',
        leader_edited_summary: r.leader_edited_summary,
        occurred_at: r.occurred_at,
        highlights: Array.isArray(md.highlights) ? md.highlights : [],
        ai_assessment: md.ai_assessment ?? null,
        themes: Array.isArray(md.themes) ? md.themes : [],
        top_channels: Array.isArray(md.top_channels) ? md.top_channels : [],
        top_collaborators: Array.isArray(md.top_collaborators) ? md.top_collaborators : [],
        evidence_count: typeof md.evidence_count === 'number' ? md.evidence_count : 0,
        window_start: md.window_start ?? null,
        window_end: md.window_end ?? null,
      };
    });

    // Slack rollups só aparecem em 'all' ou 'slack'. Demais origens escondem rollups.
    const includeSlack = source === 'all' || source === 'slack';
    const includeFeedbacks = source !== 'slack';
    const all: DiaryItem[] = [
      ...(includeFeedbacks ? fbItems : []),
      ...(includeSlack ? slackItems : []),
    ];
    all.sort((a, b) => {
      const ta = new Date(
        isSlackRollup(a) ? a.occurred_at : a.occurred_at || a.created_at,
      ).getTime();
      const tb = new Date(
        isSlackRollup(b) ? b.occurred_at : b.occurred_at || b.created_at,
      ).getTime();
      return sort === 'newest' ? tb - ta : ta - tb;
    });
    return all;
  }, [feedbacks, slackRollups, memberId, teamId, query, members, memberById, selectedTags, source, dateRange, sort]);

  const buckets = useMemo(() => {
    const today: DiaryItem[] = [];
    const week: DiaryItem[] = [];
    const older: DiaryItem[] = [];
    items.forEach((it) => {
      const dIso = isSlackRollup(it) ? it.occurred_at : it.occurred_at || it.created_at;
      const d = new Date(dIso);
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
    setPrefillContent(undefined);
    setPrefillTitle(undefined);
    setNoteDialogOpen(true);
  };

  const handleCopyRollupToMember = ({ content, title }: { content: string; title: string }) => {
    setPresetMemberId(undefined);
    setPrefillContent(content);
    setPrefillTitle(title);
    setNoteDialogOpen(true);
  };

  const onNoteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['diario-feedbacks'] });
    queryClient.invalidateQueries({ queryKey: ['team-members'] });
  };

  const presetMember = presetMemberId ? memberById.get(presetMemberId) : undefined;
  const total = items.length;
  const selectedMemberName =
    memberId !== 'all' ? memberById.get(memberId)?.name : undefined;

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <header className="min-w-0">
        <h1 className="font-serif text-2xl font-bold tracking-tight">Diário de Bordo</h1>
        <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          Suas evidências privadas sobre o time, em um só lugar.
        </p>
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
            setPrefillContent(undefined);
            setPrefillTitle(undefined);
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
        source={source}
        dateRange={dateRange}
        sort={sort}
        onMemberChange={(v) => updateParam('member', v)}
        onTeamChange={(v) => updateParam('team', v)}
        onPeriodChange={(v) => updateParam('period', v)}
        onQueryChange={(v) => updateParam('q', v)}
        onTagsChange={(tags) => updateParam('tags', tags.join(','))}
        onSourceChange={(v) => updateParam('source', v === 'all' ? '' : v)}
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
          <Inbox className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
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
                <FeedSection
                  key={s.title}
                  title={s.title}
                  items={s.items}
                  onCopyRollupToMember={handleCopyRollupToMember}
                />
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
        members={members.map((m) => ({ id: m.id, name: m.name }))}
        onSuccess={onNoteSuccess}
        initialContent={prefillContent}
        initialTitle={prefillTitle}
      />

    </div>
  );
}

function FeedSection({
  title,
  items,
  onCopyRollupToMember,
}: {
  title: string;
  items: DiaryItem[];
  onCopyRollupToMember: (payload: { content: string; title: string }) => void;
}) {
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2.5">
        {title}{' '}
        <span className="text-muted-foreground font-normal normal-case tracking-normal">
          · {items.length}
        </span>
      </h2>
      <div className="space-y-1.5">
        {items.map((it) =>
          isSlackRollup(it) ? (
            <SlackRollupFeedItem key={it.id} item={it} onCopyToMember={onCopyRollupToMember} />
          ) : (
            <DiaryFeedItem key={it.id} item={it} />
          ),
        )}
      </div>
    </section>
  );
}
