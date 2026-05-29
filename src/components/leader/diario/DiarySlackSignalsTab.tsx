// Aba "Sinais do Slack" embutida em /lider/diario. Reusa a mesma lógica
// de /evidence (useEvidence + EvidenceCard + EvidenceFilters + mutations),
// sem header próprio — assume que o pai já mostra header/título.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Hash } from 'lucide-react';
import {
  useEvidence,
  useEvidenceMutations,
  type EvidenceStatus,
  type EvidenceCategory,
} from '@/hooks/useEvidence';
import { EvidenceCard } from '@/components/evidence/EvidenceCard';
import { EvidenceFilters } from '@/components/evidence/EvidenceFilters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSlackConnection } from '@/hooks/useSlackConnection';
import { SlackIcon } from '@/components/icons/SlackIcon';

export function DiarySlackSignalsTab() {
  const [status, setStatus] = useState<EvidenceStatus | 'all'>('pending');
  const [category, setCategory] = useState<EvidenceCategory | 'all'>('all');
  const [memberId, setMemberId] = useState<string | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: evidences = [], isLoading } = useEvidence({ status, memberId, category });
  const { dismiss, convertToFeedback } = useEvidenceMutations();
  const { isConnected: slackConnected } = useSlackConnection();

  const members = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const e of evidences) {
      if (e.member && !map.has(e.member.id)) {
        map.set(e.member.id, { id: e.member.id, name: e.member.name });
      }
    }
    return Array.from(map.values());
  }, [evidences]);

  const busy = dismiss.isPending || convertToFeedback.isPending;

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  };
  const selectAll = () => setSelected(new Set(evidences.map((e) => e.id)));
  const clearSelection = () => setSelected(new Set());

  const handleBulkConvert = async () => {
    if (selected.size === 0) return;
    const items = evidences.filter((e) => selected.has(e.id));
    await Promise.all(items.map((ev) => convertToFeedback.mutateAsync(ev)));
    clearSelection();
  };
  const handleBulkDismiss = async () => {
    if (selected.size === 0) return;
    await dismiss.mutateAsync(Array.from(selected));
    clearSelection();
  };

  if (!slackConnected) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-8 text-center">
        <SlackIcon className="h-10 w-10 mx-auto mb-3" />
        <h3 className="text-base font-bold tracking-tight mb-1">
          Conecte o Slack para receber sinais
        </h3>
        <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
          A Rhitmo captura evidências dos canais públicos onde o bot estiver,
          sem invadir DMs ou canais privados.
        </p>
        <Link to="/slack/connect">
          <Button className="rounded-xl">Conectar Slack</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header da aba — filtros + ações + link "Gerenciar canais" */}
      <div className="rounded-2xl border border-border bg-muted/30 p-3 flex items-center justify-between flex-wrap gap-3">
        <EvidenceFilters
          status={status}
          category={category}
          memberId={memberId}
          members={members}
          onStatusChange={(s) => { setStatus(s); clearSelection(); }}
          onCategoryChange={(c) => { setCategory(c); clearSelection(); }}
          onMemberChange={(m) => { setMemberId(m); clearSelection(); }}
        />

        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <span className="text-xs text-muted-foreground">
                {selected.size} selecionada{selected.size === 1 ? '' : 's'}
              </span>
              <Button size="sm" disabled={busy} onClick={handleBulkConvert} className="rounded-xl">
                Virar notas
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={handleBulkDismiss} className="rounded-xl">
                Dispensar
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection} className="rounded-xl">
                Limpar
              </Button>
            </>
          ) : (
            <>
              {evidences.length > 0 && (
                <Button size="sm" variant="ghost" onClick={selectAll} className="rounded-xl text-muted-foreground text-xs">
                  Selecionar todas
                </Button>
              )}
              <Link to="/slack/channels">
                <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground text-xs gap-1">
                  <Hash className="h-3.5 w-3.5" /> Gerenciar canais
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : evidences.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-transparent p-10 text-center">
          <Inbox className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold tracking-tight mb-1">
            {status === 'pending' ? 'Nada pendente por aqui' : 'Nenhuma evidência neste filtro'}
          </h3>
          <p className="text-muted-foreground text-xs max-w-sm mx-auto">
            {status === 'pending'
              ? 'O classificador roda diariamente às 3h. Novos sinais aparecem aqui assim que forem capturados.'
              : 'Tente outro status, categoria ou liderado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {evidences.map((ev) => (
            <EvidenceCard
              key={ev.id}
              evidence={ev}
              selected={selected.has(ev.id)}
              onSelect={toggleSelect}
              onDismiss={(id) => dismiss.mutate([id])}
              onConvert={(e) => convertToFeedback.mutate(e)}
              busy={busy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
