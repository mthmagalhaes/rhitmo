// Sprint 17 — Dialog on-demand para gerar Rhitmo Trimestral.
// Líder escolhe Último mês / Último trimestre / Personalizado, igual ao Formal.
import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGenerateQuarterlyRecap } from '@/hooks/useRecaps';

type PeriodType = 'last_month' | 'last_quarter' | 'custom';

interface Props {
  memberId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional preselect (vindo do Slack via ?suggest=quarterly&start=&end=)
  defaultStart?: string;
  defaultEnd?: string;
  defaultLabel?: string;
}

export function GenerateQuarterlyDialog({
  memberId,
  open,
  onOpenChange,
  defaultStart,
  defaultEnd,
  defaultLabel,
}: Props) {
  const generate = useGenerateQuarterlyRecap(memberId);
  const [periodType, setPeriodType] = useState<PeriodType>(defaultStart ? 'custom' : 'last_quarter');
  const [customStart, setCustomStart] = useState<Date | undefined>(
    defaultStart ? new Date(defaultStart) : undefined,
  );
  const [customEnd, setCustomEnd] = useState<Date | undefined>(
    defaultEnd ? new Date(defaultEnd) : undefined,
  );
  const [mode, setMode] = useState<'auto' | 'from_raw'>('auto');

  const period = useMemo(() => {
    const now = new Date();
    if (periodType === 'last_month') {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm), label: format(lm, 'MMMM yyyy', { locale: ptBR }) };
    }
    if (periodType === 'last_quarter') {
      return {
        start: subMonths(now, 3),
        end: now,
        label: `${format(subMonths(now, 3), 'MMM', { locale: ptBR })} - ${format(now, 'MMM yyyy', { locale: ptBR })}`,
      };
    }
    return {
      start: customStart ?? now,
      end: customEnd ?? now,
      label:
        defaultLabel ??
        (customStart && customEnd
          ? `${format(customStart, 'dd/MM/yy')} - ${format(customEnd, 'dd/MM/yy')}`
          : 'Personalizado'),
    };
  }, [periodType, customStart, customEnd, defaultLabel]);

  const canSubmit =
    periodType !== 'custom' || (!!customStart && !!customEnd && customEnd >= customStart);

  const handleGenerate = () => {
    generate.mutate(
      {
        periodStart: format(period.start, 'yyyy-MM-dd'),
        periodEnd: format(period.end, 'yyyy-MM-dd'),
        periodLabel: period.label,
        mode,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Gerar Rhitmo Trimestral</DialogTitle>
          <DialogDescription>
            Escolha o período. A Rhy consolida mensais confirmados, vozes de pares e sinais de rede.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-3">
            <Label>Período</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'last_month' as const, label: 'Último mês', sub: format(subMonths(new Date(), 1), 'MMM/yyyy', { locale: ptBR }) },
                { key: 'last_quarter' as const, label: 'Último trimestre', sub: '3 meses' },
                { key: 'custom' as const, label: 'Personalizado', sub: 'Datas' },
              ]).map((opt) => (
                <Button
                  key={opt.key}
                  variant={periodType === opt.key ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col items-center rounded-xl"
                  onClick={() => setPeriodType(opt.key)}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className="text-[10px] opacity-70">{opt.sub}</span>
                </Button>
              ))}
            </div>

            {periodType === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn('w-full justify-start text-left font-normal rounded-xl', !customStart && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStart ? format(customStart, 'dd/MM/yyyy') : 'Selecionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn('w-full justify-start text-left font-normal rounded-xl', !customEnd && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEnd ? format(customEnd, 'dd/MM/yyyy') : 'Selecionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Modo de geração</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('auto')}
                className={cn(
                  'rounded-xl p-3 border text-left text-sm transition-all',
                  mode === 'auto' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-foreground/20',
                )}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  A partir dos mensais
                </div>
                <div className="text-xs text-muted-foreground">Usa Rhitmo Mensal confirmado no período.</div>
              </button>
              <button
                type="button"
                onClick={() => setMode('from_raw')}
                className={cn(
                  'rounded-xl p-3 border text-left text-sm transition-all',
                  mode === 'from_raw' ? 'border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/30' : 'border-border hover:border-foreground/20',
                )}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-600" />
                  Modo rápido
                </div>
                <div className="text-xs text-muted-foreground">Direto de feedbacks e 1:1s. Menor curadoria.</div>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={!canSubmit || generate.isPending} className="rounded-xl">
              {generate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Trimestral
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
