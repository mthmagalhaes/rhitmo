import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { ContentLayout, TrialCta } from '@/components/content/ContentLayout';
import { guideBySlug, GUIDES } from '@/content/guias';

export default function Guia() {
  const { slug } = useParams();
  const guide = guideBySlug(slug);
  if (!guide) return <Navigate to="/recursos" replace />;
  const url = `https://rhitmo.co/guias/${guide.slug}`;
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <ContentLayout>
      <Helmet>
        <title>{guide.seoTitle} | Rhitmo</title>
        <meta name="description" content={guide.description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={guide.seoTitle} />
        <meta property="og:description" content={guide.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org', '@type': 'Article', headline: guide.title, description: guide.description,
          inLanguage: 'pt-BR', mainEntityOfPage: url, author: { '@type': 'Organization', name: 'Rhitmo' },
          publisher: { '@type': 'Organization', name: 'Rhitmo', url: 'https://rhitmo.co' },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org', '@type': 'FAQPage',
          mainEntity: guide.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        })}</script>
      </Helmet>

      <article className="mx-auto max-w-5xl px-6 pt-14">
        <nav className="text-xs text-muted-foreground" aria-label="Trilha">
          <Link to="/recursos" className="hover:text-foreground">Recursos</Link> <span aria-hidden>/</span> Guias
        </nav>
        <p className="mt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">{guide.eyebrow}</p>
        <h1 className="mt-2 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl">{guide.title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{guide.intro}</p>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {guide.readingMinutes} min de leitura</p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl bg-muted/40 p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Neste guia</p>
              <ol className="mt-3 space-y-2 text-sm">
                {guide.sections.map((s) => (
                  <li key={s.id}><a href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">{s.title}</a></li>
                ))}
                <li><a href="#perguntas" className="text-muted-foreground hover:text-foreground">Perguntas frequentes</a></li>
              </ol>
            </div>
          </aside>

          <div className="min-w-0 max-w-2xl space-y-12">
            {guide.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="font-serif text-2xl font-bold tracking-tight md:text-3xl">{s.title}</h2>
                {s.paragraphs?.map((p, j) => <p key={j} className="mt-4 leading-relaxed text-foreground/85">{p}</p>)}
                {s.bullets && (
                  <ul className="mt-4 space-y-2">
                    {s.bullets.map((b, j) => (
                      <li key={j} className="flex gap-3 leading-relaxed text-foreground/85"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{b}</li>
                    ))}
                  </ul>
                )}
                {s.examples && (
                  <div className="mt-5 grid gap-3">
                    {s.examples.map((ex, j) => (
                      <div key={j} className="rounded-2xl bg-card p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{ex.label}</p>
                        <p className="mt-1 text-sm leading-relaxed">{ex.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                {i === 1 && (
                  <Link to="/ferramentas/gerador-avaliacao-desempenho" className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-primary/10 p-5 transition-transform hover:-translate-y-1">
                    <span>
                      <span className="block font-semibold tracking-tight">Gerador grátis de avaliação de desempenho</span>
                      <span className="text-sm text-muted-foreground">Informe alguns fatos e receba um rascunho estruturado e sem vieses.</span>
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
                  </Link>
                )}
              </section>
            ))}

            <Link to="/modelos/avaliacao-de-desempenho" className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 p-5 transition-transform hover:-translate-y-1">
              <span>
                <span className="block font-semibold tracking-tight">Modelo de avaliação de desempenho</span>
                <span className="text-sm text-muted-foreground">Competências, escala, evidências e roteiro de conversa, prontos para usar.</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </Link>

            <section id="perguntas" className="scroll-mt-24">
              <h2 className="font-serif text-2xl font-bold tracking-tight md:text-3xl">Perguntas frequentes</h2>
              <div className="mt-5 space-y-3">
                {guide.faq.map((f) => (
                  <details key={f.q} className="rounded-2xl bg-card p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                    <summary className="cursor-pointer font-semibold tracking-tight">{f.q}</summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="mt-16"><TrialCta /></div>

        <section className="mt-16">
          <h2 className="font-serif text-xl font-bold tracking-tight">Leia também</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {others.map((g) => (
              <Link key={g.slug} to={`/guias/${g.slug}`} className="rounded-2xl bg-card p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1">
                <p className="font-semibold tracking-tight">{g.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </ContentLayout>
  );
}
