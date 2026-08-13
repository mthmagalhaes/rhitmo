import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Coins, Clock, Gauge, RefreshCw } from 'lucide-react';
import { downloadCsv } from '@/lib/csvExport';
import { useAdminCostReport, buildMonthOptions, USD_BRL, type AdminCostRow } from '@/hooks/useAdminCostReport';

const brl = (usd: number) =>
  (usd * USD_BRL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const usdFmt = (v: number) => `US$ ${v.toFixed(2)}`;
const hours = (v: number) => `${v.toFixed(1)}h`;

const Metric = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) => (
  <Card className="rounded-2xl border-border/60 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
    <CardContent className="p-5 space-y-1">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="font-serif text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </CardContent>
  </Card>
);

export const AdminCosts = () => {
  const months = useMemo(() => buildMonthOptions(12), []);
  const [month, setMonth] = useState(months[0].value);
  const { data: rows = [], isLoading, refetch, isFetching } = useAdminCostReport(month);

  const totals = useMemo(() => {
    const acc = rows.reduce(
      (a: { meetings: number; bot: number; trans: number; recall: number; ai: number }, r: AdminCostRow) => ({
        meetings: a.meetings + r.meetings,
        bot: a.bot + r.bot_hours,
        trans: a.trans + r.transcription_hours,
        recall: a.recall + r.recall_cost_usd,
        ai: a.ai + r.ai_cost_usd,
      }),
      { meetings: 0, bot: 0, trans: 0, recall: 0, ai: 0 },
    );
    return {
      ...acc,
      total: acc.recall + acc.ai,
      efficiency: acc.bot > 0 ? (acc.trans / acc.bot) * 100 : 0,
      costPerHour: acc.bot > 0 ? acc.recall / acc.bot : 0,
    };
  }, [rows]);

  const handleExport = () => {
    downloadCsv(
      `rhitmo-custos-${month}`,
      rows.map((r) => ({
        usuario: r.user_name || '',
        email: r.user_email || '',
        empresa: r.workspace_name || '',
        reunioes: r.meetings,
        horas_bot: r.bot_hours,
        horas_transcritas: r.transcription_hours,
        custo_recall_usd: r.recall_cost_usd,
        custo_ia_usd: r.ai_cost_usd,
        custo_total_usd: r.total_cost_usd,
        custo_total_brl: Number((r.total_cost_usd * USD_BRL).toFixed(2)),
      })),
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Coins className="h-3 w-3" />
          Painel admin
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight">Custos e horas</h1>
            <p className="text-sm text-muted-foreground">
              Horas de bot, transcrição e custo de IA por usuário. Câmbio US$ 1 = R$ {USD_BRL.toFixed(2)}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[190px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="rounded-xl" onClick={() => refetch()}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" className="rounded-xl gap-2" onClick={handleExport} disabled={!rows.length}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Clock} label="Horas de bot" value={hours(totals.bot)} hint={`${totals.meetings} reuniões`} />
        <Metric
          icon={Gauge}
          label="Eficiência de transcrição"
          value={`${totals.efficiency.toFixed(0)}%`}
          hint="Meta > 85% — resto é bot ocioso"
        />
        <Metric
          icon={Coins}
          label="Custo Recall"
          value={brl(totals.recall)}
          hint={`${usdFmt(totals.costPerHour)}/h efetivo`}
        />
        <Metric icon={Coins} label="Custo total (Recall + IA)" value={brl(totals.total)} hint={usdFmt(totals.total)} />
      </div>

      <Card className="rounded-2xl border-border/60 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Por usuário</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Nenhum consumo medido neste mês. As horas passam a ser registradas conforme os bots concluem reuniões.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border/60 bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Usuário</th>
                    <th className="px-4 py-2.5 text-left font-medium">Empresa</th>
                    <th className="px-4 py-2.5 text-right font-medium">Reuniões</th>
                    <th className="px-4 py-2.5 text-right font-medium">Horas bot</th>
                    <th className="px-4 py-2.5 text-right font-medium">Transcritas</th>
                    <th className="px-4 py-2.5 text-right font-medium">Recall</th>
                    <th className="px-4 py-2.5 text-right font-medium">IA</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const heavy = r.total_cost_usd * USD_BRL > 40;
                    return (
                      <tr key={r.user_id} className="border-b border-border/40 last:border-0">
                        <td className="px-4 py-2.5">
                          <p className="font-medium truncate max-w-[220px]">{r.user_name || '—'}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[220px]">{r.user_email}</p>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{r.workspace_name || '—'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.meetings}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{hours(r.bot_hours)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {hours(r.transcription_hours)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{brl(r.recall_cost_usd)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{brl(r.ai_cost_usd)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Badge
                            variant="outline"
                            className={
                              heavy
                                ? 'rounded-lg border-destructive/40 text-destructive tabular-nums'
                                : 'rounded-lg tabular-nums'
                            }
                          >
                            {brl(r.total_cost_usd)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
