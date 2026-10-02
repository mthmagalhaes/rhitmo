import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { Button } from '@/components/ui/button';

export const TRIAL_URL = '/auth?mode=signup&utm_source=content&utm_medium=organic';

/** Moldura das páginas públicas de conteúdo, no mesmo visual da página inicial. */
export function ContentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" aria-label="Rhitmo, página inicial"><RhitmoLogo size="sm" /></Link>
          <nav className="flex items-center gap-1">
            <Link to="/recursos" className="hidden px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">Recursos</Link>
            <Link to="/auth" className="hidden px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">Entrar</Link>
            <Button asChild size="sm" className="rounded-xl"><Link to={TRIAL_URL}>Testar grátis</Link></Button>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-24 border-t border-border/60 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 text-sm text-muted-foreground md:flex-row md:items-center">
          <RhitmoLogo size="sm" />
          <div className="flex flex-wrap gap-6">
            <Link to="/recursos" className="hover:text-foreground">Recursos</Link>
            <Link to="/ferramentas/gerador-avaliacao-desempenho" className="hover:text-foreground">Gerador de avaliação</Link>
            <Link to="/modelos/avaliacao-de-desempenho" className="hover:text-foreground">Modelo de avaliação</Link>
            <Link to="/confianca" className="hover:text-foreground">Confiança</Link>
            <Link to="/privacy-policy" className="hover:text-foreground">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Bloco de convite para o teste, usado no fim das páginas. */
export function TrialCta({ title, body }: { title?: string; body?: string }) {
  return (
    <section className="rounded-3xl bg-foreground p-8 text-background md:p-10">
      <h2 className="font-serif text-2xl font-bold tracking-tight md:text-3xl">
        {title ?? 'Imagine isso com as evidências reais do seu time, sem digitar nada.'}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed opacity-80 md:text-base">
        {body ?? 'A Rhitmo importa as notas das suas 1:1s, organiza por pessoa e prepara pauta e rascunho de avaliação com a fonte de cada frase.'}
      </p>
      <Button asChild size="lg" className="mt-6 rounded-xl bg-background text-foreground hover:bg-background/90">
        <Link to={TRIAL_URL}>Testar 14 dias grátis, sem cartão</Link>
      </Button>
    </section>
  );
}
