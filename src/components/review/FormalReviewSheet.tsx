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
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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
  Share2,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ShareReviewDialog } from './ShareReviewDialog';
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

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
      setCompetencyEvaluations(review.competency_evaluations as unknown as CompetencyEvaluation[]);
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

  // Send/share to member
  const sendMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('performance_reviews')
        .update({
          content: draftText,
          competency_evaluations: competencyEvaluations as any,
          shared_with_member: true,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formal-review', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: `Avaliação compartilhada com ${(review as any)?.team_members?.name || 'liderado'}!` });
      setShareDialogOpen(false);
      onSent?.();
      // Fire-and-forget email notification via transactional system
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'review-shared',
          recipientEmail: (review as any)?.team_members?.email,
          idempotencyKey: `review-shared-${reviewId}`,
          templateData: {
            memberName: (review as any)?.team_members?.name,
            managerName: 'Seu líder',
            periodLabel: (review as any)?.title,
            reviewLink: `${window.location.origin}/review/${reviewId}`,
          }
        }
      }).catch(err => console.error('Email notification failed:', err));
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao compartilhar', description: error.message, variant: 'destructive' });
    },
  });

  // Unshare mutation
  const unshareMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('performance_reviews')
        .update({
          shared_with_member: false,
          sent_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formal-review', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Compartilhamento removido' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover compartilhamento', description: error.message, variant: 'destructive' });
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
            <div className="flex flex-col items-end gap-1">
              {review.acknowledged_at && (
                <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Confirmada
                </Badge>
              )}
              {review.shared_with_member && !review.acknowledged_at && (
                <Badge className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                  <Send className="w-3 h-3" />
                  Enviada
                </Badge>
              )}
              {!review.shared_with_member && (
                <Badge variant="secondary" className="gap-1">
                  <FileText className="w-3 h-3" />
                  Rascunho
                </Badge>
              )}
            </div>
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
                {/* Coaching tip card - visible only to leader, hidden in print */}
                {review.coaching_tip && (
                  <div className="print:hidden rounded-xl border border-blue-200 bg-blue-50/80 dark:border-blue-800 dark:bg-blue-950/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        Dicas para Apresentação
                      </span>
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200 prose prose-sm dark:prose-invert prose-p:my-1 prose-li:my-0.5 max-w-none">
                      <ReactMarkdown>{review.coaching_tip}</ReactMarkdown>
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Avaliação geral do período</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Revise e ajuste o texto gerado pela IA. Estrutura sugerida:
                    Pontos fortes • Áreas de desenvolvimento • Próximos passos
                  </p>
                  <RichTextEditor
                    content={draftText}
                    onChange={setDraftText}
                    placeholder="Digite a avaliação geral do liderado no período..."
                    minHeight="400px"
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
                            <textarea
                              value={evaluation.comment}
                              onChange={(e) => updateComment(evaluation.competency_id, e.target.value)}
                              placeholder="Adicione evidências ou contexto para esta avaliação..."
                              rows={3}
                              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              {!review.shared_with_member ? (
                <Button onClick={() => setShareDialogOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar com Liderado
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => unshareMutation.mutate()}
                  disabled={unshareMutation.isPending}
                >
                  {unshareMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="mr-2 h-4 w-4" />
                  )}
                  Remover Compartilhamento
                </Button>
              )}
            </div>
          </div>
        </SheetFooter>

        <ShareReviewDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          memberName={memberData?.name || ''}
          onConfirm={() => sendMutation.mutate()}
          isPending={sendMutation.isPending}
        />
      </SheetContent>
    </Sheet>
  );
}
