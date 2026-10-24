import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { ContentLayout, TrialCta } from '@/components/content/ContentLayout';
import { BLOG_CATEGORIES, POSTS, formatPostDate, type BlogCategory } from '@/content/blog';
import { cn } from '@/lib/utils';

const URL = 'https://rhitmo.co/blog';
const DESC = 'Ideias práticas sobre 1:1, avaliação de desempenho, PDI e liderança baseada em evidência, do time da Rhitmo.';

export default function Blog() {
  const [cat, setCat] = useState<BlogCategory | 'all'>('all');
  const sorted = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  const featured = sorted.find((p) => p.featured) ?? sorted[0];
  const rest = sorted.filter((p) => p !== featured && (cat === 'all' || p.category === cat));
  const showFeatured = cat === 'all' || featured.category === cat;

  return (
    <ContentLayout>
      <Helmet>
        <title>Blog | Rhitmo</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Blog | Rhitmo" />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={URL} />
      </Helmet>

      <div className="mx-auto max-w-5xl px-6 pt-14">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Blog</p>
        <h1 className="mt-2 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl">Liderança com menos improviso</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{DESC}</p>

        <div className="mt-10 flex flex-wrap gap-2">
          {(['all', ...BLOG_CATEGORIES] as const).map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={cn('rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                cat === c ? 'bg-foreground text-background' : 'bg-muted/50 text-muted-foreground hover:text-foreground')}>
              {c === 'all' ? 'Todos' : c}
            </button>
          ))}
        </div>

        {showFeatured && (
          <Link to={`/blog/${featured.slug}`} className="mt-8 block rounded-3xl bg-foreground p-8 text-background transition-transform hover:-translate-y-1 md:p-12">
            <p className="text-xs uppercase tracking-[0.18em] opacity-70">Destaque · {featured.category}</p>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl font-bold leading-tight tracking-tight md:text-4xl">{featured.title}</h2>
            <p className="mt-4 max-w-2xl opacity-80">{featured.description}</p>
            <p className="mt-6 text-xs opacity-70">{featured.author} · {formatPostDate(featured.date)} · {featured.readingMinutes} min</p>
          </Link>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {rest.map((p) => (
            <Link key={p.slug} to={`/blog/${p.slug}`} className="flex flex-col rounded-3xl bg-card p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1">
              <p className="text-xs font-medium text-slate-900">{p.category}</p>
              <h2 className="mt-2 font-serif text-xl font-bold leading-snug tracking-tight">{p.title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
              <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {formatPostDate(p.date)} · <Clock className="h-3 w-3" /> {p.readingMinutes} min
              </p>
            </Link>
          ))}
        </div>
        {!showFeatured && rest.length === 0 && <p className="mt-8 text-sm text-muted-foreground">Ainda não há posts nesta categoria.</p>}

        <div className="mt-16"><TrialCta /></div>
      </div>
    </ContentLayout>
  );
}
