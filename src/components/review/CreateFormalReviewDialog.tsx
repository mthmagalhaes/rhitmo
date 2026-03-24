import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar as CalendarIcon, FileText, Award, MessageSquare, Monitor } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateFormalReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: { id: string; name: string; role: string } | null;
  workspaceId: string;
}

export function CreateFormalReviewDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
}: CreateFormalReviewDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [periodType, setPeriodType] = useState<'last_month' | 'last_quarter' | 'custom'>('last_quarter');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();
  const [includeDraft, setIncludeDraft] = useState(true);
  const [includeCompetencies, setIncludeCompetencies] = useState(true);

  const periodDates = useMemo(() => {
    const now = new Date();
    if (periodType === 'last_month') {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm) };
    }
    if (periodType === 'last_quarter') {
      return { start: subMonths(now, 3), end: now };
    }
    return { start: customStart || now, end: customEnd || now };
  }, [periodType, customStart, customEnd]);

  const { data: evidence, isLoading: loadingEvidence } = useQuery({
    queryKey: ['review-evidence', member?.id, periodDates.start.toISOString(), periodDates.end.toISOString()],
    queryFn: async () => {
      if (!member) return null;
      const { data, error } = await supabase.rpc('get_review_evidence', {
        _member_id: member.id,
        _period_start: format(periodDates.start, 'yyyy-MM-dd'),
        _period_end: format(periodDates.end, 'yyyy-MM-dd'),
      });
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
    enabled: open && !!member,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error('Membro não selecionado');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const periodLabel = periodType === 'last_month'
        ? format(subMonths(new Date(), 1), 'MMMM yyyy', { locale: ptBR })
        : periodType === 'last_quarter'
          ? `${format(periodDates.start, 'MMM', { locale: ptBR })} - ${format(periodDates.end, 'MMM yyyy', { locale: ptBR })}`
          : `${format(periodDates.start, 'dd/MM/yy')} - ${format(periodDates.end, 'dd/MM/yy')}`;

      const { data: review, error } = await supabase
        .from('performance_reviews')
        .insert({
          member_id: member.id,
          title: `Avaliação Formal — ${periodLabel}`,
          content: '_Gerando com IA..._',
          period_type: 'formal',
          period_start: periodDates.start.toISOString(),
          period_end: periodDates.end.toISOString(),
          evidence_count: evidence?.total_evidence_count || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Avaliação criada! Gerando com IA...' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar avaliação', description: error.message, variant: 'destructive' });
    },
  });

  const canCreate = evidence && evidence.total_evidence_count > 0 && (includeDraft || includeCompetencies);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova Avaliação Formal</DialogTitle>
          <DialogDescription>
            {member?.name} • {member?.role || 'Cargo não definido'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Period selection */}
          <div className="space-y-3">
            <Label>Período da avaliação</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'last_month' as const, label: 'Último mês', sub: format(subMonths(new Date(), 1), 'MMM/yyyy', { locale: ptBR }) },
                { key: 'last_quarter' as const, label: 'Último trimestre', sub: '3 meses' },
                { key: 'custom' as const, label: 'Personalizado', sub: 'Escolher datas' },
              ]).map(opt => (
                <Button
                  key={opt.key}
                  variant={periodType === opt.key ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col items-center"
                  onClick={() => setPeriodType(opt.key)}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className="text-[10px] opacity-70">{opt.sub}</span>
                </Button>
              ))}
            </div>

            {periodType === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Data inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !customStart && 'text-muted-foreground')}>
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
                  <Label className="text-xs">Data final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !customEnd && 'text-muted-foreground')}>
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

          {/* Evidence preview */}
          {loadingEvidence ? (
            <Card>
              <CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Buscando evidências...</span>
              </CardContent>
            </Card>
          ) : evidence ? (
            <Card>
              <CardContent className="py-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Evidências disponíveis no período:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">{evidence.feedbacks_count}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Feedbacks</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">{evidence.meetings_count}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">1:1s</p>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Total: {evidence.total_evidence_count} evidência(s)
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Options */}
          <div className="space-y-3">
            <Label>O que incluir na avaliação?</Label>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="draft"
                  checked={includeDraft}
                  onCheckedChange={(c) => setIncludeDraft(c as boolean)}
                  className="mt-0.5"
                />
                <label htmlFor="draft" className="cursor-pointer space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">Rascunho Geral</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    IA analisa todas evidências e gera texto livre com pontos fortes, áreas de desenvolvimento e próximos passos
                  </p>
                </label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="competencies"
                  checked={includeCompetencies}
                  onCheckedChange={(c) => setIncludeCompetencies(c as boolean)}
                  className="mt-0.5"
                />
                <label htmlFor="competencies" className="cursor-pointer space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">Avaliação de Competências</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    IA avalia cada competência do cargo com base em evidências e fornece justificativas
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !canCreate}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Avaliação'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
