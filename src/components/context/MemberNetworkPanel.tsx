// Sprint 19 — Mapa do liderado: top colaboradores + temas em foco.
// Lê team_network_edges (peso agregado 30d) e slack_ambient_evidence (theme_tags).
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Users, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WINDOW_DAYS = 30;

function useTopCollaborators(memberId: string | null, workspaceId: string | null) {
  return useQuery({
    queryKey: ['member-collaborators', memberId, workspaceId, WINDOW_DAYS],
    enabled: !!memberId && !!workspaceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('team_network_edges')
        .select('member_a_id, member_b_id, weight_total, weight_breakdown, last_event_at')
        .eq('workspace_id', workspaceId)
        .eq('window_days', WINDOW_DAYS)
        .or(`member_a_id.eq.${memberId},member_b_id.eq.${memberId}`)
        .order('weight_total', { ascending: false })
        .limit(20);
      if (error) throw error;
      const rows = (data ?? []) as Array<any>;
      const peers = rows.map((r) => {
        const peerId = r.member_a_id === memberId ? r.member_b_id : r.member_a_id;
        return {
          peer_id: peerId as string,
          weight_total: Number(r.weight_total ?? 0),
          breakdown: r.weight_breakdown ?? {},
          last_event_at: r.last_event_at as string | null,
        };
      });
      // resolve nomes
      const ids = peers.map((p) => p.peer_id);
      if (ids.length === 0) return [];
      const { data: members } = await supabase
        .from('team_members')
        .select('id, name')
        .in('id', ids);
      const nameById = new Map((members ?? []).map((m) => [m.id, m.name as string]));
      return peers.map((p) => ({ ...p, name: nameById.get(p.peer_id) ?? 'Membro' }));
    },
  });
}

function useTopThemes(memberId: string | null) {
  return useQuery({
    queryKey: ['member-themes', memberId, WINDOW_DAYS],
    enabled: !!memberId,
    queryFn: async () => {
      const since = new Date(Date.now() - WINDOW_DAYS * 86400 * 1000).toISOString();
      const { data, error } = await supabase
        .from('slack_ambient_evidence')
        .select('theme_tags, executive_summary, thread_topic, captured_at, status')
        .eq('member_id', memberId!)
        .in('status', ['approved', 'converted_to_feedback'])
        .gte('captured_at', since)
        .limit(500);
      if (error) throw error;
      const tagCounts = new Map<string, number>();
      const topics: { topic: string; at: string }[] = [];
      for (const row of (data ?? []) as any[]) {
        const tags = (row.theme_tags ?? []) as string[];
        for (const t of tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
        if (row.thread_topic) topics.push({ topic: row.thread_topic, at: row.captured_at });
      }
      const ranked = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([tag, count]) => ({ tag, count }));
      return { tags: ranked, topics: topics.slice(0, 8) };
    },
  });
}

export function MemberNetworkPanel() {
  const { workspaceId } = useAccount();
  const { members, loading } = useLeaderMembers();
  const [memberId, setMemberId] = useState<string | null>(null);

  const activeMember = useMemo(
    () => members?.find((m) => m.id === memberId) ?? members?.[0] ?? null,
    [members, memberId],
  );
  const effectiveMemberId = activeMember?.id ?? null;

  const { data: collaborators = [], isLoading: loadingPeers } = useTopCollaborators(
    effectiveMemberId,
    workspaceId,
  );
  const { data: themesData, isLoading: loadingThemes } = useTopThemes(effectiveMemberId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Você ainda não tem liderados cadastrados.
      </div>
    );
  }

  const maxWeight = collaborators.reduce((acc, c) => Math.max(acc, c.weight_total), 0) || 1;

  return (
    <div className="space-y-5">
      {/* Member picker */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Liderado</span>
        <Select value={effectiveMemberId ?? undefined} onValueChange={(v) => setMemberId(v)}>
          <SelectTrigger className="w-[260px] rounded-xl">
            <SelectValue placeholder="Escolha um liderado" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">Últimos {WINDOW_DAYS} dias</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top colaboradores */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-serif text-lg font-semibold tracking-tight">Com quem mais interage</h3>
          </div>
          {loadingPeers ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Sem sinais de colaboração nesta janela.
            </p>
          ) : (
            <ul className="space-y-3">
              {collaborators.slice(0, 8).map((c) => {
                const pct = Math.round((c.weight_total / maxWeight) * 100);
                const bd = c.breakdown as Record<string, number> | null;
                const chips: string[] = [];
                if (bd) {
                  if ((bd.slack_dm ?? 0) > 0) chips.push('DM');
                  if ((bd.slack_thread_reply ?? 0) > 0) chips.push('thread');
                  if ((bd.slack_mention ?? 0) > 0) chips.push('@');
                  if ((bd.slack_reaction ?? 0) > 0) chips.push('reação');
                  if ((bd.gcal ?? 0) > 0) chips.push('reuniões');
                }
                return (
                  <li key={c.peer_id} className="flex items-center gap-3">
                    <MemberAvatar memberId={c.peer_id} memberName={c.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {c.weight_total.toFixed(1)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {chips.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {chips.map((ch) => (
                            <span
                              key={ch}
                              className="text-[10px] rounded-md bg-muted/60 px-1.5 py-0.5 text-muted-foreground"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Temas em foco */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-serif text-lg font-semibold tracking-tight">Temas em foco</h3>
          </div>
          {loadingThemes ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !themesData || (themesData.tags.length === 0 && themesData.topics.length === 0) ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Ainda sem temas extraídos. À medida que sinais do Slack chegam, eles aparecem aqui.
            </p>
          ) : (
            <div className="space-y-4">
              {themesData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {themesData.tags.map((t) => (
                    <span
                      key={t.tag}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/8 px-2 py-1 text-xs text-primary"
                    >
                      <span className="font-medium">#{t.tag}</span>
                      <span className="text-[10px] text-primary/70 tabular-nums">{t.count}</span>
                    </span>
                  ))}
                </div>
              )}
              {themesData.topics.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                    Últimas threads
                  </p>
                  <ul className="space-y-1.5">
                    {themesData.topics.map((t, i) => (
                      <li key={i} className="text-sm text-foreground/85">· {t.topic}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
