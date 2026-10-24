import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { capture } from '@/lib/productAnalytics';
import { ContentLayout, TrialCta } from '@/components/content/ContentLayout';

const URL = 'https://rhitmo.co/ferramentas/calculadora-custo-avaliacao';
const TITLE = 'Calculadora de custo da avaliação de desempenho';
const DESC = 'Descubra quantas horas e quanto custa por ano o ciclo de avaliação do seu time. Conta transparente, com os seus números.';

/** Jornada mensal de referência para converter salário em custo/hora. */
export const HOURS_PER_MONTH = 220;

export function estimateCycleCost(i: { reports: number; salary: number; hoursPerReport: number; cycles: number }) {
  const hours = Math.max(0, i.reports) * Math.max(0, i.hoursPerReport) * Math.max(0, i.cycles);
  const hourly = Math.max(0, i.salary) / HOURS_PER_MONTH;
  return { hours, hourly, cost: hours * hourly };
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function CalculadoraCusto() {
  const [reports, setReports] = useState(8);
  const [salary, setSalary] = useState(20000);
  const [hoursPerReport, setHours] = useState(3);
  const [cycles, setCycles] = useState(2);
  const r = useMemo(() => estimateCycleCost({ reports, salary, hoursPerReport, cycles }), [reports, salary, hoursPerReport, cycles]);

  const summary = `Ciclo de avaliação: ${reports} liderados × ${hoursPerReport}h × ${cycles} ciclos/ano = ${r.hours.toLocaleString('pt-BR')}h por ano. Custo estimado do tempo do líder: ${brl(r.cost)} por ano (${brl(r.hourly)}/h). Calculado em rhitmo.co`;
  const copy = async () => {
    await navigator.clipboard.writeText(summary);
    capture('cost_calculator_copied', { reports, cycles });
    toast({ title: 'Resumo copiado' });
  };

  const field = (id: string, label: string, v: number, set: (n: number) => void, hint?: string) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-slate-900">{label}</Label>
      <Input id={id} type="number" min={0} inputMode="decimal" value={v} onChange={(e) => set(Number(e.target.value) || 0)} className="mt-2 rounded-xl" />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

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

        <div className="mt-12 grid gap-4 md:grid-cols-5">
          <div className="space-y-5 rounded-3xl bg-card p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] md:col-span-3">
            {field('reports', 'Número de liderados', reports, setReports)}
            {field('salary', 'Salário mensal médio do líder (R$)', salary, setSalary)}
            {field('hours', 'Horas por liderado em cada ciclo', hoursPerReport, setHours, 'Relembrar o período, escrever, revisar e conversar.')}
            {field('cycles', 'Ciclos por ano', cycles, setCycles)}
          </div>
          <div className="flex flex-col rounded-3xl bg-slate-900 p-8 text-white md:col-span-2">
            <p className="text-xs uppercase tracking-[0.18em] opacity-70">Por ano</p>
            <p className="mt-3 font-serif text-5xl font-bold tracking-tight">{r.hours.toLocaleString('pt-BR')}h</p>
            <p className="mt-1 text-sm opacity-80">do líder dedicadas à avaliação</p>
            <p className="mt-6 font-serif text-3xl font-bold tracking-tight">{brl(r.cost)}</p>
            <p className="mt-1 text-sm opacity-80">em tempo do líder</p>
            <p className="mt-6 text-xs leading-relaxed opacity-70">
              Conta: {reports} × {hoursPerReport}h × {cycles} = {r.hours.toLocaleString('pt-BR')}h. Custo/hora = salário ÷ {HOURS_PER_MONTH}h = {brl(r.hourly)}. É uma estimativa com os seus números, sem encargos.
            </p>
            <button onClick={copy} className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 pt-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 mt-8">
              <Copy className="h-4 w-4" /> Copiar resumo
            </button>
          </div>
        </div>
        <div className="mt-16"><TrialCta title="E se essas horas virassem revisão, não memória?" /></div>
      </div>
    </ContentLayout>
  );
}
