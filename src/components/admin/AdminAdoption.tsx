import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdoptionRow {
  leader_user_id: string;
  leader_email: string | null;
  workspace_name: string | null;
  leader_since: string;
  provider: string | null;
  connected_at: string | null;
  notes_imported: number | null;
}

const RANGES = [
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
  { days: 365, label: '12 meses' },
];

/** Meta que destrava os pilares gated do plano mestre. */
const TARGET_PCT = 40;

function fmt(date: string | null) {
  if (!date) return '—';
  return format(new Date(date), "dd MMM yyyy", { locale: ptBR });
}

/**
 * Sinal de adoção do conector-first: quantos líderes novos conectaram um
 * note taker. É a métrica que abre (ou mantém fechado) o gate do Rhitmo 2.0.
 */
export const AdminAdoption = () => {
  const [days, setDays] = useState(90);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['note-taker-adoption', days],
    queryFn: async (): Promise<AdoptionRow[]> => {
      const { data, error } = await supabase.rpc('get_note_taker_adoption', { _days: days });
      if (error) throw error;
      return (data ?? []) as AdoptionRow[];
    },
  });

  const total = data.length;
  const connected = data.filter((r) => !!r.provider).length;
  const pct = total > 0 ? Math.round((connected / total) * 100) : 0;
  const gateOpen = total > 0 && pct >= TARGET_PCT;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Plug className="h-3 w-3" />
          Painel admin
        </div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Adoção de conectores</h1>
        <p className="text-sm text-muted-foreground">
          Líderes que passaram a liderar no período e conectaram um note taker. A meta de {TARGET_PCT}%
          é o que destrava os pilares novos do plano Rhitmo 2.0.
        </p>
      </header>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.days}
            size="sm"
            variant={days === r.days ? 'default' : 'outline'}
            className="rounded-xl"
            onClick={() => setDays(r.days)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Líderes novos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl font-bold tracking-tight">{isLoading ? '—' : total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Com note taker conectado</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl font-bold tracking-tight">{isLoading ? '—' : connected}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Taxa de adoção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-serif text-3xl font-bold tracking-tight">{isLoading ? '—' : `${pct}%`}</p>
            <Badge
              variant="outline"
              className={
                gateOpen
                  ? 'text-[10px] bg-success/10 text-success-strong border-success/25'
                  : 'text-[10px] bg-muted text-muted-foreground'
              }
            >
              {gateOpen ? 'Gate aberto' : `Gate fechado (meta ${TARGET_PCT}%)`}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="font-serif text-base tracking-tight">Líderes do período</CardTitle>
          <CardDescription className="text-xs">
            Ordenado do mais recente para o mais antigo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Não foi possível carregar: {(error as Error).message}</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : total === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum líder novo nesse período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Líder</th>
                    <th className="py-2 pr-4 font-medium">Empresa</th>
                    <th className="py-2 pr-4 font-medium">Lidera desde</th>
                    <th className="py-2 pr-4 font-medium">Conector</th>
                    <th className="py-2 pr-4 font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.leader_user_id} className="border-t border-border/40">
                      <td className="py-2 pr-4">{row.leader_email ?? row.leader_user_id}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.workspace_name ?? '—'}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{fmt(row.leader_since)}</td>
                      <td className="py-2 pr-4">
                        {row.provider ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Badge className="text-[10px] px-1.5 py-0 bg-success/10 text-success-strong border-success/25 hover:bg-success/10">
                              {row.provider}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{fmt(row.connected_at)}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem conector</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.notes_imported ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
