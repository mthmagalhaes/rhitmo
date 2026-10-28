import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const SIGNUP_URL = '/auth/start?utm_source=content&utm_medium=organic';
/** @deprecated use SIGNUP_URL */
export const TRIAL_URL = SIGNUP_URL;

const NAV: { label: string; to: string }[] = [
  { label: 'Como funciona', to: '/#como-funciona' },
  { label: 'Integrações', to: '/integracoes' },
  { label: 'Blog', to: '/blog' },
  { label: 'Preços', to: '/#pricing' },
  { label: 'FAQ', to: '/#faq' },
];

const link = 'px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors';

/** Moldura das páginas públicas de conteúdo: mesmo menu, botões e rodapé da página inicial. */
export function ContentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" aria-label="Rhitmo, página inicial"><RhitmoLogo size="sm" className="text-slate-900" /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => <Link key={n.to} to={n.to} className={link}>{n.label}</Link>)}
            <div className="mx-2 h-5 w-px bg-slate-200" />
            <Link to="/auth" className={link}>Entrar</Link>
            <Link to={TRIAL_URL} className="ml-2 inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
              Assinar agora
            </Link>
          </nav>
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 text-slate-700 md:hidden" aria-label="Menu"><Menu className="h-6 w-6" /></button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-white pt-12">
              <nav className="flex flex-col gap-2">
                {NAV.map((n) => (
                  <SheetClose asChild key={n.to}><Link to={n.to} className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50">{n.label}</Link></SheetClose>
                ))}
                <div className="my-2 h-px bg-slate-100" />
                <SheetClose asChild><Link to="/auth" className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50">Entrar</Link></SheetClose>
                <SheetClose asChild>
                  <Link to={TRIAL_URL} className="mt-2 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Começar teste grátis</Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-24 border-t border-slate-100 bg-white px-6 py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2">
            <RhitmoLogo size="sm" className="text-slate-900" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              O parceiro AI-nativo de liderança que transforma conversas em avaliações de desempenho prontas.
            </p>
          </div>
          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-900">Produto</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              {NAV.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-slate-900">{n.label}</Link></li>)}
            </ul>
          </div>
          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-900">Materiais grátis</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link to="/recursos" className="hover:text-slate-900">Guias</Link></li>
              <li><Link to="/ferramentas/gerador-avaliacao-desempenho" className="hover:text-slate-900">Gerador de avaliação</Link></li>
              <li><Link to="/ferramentas/calculadora-custo-avaliacao" className="hover:text-slate-900">Calculadora de custo</Link></li>
              <li><Link to="/modelos/avaliacao-de-desempenho" className="hover:text-slate-900">Modelo de avaliação</Link></li>
              <li><Link to="/confianca" className="hover:text-slate-900">Confiança</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-slate-900">Privacidade</Link></li>
              <li><Link to="/terms-of-service" className="hover:text-slate-900">Termos de Serviço</Link></li>
              <li><Link to="/auth" className="hover:text-slate-900">Já tem conta? Entrar</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Bloco de convite para assinar, usado no fim das páginas. */
export function SignupCta({ title, body }: { title?: string; body?: string }) {
  return (
    <section className="rounded-[32px] bg-slate-900 p-8 text-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)] md:p-10">
      <h2 className="font-serif text-2xl font-bold tracking-tight md:text-3xl">
        {title ?? 'Imagine isso com as evidências reais do seu time, sem digitar nada.'}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
        {body ?? 'A Rhitmo importa as notas das suas 1:1s, organiza por pessoa e prepara pauta e rascunho de avaliação com a fonte de cada frase.'}
      </p>
      <Link to={TRIAL_URL} className="mt-6 inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100">
        Assinar agora, cancele quando quiser
      </Link>
    </section>
  );
}

/** @deprecated use SignupCta */
export const TrialCta = SignupCta;
