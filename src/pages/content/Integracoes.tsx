import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Search } from 'lucide-react';
import { ContentLayout, TrialCta } from '@/components/content/ContentLayout';
import { ConnectorLogo } from '@/components/brand/ConnectorLogo';
import { CATEGORY_LABEL, type ConnectorCategory } from '@/lib/connectorsCatalog';
import { INTEGRATIONS } from '@/content/integracoes';
import { cn } from '@/lib/utils';

const URL = 'https://rhitmo.co/integracoes';
const DESC = 'Conecte Granola, Fireflies, tl;dv, Fathom, Google Meet, Google Agenda e Slack à Rhitmo. Suas reuniões viram evidência para 1:1s e avaliações.';
type Filter = 'all' | ConnectorCategory;

export function statusLabel(kind: string, tag?: string) {
  if (kind === 'coming_soon') return 'Em breve';
  return tag ?? 'Disponível';
}

export default function Integracoes() {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const list = useMemo(() => INTEGRATIONS.filter((i) =>
    (filter === 'all' || i.entry.category === filter) &&
    (!q || `${i.entry.label} ${i.entry.tagline}`.toLowerCase().includes(q.toLowerCase()))), [filter, q]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Todas' },
    ...(Object.keys(CATEGORY_LABEL) as ConnectorCategory[]).map((id) => ({ id, label: CATEGORY_LABEL[id] })),
  ];

  return (
    <ContentLayout>
      <Helmet>
        <title>Integrações | Rhitmo</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Integrações | Rhitmo" />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={URL} />
      </Helmet>

      <div className="mx-auto max-w-5xl px-6 pt-14">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Integrações</p>
        <h1 className="mt-2 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          A Rhitmo trabalha com as ferramentas que seu time já usa
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{DESC}</p>

        <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={cn('rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                  filter === f.id ? 'bg-slate-900 text-white' : 'bg-muted/50 text-muted-foreground hover:text-foreground')}>
                {f.label}
              </button>
            ))}
          </div>
          <label className="relative md:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar integração" aria-label="Buscar integração"
              className="w-full rounded-xl border border-border/60 bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((i) => (
            <Link key={i.slug} to={`/integracoes/${i.slug}`}
              className="group flex flex-col rounded-3xl bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1">
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 p-2.5">
                  <ConnectorLogo id={i.entry.id} fallback={i.entry.mono} />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              </div>
              <p className="mt-5 font-semibold tracking-tight">{i.entry.label}</p>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{i.entry.tagline}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-medium">
                <span className={cn('rounded-full px-2.5 py-1', i.entry.kind === 'coming_soon' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-slate-900')}>
                  {statusLabel(i.entry.kind, i.entry.tag)}
                </span>
                {i.entry.savesBotHours && <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Sem bot na reunião</span>}
              </div>
            </Link>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma integração encontrada.</p>}
        </div>

        <div className="mt-16"><TrialCta title="Conecte em dois minutos e veja suas reuniões virarem evidência." /></div>
      </div>
    </ContentLayout>
  );
}
