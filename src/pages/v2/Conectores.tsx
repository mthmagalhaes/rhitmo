import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Check, Zap, Loader2, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useBillingStatus } from '@/hooks/useBillingStatus';
import { useNoteTaker } from '@/hooks/useNoteTaker';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useSlackConnection } from '@/hooks/useSlackConnection';
import { NoteTakerConnectorCard } from '@/components/settings/NoteTakerConnectorCard';
import { NOTE_TAKER_NO_CONNECTOR_NOTE } from '@/lib/noteTakerProviders';
import { CONNECTORS, CATEGORY_LABEL, type ConnectorCategory, type ConnectorEntry } from '@/lib/connectorsCatalog';

type Filter = 'all' | 'connected' | ConnectorCategory;
type Status = 'connected' | 'available' | 'soon' | 'error' | 'loading';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'connected', label: 'Conectados' },
  { id: 'note_takers', label: 'Note takers' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'comunicacao', label: 'Comunicação' },
];

/** Status de todos os conectores, num único lugar. */
function useStatuses(): Record<string, Status> {
  const granola = useNoteTaker('granola');
  const fireflies = useNoteTaker('fireflies');
  const tldv = useNoteTaker('tldv');
  const fathom = useNoteTaker('fathom');
  const meet = useNoteTaker('google_meet');
  const cal = useCalendarIntegration();
  const slack = useSlackConnection();
  const nt = (h: ReturnType<typeof useNoteTaker>): Status =>
    h.isLoading ? 'loading' : h.isConnected ? (h.connection?.last_error ? 'error' : 'connected') : 'available';
  return {
    granola: nt(granola),
    fireflies: nt(fireflies),
    tldv: nt(tldv),
    fathom: nt(fathom),
    google_meet: nt(meet),
    google_calendar: cal.checkingConnection ? 'loading' : cal.isConnected ? 'connected' : 'available',
    slack: slack.isLoading ? 'loading' : slack.isConnected ? 'connected' : 'available',
  };
}

function useInterest() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ['connector-interest'],
    queryFn: async () => {
      const { data } = await supabase.from('connector_interest' as never).select('connector_id');
      return ((data ?? []) as { connector_id: string }[]).map((r) => r.connector_id);
    },
  });
  const register = useMutation({
    mutationFn: async (connectorId: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Sessão expirada');
      const { error } = await supabase
        .from('connector_interest' as never)
        .insert({ user_id: u.user.id, connector_id: connectorId } as never);
      // 23505 = já registrado antes; tratar como sucesso.
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connector-interest'] });
      toast({ title: 'Anotado!', description: 'Avisamos você assim que esse conector estiver disponível.' });
    },
    onError: (e: Error) => toast({ title: 'Não deu certo', description: e.message, variant: 'destructive' }),
  });
  return { interested: new Set(data), register };
}

function StatusBadge({ status, entry }: { status: Status; entry: ConnectorEntry }) {
  if (status === 'loading') return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  if (status === 'connected')
    return <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10 border-none text-[10px]"><Check className="h-3 w-3" />Conectado</Badge>;
  if (status === 'error')
    return <Badge variant="destructive" className="gap-1 text-[10px]"><AlertTriangle className="h-3 w-3" />Atenção</Badge>;
  if (status === 'soon') return <Badge variant="outline" className="text-[10px]">{entry.tag === 'Beta' ? 'Beta' : 'Em breve'}</Badge>;
  return entry.tag ? <Badge variant="secondary" className="text-[10px]">{entry.tag}</Badge> : null;
}

function Tile({ entry, status, onOpen }: { entry: ConnectorEntry; status: Status; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col rounded-2xl bg-card p-4 text-left shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted font-serif text-sm font-bold tracking-tight text-foreground">
          {entry.mono}
        </span>
        <StatusBadge status={status} entry={entry} />
      </div>
      <p className="mt-3 font-semibold tracking-tight text-foreground">{entry.label}</p>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{entry.tagline}</p>
      {entry.savesBotHours && (
        <p className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary">
          <Zap className="h-3 w-3" /> Não gasta horas de bot
        </p>
      )}
    </button>
  );
}

function DetailSheet({
  entry, status, onClose, interested, onInterest, interestPending,
}: {
  entry: ConnectorEntry | null; status: Status; onClose: () => void;
  interested: boolean; onInterest: () => void; interestPending: boolean;
}) {
  const cal = useCalendarIntegration();
  const slack = useSlackConnection();
  return (
    <Sheet open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {entry && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted font-serif font-bold">{entry.mono}</span>
                <div>
                  <SheetTitle className="font-serif tracking-tight">{entry.label}</SheetTitle>
                  <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[entry.category]}</p>
                </div>
              </div>
              <SheetDescription className="pt-2">{entry.tagline}</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {entry.note && <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">{entry.note}</p>}

              {entry.kind === 'byok' && entry.providerId && <NoteTakerConnectorCard provider={entry.providerId} />}

              {entry.kind === 'google_meet' && (
                status === 'connected' || status === 'error' ? (
                  <NoteTakerConnectorCard provider="google_meet" />
                ) : (
                  <div className="space-y-3">
                    <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                      <li>Autorize a leitura das transcrições do Meet. A Rhitmo não acessa seu Drive.</li>
                      <li>Nas reuniões, ative a transcrição do Meet.</li>
                      <li>Ao fim da reunião, a transcrição entra em Anotações & Evidências.</li>
                    </ol>
                    <Button className="rounded-xl" onClick={() => cal.connectCalendar({ withMeet: true })}>Conectar com Google</Button>
                  </div>
                )
              )}

              {entry.kind === 'google_calendar' && (
                status === 'connected' ? (
                  <div className="space-y-3">
                    <p className="text-sm">Conectado{cal.connectionData?.calendar_email ? ` como ${cal.connectionData.calendar_email}` : ''}.</p>
                    <Button variant="outline" className="rounded-xl" onClick={() => cal.disconnectCalendar()}>Desconectar</Button>
                  </div>
                ) : (
                  <Button className="rounded-xl" onClick={() => cal.connectCalendar()}>Conectar com Google</Button>
                )
              )}

              {entry.kind === 'slack' && (
                status === 'connected' ? (
                  <div className="space-y-3">
                    <p className="text-sm">Slack conectado. Ajustes finos ficam em Configurações.</p>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="rounded-xl"><Link to="/lider/configuracoes?tab=integracoes">Ajustes</Link></Button>
                      <Button variant="ghost" className="rounded-xl" disabled={slack.isDisconnecting} onClick={() => slack.disconnectSlack()}>Desconectar</Button>
                    </div>
                  </div>
                ) : (
                  <Button className="rounded-xl" onClick={() => slack.connectSlack()}>Conectar Slack</Button>
                )
              )}

              {entry.kind === 'coming_soon' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Esse conector ainda não está liberado. Quer usar? Avisamos assim que entrar.</p>
                  <Button className="rounded-xl" disabled={interested || interestPending} onClick={onInterest}>
                    {interested ? <><Check className="mr-1 h-4 w-4" /> Você já pediu</> : 'Quero esse'}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Central de Conectores: tudo que a Rhitmo lê, num só lugar. */
export default function V2Conectores() {
  const { data: billing } = useBillingStatus();
  const inTrial = billing?.billingModel === 'v3' && billing.trialActive && !billing.hasSubscription;
  const statuses = useStatuses();
  const { interested, register } = useInterest();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const statusOf = (e: ConnectorEntry): Status => (e.kind === 'coming_soon' ? 'soon' : statuses[e.id] ?? 'available');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONNECTORS.filter((e) => {
      if (q && !`${e.label} ${e.tagline}`.toLowerCase().includes(q)) return false;
      if (filter === 'all') return true;
      if (filter === 'connected') return ['connected', 'error'].includes(statusOf(e));
      return e.category === filter;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filter, statuses]);

  const connected = CONNECTORS.filter((e) => ['connected', 'error'].includes(statusOf(e)));
  const categories: ConnectorCategory[] = ['note_takers', 'agenda', 'comunicacao'];
  const openEntry = CONNECTORS.find((e) => e.id === openId) ?? null;

  const grid = (items: ConnectorEntry[]) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((e) => <Tile key={e.id} entry={e} status={statusOf(e)} onOpen={() => setOpenId(e.id)} />)}
    </div>
  );

  const section = (title: string, items: ConnectorEntry[]) =>
    items.length > 0 && (
      <section key={title} className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="h-px w-6 bg-border" aria-hidden />
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{title} · {items.length}</h2>
        </div>
        {grid(items)}
      </section>
    );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Conectores</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Conecte o que você já usa</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Cada conversa importada vira evidência com data e origem. Menos digitação, mais resultado nas suas 1:1s e avaliações.
        </p>
      </header>

      {inTrial && (
        <div className="flex items-start gap-2 rounded-2xl bg-primary/10 p-4 text-sm text-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span><span className="font-semibold">Já usa um note taker?</span> Conecte e suas conversas viram evidência sem gastar as 6h de bot do seu teste.</span>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar app..." className="rounded-xl pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.id ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}{f.id === 'connected' && connected.length > 0 ? ` (${connected.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-muted/40 p-6 text-sm text-muted-foreground">Nenhum app encontrado.</p>
      ) : filter === 'all' && !query ? (
        <>
          {section('Conectados', connected)}
          {categories.map((c) => section(CATEGORY_LABEL[c], CONNECTORS.filter((e) => e.category === c)))}
        </>
      ) : (
        grid(visible)
      )}

      <Link
        to="/lider/diario"
        className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 p-4 text-sm transition-colors hover:bg-muted/60"
      >
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">Não achou o seu?</span> {NOTE_TAKER_NO_CONNECTOR_NOTE}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Link>

      <DetailSheet
        entry={openEntry}
        status={openEntry ? statusOf(openEntry) : 'available'}
        onClose={() => setOpenId(null)}
        interested={!!openEntry && interested.has(openEntry.id)}
        onInterest={() => openEntry && register.mutate(openEntry.id)}
        interestPending={register.isPending}
      />
    </div>
  );
}
