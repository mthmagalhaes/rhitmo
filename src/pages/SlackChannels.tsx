import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Hash, Loader2 } from 'lucide-react';
import { useSlackChannels, useSlackChannelMutations } from '@/hooks/useSlackChannels';
import { ChannelRow } from '@/components/slack/ChannelRow';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useSlackConnection } from '@/hooks/useSlackConnection';
import { SlackIcon } from '@/components/icons/SlackIcon';

type FilterTab = 'all' | 'monitoring' | 'available' | 'private';

export default function SlackChannels() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');

  const { data, isLoading, error } = useSlackChannels();
  const { toggleExclude, updateAutojoin, joinChannel } = useSlackChannelMutations();
  const { isConnected: slackConnected } = useSlackConnection();

  const channels = data?.channels ?? [];
  const settings = data?.settings;
  const busy = toggleExclude.isPending || updateAutojoin.isPending || joinChannel.isPending;

  const filtered = useMemo(() => {
    let list = channels;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (tab === 'monitoring') list = list.filter((c) => c.is_member && !c.is_excluded);
    else if (tab === 'available') list = list.filter((c) => !c.is_member && !c.is_private);
    else if (tab === 'private') list = list.filter((c) => c.is_private);
    return list.sort((a, b) => {
      // Monitorando primeiro, depois disponíveis, depois resto
      const aRank = a.is_member && !a.is_excluded ? 0 : !a.is_member && !a.is_private ? 1 : 2;
      const bRank = b.is_member && !b.is_excluded ? 0 : !b.is_member && !b.is_private ? 1 : 2;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });
  }, [channels, search, tab]);

  const counts = useMemo(
    () => ({
      monitoring: channels.filter((c) => c.is_member && !c.is_excluded).length,
      available: channels.filter((c) => !c.is_member && !c.is_private).length,
      total: channels.length,
    }),
    [channels],
  );

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/evidence"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Evidências
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
          <Hash className="h-7 w-7 text-primary" />
          Canais do Slack
        </h1>
        <p className="text-muted-foreground mt-2 tracking-tight">
          Escolha o que o Rhitmo deve observar para capturar evidências de performance.
        </p>
      </div>

      {/* Slack not connected */}
      {!slackConnected && (
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center mb-6">
          <SlackIcon className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold tracking-tight mb-2">Conecte o Slack primeiro</h2>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Para gerenciar canais monitorados, conecte sua conta do Slack ao Rhitmo.
          </p>
          <Link to="/slack/connect">
            <Button className="rounded-xl">Conectar Slack</Button>
          </Link>
        </div>
      )}

      {slackConnected && (
        <>
          {/* Modo geral */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="autojoin" className="font-semibold tracking-tight">
                  Entrar automaticamente em canais públicos
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {settings?.autojoin_public_channels
                    ? 'O Rhitmo entra sozinho em canais públicos novos para capturar evidências. Recomendado.'
                    : 'O Rhitmo só monitora canais onde foi convidado manualmente. Você tem controle total.'}
                </p>
              </div>
              <Switch
                id="autojoin"
                checked={settings?.autojoin_public_channels ?? true}
                disabled={busy || isLoading}
                onCheckedChange={(v) => updateAutojoin.mutate(v)}
              />
            </div>
          </div>

          {/* Busca + Filtros */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar canal por nome…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border-0 bg-muted/40 focus-visible:ring-1"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <FilterPill active={tab === 'all'} onClick={() => setTab('all')}>
                Todos ({counts.total})
              </FilterPill>
              <FilterPill active={tab === 'monitoring'} onClick={() => setTab('monitoring')}>
                Monitorando ({counts.monitoring})
              </FilterPill>
              <FilterPill active={tab === 'available'} onClick={() => setTab('available')}>
                Disponíveis ({counts.available})
              </FilterPill>
              <FilterPill active={tab === 'private'} onClick={() => setTab('private')}>
                Privados
              </FilterPill>
            </div>
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
              <p className="text-sm text-destructive font-medium">Erro ao carregar canais</p>
              <p className="text-xs text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Tente novamente em instantes.'}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-border/60 bg-card p-12 text-center">
              <Hash className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {search ? 'Nenhum canal encontrado.' : 'Nenhum canal neste filtro.'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              {busy && (
                <div className="flex items-center justify-center py-2 bg-muted/30 border-b border-border/40">
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  <span className="text-xs text-muted-foreground">Atualizando…</span>
                </div>
              )}
              {filtered.map((ch) => (
                <ChannelRow
                  key={ch.id}
                  channel={ch}
                  busy={busy}
                  onToggleExclude={(id, exclude) => toggleExclude.mutate({ channelId: id, exclude })}
                  onJoin={(id) => joinChannel.mutate(id)}
                />
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Dica: o Rhitmo nunca lê DMs ou conversas privadas. Só captura mensagens em canais onde está como membro.
          </p>
        </>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}
