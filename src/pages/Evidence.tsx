import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Inbox, ArrowLeft } from 'lucide-react';
import { useEvidence, useEvidenceMutations, type EvidenceStatus, type EvidenceCategory } from '@/hooks/useEvidence';
import { EvidenceCard } from '@/components/evidence/EvidenceCard';
import { EvidenceFilters } from '@/components/evidence/EvidenceFilters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSlackConnection } from '@/hooks/useSlackConnection';
import { SlackIcon } from '@/components/icons/SlackIcon';

export default function Evidence() {
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
      if (e.member && !map.has(e.member.id)) map.set(e.member.id, { id: e.member.id, name: e.member.name });
    }
    return Array.from(map.values());
  }, [evidences]);

  const uniqueMembersCount = members.length;
  const busy = dismiss.isPending || convertToFeedback.isPending;

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id); else n.delete(id);
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

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" />
              Evidências do Slack
            </h1>
            <p className="text-muted-foreground mt-2 tracking-tight">
              {isLoading ? 'Carregando…' : `${evidences.length} ${status === 'pending' ? 'pendentes' : 'no filtro'} · ${uniqueMembersCount} liderado${uniqueMembersCount === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Slack not connected gate */}
      {!slackConnected && (
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center mb-6">
          <SlackIcon className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold tracking-tight mb-2">Conecte o Slack para começar</h2>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            O Rhitmo captura evidências do dia-a-dia do seu time direto dos canais do Slack onde o bot estiver presente. Sem ruído, sem invadir DMs.
          </p>
          <Link to="/slack/connect">
            <Button className="rounded-xl">Conectar Slack</Button>
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
        <EvidenceFilters
          status={status}
          category={category}
          memberId={memberId}
          members={members}
          onStatusChange={(s) => { setStatus(s); clearSelection(); }}
          onCategoryChange={(c) => { setCategory(c); clearSelection(); }}
          onMemberChange={(m) => { setMemberId(m); clearSelection(); }}
        />

        {selected.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selected.size} selecionada{selected.size === 1 ? '' : 's'}</span>
            <Button size="sm" variant="default" disabled={busy} onClick={handleBulkConvert} className="rounded-xl">
              Virar notas
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={handleBulkDismiss} className="rounded-xl">
              Dispensar
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection} className="rounded-xl">
              Limpar
            </Button>
          </div>
        ) : (
          evidences.length > 0 && (
            <Button size="sm" variant="ghost" onClick={selectAll} className="rounded-xl text-muted-foreground">
              Selecionar todas
            </Button>
          )
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : evidences.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card p-12 text-center">
          <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold tracking-tight mb-1">
            {status === 'pending' ? 'Nada pendente por aqui' : 'Nenhuma evidência neste filtro'}
          </h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            {status === 'pending'
              ? 'O classificador roda diariamente às 3h. Novas evidências aparecem aqui assim que forem capturadas.'
              : 'Tente outro status ou categoria.'}
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
