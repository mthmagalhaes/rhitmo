import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, Users, Mail, UserCheck, Building2, Sparkles, CreditCard, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelData {
  leads_total: number;
  leads_invited: number;
  signed_up: number;
  workspace_created: number;
  activated: number;
  paid: number;
}

const STAGES: Array<{
  key: keyof FunnelData;
  label: string;
  icon: typeof Users;
  description: string;
}> = [
  { key: 'leads_total', label: 'Leads', icon: Users, description: 'Total na waitlist' },
  { key: 'leads_invited', label: 'Convidados', icon: Mail, description: 'Receberam convite' },
  { key: 'signed_up', label: 'Cadastrados', icon: UserCheck, description: 'Email confirmado' },
  { key: 'workspace_created', label: 'Workspace', icon: Building2, description: 'Owners ativos' },
  { key: 'activated', label: 'Ativados', icon: Sparkles, description: '1ª ação em 7d' },
  { key: 'paid', label: 'Pagantes', icon: CreditCard, description: 'Pro ou Business' },
];

const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export const FunnelCard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-funnel-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_funnel_metrics');
      if (error) throw error;
      return data as unknown as FunnelData;
    },
    staleTime: 60_000,
  });

  return (
    <Card className="rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingDown className="h-5 w-5 text-primary" />
          Funil de Conversão
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Lead → Cadastro → Workspace → Ativação → Pago
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error || !data ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Não foi possível carregar o funil
          </div>
        ) : (
          <div className="space-y-2">
            {STAGES.map((stage, idx) => {
              const value = data[stage.key] ?? 0;
              const max = data.leads_total || 1;
              const widthPct = Math.max(8, (value / max) * 100);

              // Conversion vs previous stage
              const prev = idx > 0 ? data[STAGES[idx - 1].key] ?? 0 : null;
              const conversion = prev && prev > 0 ? value / prev : null;
              const isDropoff = conversion !== null && conversion < 0.3 && value < prev!;

              const Icon = stage.icon;

              return (
                <div key={stage.key} className="group">
                  <div className="flex items-center gap-3">
                    {/* Bar with label inside */}
                    <div className="flex-1 relative">
                      <div
                        className={cn(
                          'h-12 rounded-xl flex items-center px-4 transition-all',
                          'bg-gradient-to-r from-primary/15 to-primary/5',
                          'group-hover:from-primary/25 group-hover:to-primary/10',
                          idx === STAGES.length - 1 && 'from-success/25 to-success/5 group-hover:from-success/35 group-hover:to-success/10',
                        )}
                        style={{ width: `${widthPct}%`, minWidth: '180px' }}
                      >
                        <Icon className={cn(
                          'h-4 w-4 mr-2 shrink-0',
                          idx === STAGES.length - 1 ? 'text-success' : 'text-primary',
                        )} />
                        <span className="text-sm font-medium truncate">{stage.label}</span>
                        <span className="ml-auto text-base font-bold tabular-nums">{value}</span>
                      </div>
                    </div>

                    {/* Side meta */}
                    <div className="w-32 shrink-0 text-right">
                      <div className="text-xs text-muted-foreground">{stage.description}</div>
                      {conversion !== null && (
                        <div className={cn(
                          'text-xs font-medium tabular-nums mt-0.5',
                          isDropoff ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                        )}>
                          {formatPct(conversion)} do anterior
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Summary footer */}
            <div className="pt-4 mt-4 border-t border-border/40 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Lead → Cadastro</div>
                <div className="text-lg font-bold tabular-nums">
                  {data.leads_total > 0 ? formatPct(data.signed_up / data.leads_total) : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cadastro → Ativado</div>
                <div className="text-lg font-bold tabular-nums">
                  {data.signed_up > 0 ? formatPct(data.activated / data.signed_up) : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Lead → Pago</div>
                <div className="text-lg font-bold tabular-nums text-emerald-600">
                  {data.leads_total > 0 ? formatPct(data.paid / data.leads_total) : '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
