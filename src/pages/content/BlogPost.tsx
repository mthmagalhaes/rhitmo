import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { ContentLayout, TrialCta } from '@/components/content/ContentLayout';
import { POSTS, formatPostDate, postBySlug } from '@/content/blog';

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function BlogPost() {
  const { slug } = useParams();
  const post = postBySlug(slug);
  if (!post) return <Navigate to="/blog" replace />;
  const url = `https://rhitmo.co/blog/${post.slug}`;
  const toc = post.blocks.filter((b) => b.heading).map((b) => ({ id: slugify(b.heading!), title: b.heading! }));
  const others = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <ContentLayout>
      <Helmet>
        <title>{post.title} | Rhitmo</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.description,
          datePublished: post.date, inLanguage: 'pt-BR', mainEntityOfPage: url,
          author: { '@type': 'Person', name: post.author },
          publisher: { '@type': 'Organization', name: 'Rhitmo', url: 'https://rhitmo.co' },
        })}</script>
      </Helmet>

      <article className="mx-auto max-w-5xl px-6 pt-14">
        <nav className="text-xs text-muted-foreground" aria-label="Trilha">
          <Link to="/blog" className="hover:text-foreground">Blog</Link> <span aria-hidden>/</span> {post.category}
        </nav>
        <h1 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl">{post.title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{post.description}</p>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          {post.author} · {formatPostDate(post.date)} · <Clock className="h-3.5 w-3.5" /> {post.readingMinutes} min de leitura
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            {toc.length > 0 && (
              <div className="sticky top-24 rounded-2xl bg-muted/40 p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Neste artigo</p>
                <ol className="mt-3 space-y-2 text-sm">
                  {toc.map((t) => <li key={t.id}><a href={`#${t.id}`} className="text-muted-foreground hover:text-foreground">{t.title}</a></li>)}
                </ol>
              </div>
            )}
          </aside>

          <div className="min-w-0 max-w-2xl space-y-8">
            {post.blocks.map((b, i) => (
              <section key={i} id={b.heading ? slugify(b.heading) : undefined} className="scroll-mt-24">
                {b.heading && <h2 className="font-serif text-2xl font-bold tracking-tight md:text-3xl">{b.heading}</h2>}
                {b.paragraphs?.map((p, j) => <p key={j} className="mt-4 text-[17px] leading-relaxed text-foreground/85">{p}</p>)}
                {b.bullets && (
                  <ul className="mt-4 space-y-2">
                    {b.bullets.map((x, j) => (
                      <li key={j} className="flex gap-3 leading-relaxed text-foreground/85"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{x}</li>
                    ))}
                  </ul>
                )}
                {b.quote && (
                  <blockquote className="rounded-3xl bg-primary/10 p-7 font-serif text-xl leading-snug tracking-tight">{b.quote}</blockquote>
                )}
              </section>
            ))}

            {post.related && (
              <Link to={post.related.to} className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 p-5 transition-transform hover:-translate-y-1">
                <span className="font-semibold tracking-tight">{post.related.label}</span>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </Link>
            )}
          </div>
        </div>

        <div className="mt-16"><TrialCta /></div>

        {others.length > 0 && (
          <section className="mt-16">
            <h2 className="font-serif text-xl font-bold tracking-tight">Leia também</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {others.map((p) => (
                <Link key={p.slug} to={`/blog/${p.slug}`} className="rounded-2xl bg-card p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1">
                  <p className="text-xs font-medium text-primary">{p.category}</p>
                  <p className="mt-1 font-semibold tracking-tight">{p.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </ContentLayout>
  );
}
