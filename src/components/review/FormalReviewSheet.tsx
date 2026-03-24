import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  FileText,
  Award,
  Save,
  Send,
  Calendar,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface FormalReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  onSent?: () => void;
}

interface CompetencyEvaluation {
  competency_id: string;
  competency_name: string;
  rating: 'below' | 'meets' | 'exceeds' | 'excellence';
  comment: string;
}

const ratingLabels: Record<string, string> = {
  below: 'Abaixo do Esperado',
  meets: 'Atende',
  exceeds: 'Supera',
  excellence: 'Excelência',
};

export function FormalReviewSheet({
  open,
  onOpenChange,
  reviewId,
  onSent,
}: FormalReviewSheetProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [draftText, setDraftText] = useState('');
  const [competencyEvaluations, setCompetencyEvaluations] = useState<CompetencyEvaluation[]>([]);
  const [activeTab, setActiveTab] = useState('draft');

  // Fetch review data
  const { data: review, isLoading } = useQuery({
    queryKey: ['formal-review', reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select(`
          *,
          team_members!performance_reviews_member_id_fkey (
            id, name, role
          )
        `)
        .eq('id', reviewId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!reviewId,
  });

  // Fetch competencies for the job role if available
  const { data: competencies } = useQuery({
    queryKey: ['review-role-competencies', review?.job_role_id],
    queryFn: async () => {
      if (!review?.job_role_id) return [];
      // Get framework_id from job_role
      const { data: jobRole } = await supabase
        .from('job_roles')
        .select('framework_id')
        .eq('id', review.job_role_id)
        .single();
      if (!jobRole?.framework_id) return [];

      const { data } = await supabase.rpc('get_job_roles_with_competencies', {
        _framework_id: jobRole.framework_id,
      });
      const roleData = (data as any[])?.find((r: any) => r.role_id === review.job_role_id);
      return roleData?.competencies || [];
    },
    enabled: open && !!review?.job_role_id,
  });

  // Initialize state from review data
  useEffect(() => {
    if (!review) return;
    setDraftText(review.content || '');

    if (review.competency_evaluations && Array.isArray(review.competency_evaluations)) {
      setCompetencyEvaluations(review.competency_evaluations as CompetencyEvaluation[]);
    } else if (competencies && competencies.length > 0) {
      setCompetencyEvaluations(
        competencies.map((comp: any) => ({
          competency_id: comp.competency_id,
          competency_name: comp.name,
          rating: 'meets' as const,
          comment: '',
        }))
      );
    }
  }, [review, competencies]);

  // Save draft
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('performance_reviews')
        .update({
          content: draftText,
          competency_evaluations: competencyEvaluations as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formal-review', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Rascunho salvo com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  // Send to member
  const sendMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('performance_reviews')
        .update({
          content: draftText,
          competency_evaluations: competencyEvaluations as any,
          shared_with_member: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formal-review', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Avaliação enviada ao liderado!' });
      onSent?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
    },
  });

  const updateRating = (compId: string, rating: string) => {
    setCompetencyEvaluations((prev) =>
      prev.map((e) => (e.competency_id === compId ? { ...e, rating: rating as any } : e))
    );
  };

  const updateComment = (compId: string, comment: string) => {
    setCompetencyEvaluations((prev) =>
      prev.map((e) => (e.competency_id === compId ? { ...e, comment } : e))
    );
  };

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-3xl w-full p-0 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!review) return null;

  const memberData = review.team_members as any;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-3xl w-full p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl tracking-tight">Avaliação Formal</SheetTitle>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {memberData?.name}
                </span>
                {memberData?.role && (
                  <span className="text-muted-foreground/60">{memberData.role}</span>
                )}
                {review.period_start && review.period_end && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(review.period_start), 'dd/MM/yy', { locale: ptBR })}
                    {' – '}
                    {format(new Date(review.period_end), 'dd/MM/yy', { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
            {review.shared_with_member && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-0">
                Enviada
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draft" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Rascunho Geral
              </TabsTrigger>
              <TabsTrigger value="competencies" className="gap-1.5">
                <Award className="h-3.5 w-3.5" />
                Competências
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Draft tab */}
          <TabsContent value="draft" className="flex-1 px-6 mt-4 min-h-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                <div>
                  <Label className="text-sm font-medium">Avaliação geral do período</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Revise e ajuste o texto gerado pela IA. Estrutura sugerida:
                    Pontos fortes • Áreas de desenvolvimento • Próximos passos
                  </p>
                  <Textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="Digite a avaliação geral do liderado no período..."
                    rows={20}
                    className="font-sans text-sm leading-relaxed"
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Competencies tab */}
          <TabsContent value="competencies" className="flex-1 px-6 mt-4 min-h-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-4 pr-4">
                {competencyEvaluations.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 pb-6 text-center">
                      <Award className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma competência definida para este cargo.
                        <br />
                        Defina competências no Framework de Competências.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  competencyEvaluations.map((evaluation) => {
                    const comp = (competencies as any[])?.find(
                      (c: any) => c.competency_id === evaluation.competency_id
                    );

                    return (
                      <Card key={evaluation.competency_id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{evaluation.competency_name}</CardTitle>
                          {comp?.description && (
                            <p className="text-sm text-muted-foreground">{comp.description}</p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-sm mb-3 block">Avaliação</Label>
                            <RadioGroup
                              value={evaluation.rating}
                              onValueChange={(v) => updateRating(evaluation.competency_id, v)}
                              className="flex flex-wrap gap-4"
                            >
                              {Object.entries(ratingLabels).map(([value, label]) => (
                                <div key={value} className="flex items-center space-x-2">
                                  <RadioGroupItem
                                    value={value}
                                    id={`${evaluation.competency_id}-${value}`}
                                  />
                                  <Label
                                    htmlFor={`${evaluation.competency_id}-${value}`}
                                    className="text-sm font-normal cursor-pointer"
                                  >
                                    {label}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                          <div>
                            <Label className="text-sm mb-2 block">Comentário / Justificativa</Label>
                            <Textarea
                              value={evaluation.comment}
                              onChange={(e) => updateComment(evaluation.competency_id, e.target.value)}
                              placeholder="Adicione evidências ou contexto para esta avaliação..."
                              rows={3}
                              className="text-sm"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => saveDraftMutation.mutate()}
                disabled={saveDraftMutation.isPending}
              >
                {saveDraftMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Rascunho
              </Button>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || !!review.shared_with_member}
              >
                {sendMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : review.shared_with_member ? (
                  'Já Enviada'
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar ao Liderado
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
