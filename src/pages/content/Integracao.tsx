import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { ContentLayout, TrialCta } from '@/components/content/ContentLayout';
import { ConnectorLogo } from '@/components/brand/ConnectorLogo';
import { CATEGORY_LABEL } from '@/lib/connectorsCatalog';
import { INTEGRATIONS, integrationBySlug } from '@/content/integracoes';
import { statusLabel } from './Integracoes';

export default function Integracao() {
  const { slug } = useParams();
  const it = integrationBySlug(slug);
  if (!it) return <Navigate to="/integracoes" replace />;
  const url = `https://rhitmo.co/integracoes/${it.slug}`;
  const others = INTEGRATIONS.filter((o) => o.slug !== it.slug && o.entry.kind !== 'coming_soon').slice(0, 3);

  return (
    <ContentLayout>
      <Helmet>
        <title>{it.seoTitle} | Rhitmo</title>
        <meta name="description" content={it.description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={it.seoTitle} />
        <meta property="og:description" content={it.description} />
        <meta property="og:url" content={url} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Integrações', item: 'https://rhitmo.co/integracoes' },
            { '@type': 'ListItem', position: 2, name: it.entry.label, item: url },
          ],
        })}</script>
      </Helmet>

      <article className="mx-auto max-w-5xl px-6 pt-14">
        <nav className="text-xs text-muted-foreground" aria-label="Trilha">
          <Link to="/integracoes" className="hover:text-foreground">Integrações</Link> <span aria-hidden>/</span> {it.entry.label}
        </nav>

        <div className="mt-8 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card p-3 shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
            <ConnectorLogo id={it.entry.id} fallback={it.entry.mono} />
          </span>
          <div className="text-xs text-muted-foreground">
            <p>{CATEGORY_LABEL[it.entry.category]}</p>
            <p className="mt-1 font-medium text-primary">{statusLabel(it.entry.kind, it.entry.tag)}</p>
          </div>
        </div>
        <h1 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Rhitmo + {it.entry.label}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{it.description}</p>

        <div className="mt-12 grid gap-4 md:grid-cols-5">
          <section className="rounded-3xl bg-card p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] md:col-span-3">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Como funciona</h2>
            <ul className="mt-5 space-y-4">
              {it.howItWorks.map((p) => (
                <li key={p} className="flex gap-3 leading-relaxed text-foreground/85"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{p}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-3xl bg-muted/40 p-8 md:col-span-2">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Configure</h2>
            <ol className="mt-5 space-y-4">
              {it.steps.map((s, n) => (
                <li key={s} className="flex gap-3 text-sm leading-relaxed">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">{n + 1}</span>{s}
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-3xl bg-card p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] md:col-span-3">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Para que serve</h2>
            <ul className="mt-5 space-y-3">
              {it.useCases.map((u) => <li key={u} className="text-foreground/85">{u}</li>)}
            </ul>
            {it.entry.note && <p className="mt-5 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">{it.entry.note}</p>}
          </section>
          <section className="rounded-3xl bg-primary/10 p-8 md:col-span-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-serif text-xl font-bold tracking-tight">Privado por padrão</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">
              Notas e transcrições são só do líder. O liderado vê apenas o que você compartilha. Dados isolados por empresa.
            </p>
            <Link to="/confianca" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Central de confiança <ArrowRight className="h-4 w-4" /></Link>
          </section>
        </div>

        <div className="mt-16"><TrialCta /></div>

        {others.length > 0 && (
          <section className="mt-16">
            <h2 className="font-serif text-xl font-bold tracking-tight">Outras integrações</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {others.map((o) => (
                <Link key={o.slug} to={`/integracoes/${o.slug}`} className="flex items-center gap-3 rounded-2xl bg-card p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1">
                  <span className="h-8 w-8 shrink-0"><ConnectorLogo id={o.entry.id} fallback={o.entry.mono} /></span>
                  <span className="font-semibold tracking-tight">{o.entry.label}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </ContentLayout>
  );
}
