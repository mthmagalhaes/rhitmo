import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Sparkles, BookOpen } from 'lucide-react';
import { ContentLayout, TrialCta } from '@/components/content/ContentLayout';
import { GUIDES } from '@/content/guias';

const URL = 'https://rhitmo.co/recursos';
const DESC = 'Guias, modelos e ferramentas grátis para líderes e RH: avaliação de desempenho, reuniões 1:1 e PDI.';

export default function Recursos() {
  return (
    <ContentLayout>
      <Helmet>
        <title>Recursos para líderes e RH | Rhitmo</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Recursos para líderes e RH | Rhitmo" />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={URL} />
      </Helmet>

      <div className="mx-auto max-w-5xl px-6 pt-14">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recursos</p>
        <h1 className="mt-2 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Liderança com menos improviso e mais evidência
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{DESC}</p>

        <div className="mt-12 grid gap-4 md:grid-cols-5">
          <Link to="/ferramentas/gerador-avaliacao-desempenho" className="group rounded-3xl bg-foreground p-8 text-background transition-transform hover:-translate-y-1 md:col-span-3">
            <Sparkles className="h-6 w-6" />
            <p className="mt-6 text-xs uppercase tracking-[0.18em] opacity-70">Ferramenta grátis com IA</p>
            <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight md:text-3xl">Gerador de texto para avaliação de desempenho</h2>
            <p className="mt-3 text-sm opacity-80">Informe o cargo e alguns fatos. Receba forças, pontos de desenvolvimento e próximos passos, sem vieses.</p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">Usar agora <ArrowRight className="h-4 w-4" /></span>
          </Link>
          <Link to="/modelos/avaliacao-de-desempenho" className="rounded-3xl bg-card p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1 md:col-span-2">
            <FileText className="h-6 w-6 text-primary" />
            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">Modelo para baixar</p>
            <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight">Modelo de avaliação de desempenho</h2>
            <p className="mt-3 text-sm text-muted-foreground">Com roteiro de 1:1 de bônus.</p>
          </Link>
        </div>

        <h2 className="mt-16 flex items-center gap-2 font-serif text-2xl font-bold tracking-tight"><BookOpen className="h-5 w-5 text-primary" /> Guias</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {GUIDES.map((g) => (
            <Link key={g.slug} to={`/guias/${g.slug}`} className="flex flex-col rounded-3xl bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{g.readingMinutes} min</p>
              <h3 className="mt-2 font-serif text-lg font-bold leading-snug tracking-tight">{g.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{g.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Ler guia <ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>

        <div className="mt-16"><TrialCta /></div>
      </div>
    </ContentLayout>
  );
}
