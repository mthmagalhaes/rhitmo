import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { capture } from '@/lib/productAnalytics';
import { cn } from '@/lib/utils';
import { ContentLayout, TrialCta } from '@/components/content/ContentLayout';

const URL = 'https://rhitmo.co/ferramentas/calculadora-custo-avaliacao';
const TITLE = 'Calculadora de custo da avaliação de desempenho';
const DESC = 'Descubra quantas horas e quanto custa por ano o ciclo de avaliação do seu time ou da sua empresa. Conta transparente, com os seus números.';

/** Jornada mensal de referência para converter salário em custo/hora. */
export const HOURS_PER_MONTH = 220;

export function estimateCycleCost(i: { reports: number; salary: number; hoursPerReport: number; cycles: number }) {
  const hours = Math.max(0, i.reports) * Math.max(0, i.hoursPerReport) * Math.max(0, i.cycles);
  const hourly = Math.max(0, i.salary) / HOURS_PER_MONTH;
  return { hours, hourly, cost: hours * hourly };
}

export type Steps = { recall: number; writing: number; conversation: number; selfReview: number };
export const DEFAULT_STEPS: Steps = { recall: 45, writing: 90, conversation: 45, selfReview: 30 };

/** Minutos por pessoa avaliada. "Com Rhitmo" troca reconstrução + escrita por revisão do rascunho. */
export function estimateCycle(i: {
  mode: 'team' | 'company'; people: number; salary: number; cycles: number; steps: Steps; reviewMinutes: number;
}) {
  const n = Math.max(0, i.people) * Math.max(0, i.cycles);
  const s = i.steps;
  const self = i.mode === 'company' ? Math.max(0, s.selfReview) : 0;
  const todayMin = Math.max(0, s.recall) + Math.max(0, s.writing) + Math.max(0, s.conversation) + self;
  const rhitmoMin = Math.max(0, i.reviewMinutes) + Math.max(0, s.conversation) + self;
  const hourly = Math.max(0, i.salary) / HOURS_PER_MONTH;
  const todayHours = (n * todayMin) / 60;
  const rhitmoHours = (n * rhitmoMin) / 60;
  return {
    hourly, todayHours, rhitmoHours, todayCost: todayHours * hourly, rhitmoCost: rhitmoHours * hourly,
    savedHours: todayHours - rhitmoHours, savedCost: (todayHours - rhitmoHours) * hourly,
  };
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const hrs = (n: number) => `${Math.round(n).toLocaleString('pt-BR')}h`;

export default function CalculadoraCusto() {
  const [mode, setMode] = useState<'team' | 'company'>('team');
  const [people, setPeople] = useState(8);
  const [leaders, setLeaders] = useState(10);
  const [salary, setSalary] = useState(20000);
  const [cycles, setCycles] = useState(2);
  const [steps, setSteps] = useState<Steps>(DEFAULT_STEPS);
  const [reviewMinutes, setReview] = useState(30);
  const r = useMemo(() => estimateCycle({ mode, people, salary, cycles, steps, reviewMinutes }), [mode, people, salary, cycles, steps, reviewMinutes]);

  const switchMode = (m: 'team' | 'company') => { setMode(m); setPeople(m === 'team' ? 8 : 80); setSalary(m === 'team' ? 20000 : 12000); };
  const setStep = (k: keyof Steps) => (v: number) => setSteps((s) => ({ ...s, [k]: v }));

  const who = mode === 'team' ? `${people} liderados` : `${people} pessoas e ${leaders} líderes`;
  const summary = `Ciclo de avaliação (${who}, ${cycles} ciclos/ano). Hoje: ${hrs(r.todayHours)} e ${brl(r.todayCost)} por ano. Com rascunho pronto para revisar: ${hrs(r.rhitmoHours)} e ${brl(r.rhitmoCost)}. Diferença: ${hrs(r.savedHours)} e ${brl(r.savedCost)}. Calculado em rhitmo.co`;
  const copy = async () => {
    await navigator.clipboard.writeText(summary);
    capture('cost_calculator_copied', { mode, people, cycles });
    toast({ title: 'Resumo copiado' });
  };

  const field = (id: string, label: string, v: number, set: (n: number) => void, hint?: string) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">{label}</Label>
      <Input id={id} type="number" min={0} inputMode="decimal" value={v} onChange={(e) => set(Number(e.target.value) || 0)} className="mt-2 rounded-xl" />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  const benchmarks = [
    { step: 'Reconstruir o período', min: steps.recall, why: 'Procurar notas, mensagens e lembrar o que aconteceu em meses de trabalho. É a etapa que some quando o contexto já foi registrado.' },
    { step: 'Escrever a avaliação', min: steps.writing, why: 'Organizar exemplos, conectar com valores e comportamentos e redigir o texto.' },
    { step: 'Conversa de devolutiva', min: steps.conversation, why: 'Preparar e conduzir a conversa. Continua igual com ou sem Rhitmo.' },
    ...(mode === 'company' ? [{ step: 'Autoavaliação', min: steps.selfReview, why: 'Tempo de cada pessoa para se autoavaliar. Continua igual.' }] : []),
    { step: 'Revisar rascunho pronto', min: reviewMinutes, why: 'Com Rhitmo, substitui reconstrução e escrita: o líder revisa um rascunho com evidências.' },
  ];

  return (
    <ContentLayout>
      <Helmet>
        <title>{TITLE} | Rhitmo</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
      </Helmet>
      <div className="mx-auto max-w-5xl px-6 pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Calculadora grátis</p>
        <h1 className="mt-3 max-w-3xl font-serif text-4xl font-bold tracking-tight md:text-5xl">Quanto custa o seu ciclo de avaliação?</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{DESC}</p>

        <div className="mt-10 inline-flex rounded-xl bg-muted/50 p-1" role="tablist">
          {(['team', 'company'] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => switchMode(m)}
              className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors', mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {m === 'team' ? 'Minha equipe' : 'Empresa inteira'}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <div className="space-y-5 rounded-3xl bg-card p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] md:col-span-3">
            {mode === 'team' ? (
              <>
                {field('people', 'Número de liderados', people, setPeople)}
                {field('salary', 'Salário mensal do líder (R$)', salary, setSalary)}
              </>
            ) : (
              <>
                {field('people', 'Pessoas avaliadas na empresa', people, setPeople)}
                {field('leaders', 'Número de líderes', leaders, setLeaders)}
                {field('salary', 'Salário mensal médio (R$)', salary, setSalary)}
              </>
            )}
            {field('cycles', 'Ciclos por ano', cycles, setCycles)}
            <div className="border-t border-border pt-5">
              <p className="text-sm font-medium text-foreground">Minutos por pessoa avaliada</p>
              <p className="mt-1 text-xs text-muted-foreground">Valores iniciais são referências. Ajuste para a sua realidade.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {field('recall', 'Reconstruir o período', steps.recall, setStep('recall'))}
                {field('writing', 'Escrever a avaliação', steps.writing, setStep('writing'))}
                {field('conversation', 'Conversa de devolutiva', steps.conversation, setStep('conversation'))}
                {mode === 'company' && field('self', 'Autoavaliação', steps.selfReview, setStep('selfReview'))}
                {field('review', 'Revisar rascunho com Rhitmo', reviewMinutes, setReview)}
              </div>
            </div>
          </div>
          <div className="flex flex-col rounded-3xl bg-slate-900 p-8 text-white md:col-span-2">
            <p className="text-xs uppercase tracking-[0.18em] opacity-70">Hoje, por ano</p>
            <p className="mt-2 font-serif text-5xl font-bold tracking-tight" data-testid="today-hours">{hrs(r.todayHours)}</p>
            <p className="mt-1 text-sm opacity-80">{brl(r.todayCost)} em tempo</p>
            <p className="mt-6 text-xs uppercase tracking-[0.18em] opacity-70">Com rascunho pronto</p>
            <p className="mt-2 font-serif text-3xl font-bold tracking-tight" data-testid="rhitmo-hours">{hrs(r.rhitmoHours)}</p>
            <p className="mt-1 text-sm opacity-80">{brl(r.rhitmoCost)} em tempo</p>
            <p className="mt-6 rounded-2xl bg-white/10 p-4 text-sm">Diferença: <strong>{hrs(r.savedHours)}</strong> e <strong>{brl(r.savedCost)}</strong> por ano{mode === 'company' && leaders > 0 ? `, cerca de ${hrs(r.savedHours / leaders)} por líder` : ''}.</p>
            <p className="mt-4 text-xs leading-relaxed opacity-70">Custo/hora = salário ÷ {HOURS_PER_MONTH}h = {brl(r.hourly)}. Estimativa com os seus números, sem encargos.</p>
            <button onClick={copy} className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              <Copy className="h-4 w-4" /> Copiar resumo
            </button>
          </div>
        </div>

        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold tracking-tight">De onde vem cada número</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">São valores de referência para começar a conversa, não estatísticas. Todos podem ser editados acima.</p>
          <div className="mt-6 overflow-hidden rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            {benchmarks.map((b) => (
              <div key={b.step} className="grid gap-1 border-b border-border p-5 last:border-0 sm:grid-cols-[200px_80px_1fr] sm:gap-4">
                <p className="font-medium text-foreground">{b.step}</p>
                <p className="text-sm text-muted-foreground">{b.min} min</p>
                <p className="text-sm text-muted-foreground">{b.why}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-16"><TrialCta title="E se essas horas virassem revisão, não memória?" /></div>
      </div>
    </ContentLayout>
  );
}
