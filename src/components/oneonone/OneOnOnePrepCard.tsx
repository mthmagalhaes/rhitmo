// Sprint 12 — Deterministic 1:1 prep card. Surfaces up to 3 recent
// context_evidence rows for the selected member as suggested talking points.
// Uses RPC `get_team_timeline` (workspace + leader scoped) via useTeamTimeline.
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTeamTimeline } from '@/hooks/useTeamTimeline';
import { getSourceMeta } from '@/components/context/sourceMeta';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OneOnOnePrepCardProps {
  workspaceId: string | null;
  memberId: string;
  onAdd: (text: string) => void;
}

export function OneOnOnePrepCard({ workspaceId, memberId, onAdd }: OneOnOnePrepCardProps) {
  const { data, isLoading } = useTeamTimeline({
    workspaceId,
    memberIds: [memberId],
    pageSize: 10,
    enabled: !!workspaceId && !!memberId,
  });

  const rows = (data?.pages.flat() ?? []).slice(0, 3);

  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
      <header className="flex items-center gap-2 mb-3">
        <div className="rounded-lg bg-primary/10 p-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-serif text-sm font-bold tracking-tight">
            Sugestões da Rhitmo
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Tópicos derivados das evidências recentes deste liderado.
          </p>
        </div>
      </header>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-3">Carregando contexto…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3">
          Sem evidências recentes ainda. Registre uma 1:1, conecte o calendário ou peça um Pulse para começar.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const meta = getSourceMeta(r.source_table);
            const Icon = meta.icon;
            const when = formatDistanceToNow(new Date(r.occurred_at), {
              addSuffix: true,
              locale: ptBR,
            });
            const text = r.title?.trim() || r.summary?.trim() || meta.label;
            return (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-xl bg-background/70 border border-border/50 p-2.5"
              >
                <span
                  className={`shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-md ${meta.badgeClass}`}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground line-clamp-2">
                    {text}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {meta.label} · {when}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 rounded-lg gap-1 text-[11px]"
                  onClick={() => onAdd(text)}
                >
                  <Plus className="h-3 w-3" />
                  Pauta
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
