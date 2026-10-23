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
import { Loader2, Calendar as CalendarIcon, FileText, Award, MessageSquare, Monitor, Compass, Sparkles } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBillingGate } from '@/hooks/useBillingGate';
import { useToast } from '@/hooks/use-toast';
import { useEnforcedLimits } from '@/hooks/useEnforcedLimits';
import { cn } from '@/lib/utils';

interface CreateFormalReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: { id: string; name: string; role: string } | null;
  workspaceId: string;
  onReviewCreated?: (reviewId: string) => void;
}

export function CreateFormalReviewDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
  onReviewCreated,
}: CreateFormalReviewDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const billingGate = useBillingGate();
  const { reviewCount, limits, enforceLimit } = useEnforcedLimits();

  const [periodType, setPeriodType] = useState<'last_month' | 'last_quarter' | 'custom'>('last_quarter');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();
  const [includeDraft, setIncludeDraft] = useState(true);
  const [includeCompetencies, setIncludeCompetencies] = useState(true);
  const [authoringMode, setAuthoringMode] = useState<'full_draft' | 'culture_guided'>('full_draft');

  // Cultura e régua publicadas pelo RH. Sem versão publicada, só o rascunho completo é oferecido.
  const { data: publishedCulture } = useQuery({
    queryKey: ['org-context-published', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('org_context_versions')
        .select('id, version')
        .eq('workspace_id', workspaceId)
        .eq('status', 'published')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: open && !!workspaceId,
  });
  const cultureAvailable = !!publishedCulture;
  const effectiveMode = cultureAvailable ? authoringMode : 'full_draft';

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
      if (!billingGate.ensure('generate_review')) {
        throw new Error('Assinatura necessária');
      }
      if (!enforceLimit(reviewCount, limits.maxReviews, 'avaliações formais')) {
        throw new Error('Limite atingido');
      }
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
          period_type: 'formal',
          period_start: periodDates.start.toISOString(),
          period_end: periodDates.end.toISOString(),
          evidence_count: evidence?.total_evidence_count || 0,
          authoring_mode: effectiveMode,
          content: effectiveMode === 'culture_guided' ? '_Preparando a avaliação guiada pela cultura..._' : '_Gerando com IA..._',
        })
        .select()
        .single();

      if (error) throw error;
      return review;
    },
    onSuccess: async (review) => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      const memberName = member?.name ?? '';
      toast({ title: 'A Rhitmo começou a preparar a avaliação', description: 'Pode sair desta tela, avisamos quando estiver pronta.' });
      onOpenChange(false);
      onReviewCreated?.(review.id);

      if (effectiveMode === 'culture_guided') {
        try {
          const init = await supabase.functions.invoke('culture-review-assist', { body: { action: 'init', reviewId: review.id } });
          if (init.error) throw init.error;
          queryClient.invalidateQueries({ queryKey: ['review-culture-items', review.id] });
          const sug = await supabase.functions.invoke('culture-review-assist', { body: { action: 'suggest_all', reviewId: review.id } });
          if (sug.error) throw sug.error;
          queryClient.invalidateQueries({ queryKey: ['review-culture-items', review.id] });
          queryClient.invalidateQueries({ queryKey: ['formal-review', review.id] });
          toast({ title: `Avaliação de ${memberName} pronta para revisar`, description: 'Abra em Avaliações para aceitar ou ajustar cada item.' });
        } catch (err) {
          console.error('Erro na avaliação guiada:', err);
          toast({ title: 'Não conseguimos gerar as sugestões', description: 'Abra a avaliação e clique em "Tentar novamente".', variant: 'destructive' });
        }
        return;
      }

      // Call AI generation asynchronously
      try {
        const { error } = await supabase.functions.invoke('generate-formal-review', {
          body: { reviewId: review.id },
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['formal-review', review.id] });
        queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
        toast({ title: `Avaliação de ${memberName} pronta para revisar` });
      } catch (err) {
        console.error('Erro ao gerar com IA:', err);
        toast({
          title: 'Erro ao gerar rascunho',
          description: 'Você pode escrever manualmente.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar avaliação', description: error.message, variant: 'destructive' });
    },
  });

  const canCreate = evidence && evidence.total_evidence_count > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          {/* Stepper */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">1</div>
              <span className="text-xs font-medium text-foreground">Briefing</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center">2</div>
              <span className="text-xs font-medium text-muted-foreground">Revisão & Compartilhamento</span>
            </div>
          </div>
          <DialogTitle>Briefing da Avaliação Formal</DialogTitle>
          <DialogDescription>
            {member?.name} • {member?.role || 'Cargo não definido'}
            <span className="block text-xs mt-1 text-muted-foreground/80">
              Definimos o escopo aqui. No próximo passo você revisa, ajusta e compartilha.
            </span>
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
                    <p className="text-xs text-muted-foreground">Anotações</p>
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

          {/* Como quer escrever? */}
          <div className="space-y-3">
            <Label>Como quer escrever?</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuthoringMode('full_draft')}
                className={cn('text-left rounded-xl border p-3 transition-colors', effectiveMode === 'full_draft' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40')}
              >
                <div className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="h-3.5 w-3.5" /> Rascunho livre por evidências</div>
                <p className="text-xs text-muted-foreground mt-1">A Rhitmo escreve a avaliação inteira a partir de anotações, 1:1s e evidências do período. Você edita livremente.</p>
              </button>
              <button
                type="button"
                disabled={!cultureAvailable}
                onClick={() => setAuthoringMode('culture_guided')}
                className={cn('text-left rounded-xl border p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed', effectiveMode === 'culture_guided' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40')}
              >
                <div className="flex items-center gap-1.5 text-sm font-medium"><Compass className="h-3.5 w-3.5" /> Avaliação Institucional</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {cultureAvailable
                    ? 'Estruturada pela cultura da empresa: valores, comportamentos e régua, combinados com sinais do dia a dia. Passo a passo com revisão do Espelho.'
                    : 'Disponível quando o RH publicar os valores e a régua da empresa.'}
                </p>
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground rounded-xl bg-muted/40 px-3 py-2 min-h-[3rem]">
            {effectiveMode === 'full_draft'
              ? <>A Rhitmo analisa entregas e evidências do período{publishedCulture ? ' e usa a cultura e a régua da empresa como referência' : ''}. Você revisa tudo antes de compartilhar.</>
              : 'Você passa por Cultura, Sinais & Rede, Rascunho Geral e Espelho. A Rhitmo prepara cada etapa e você revisa tudo antes de compartilhar.'}
          </p>

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
                'Avançar para revisão →'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
