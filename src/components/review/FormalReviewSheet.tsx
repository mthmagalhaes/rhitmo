import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Scale,
  ChevronDown,
  Pencil,
  Eye,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ShareReviewDialog } from './ShareReviewDialog';
import { ReviewCalibrationPanel, type PromotionRecommendation, type LossRisk, type MeritRecommendation } from './ReviewCalibrationPanel';
import type { RecapClassification } from '@/lib/recapActions';
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

// Detects strings like "(fonte: ...)", "(Trimestral ...)", "(Mensal de ...)", "(1:1 de ...)"
const EVIDENCE_PREFIX_REGEX = /^\(\s*(fonte:|Trimestral|Mensal|1:1|Anotação|fonte\s)/i;

function EvidenceTag({ children }: { children: React.ReactNode }) {
  const text = String(children ?? '');
  if (EVIDENCE_PREFIX_REGEX.test(text.trim())) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[11px] font-medium border border-blue-100 dark:border-blue-900 not-italic ml-1 align-middle">
        {children}
      </span>
    );
  }
  return <em>{children}</em>;
}

function isLegacyHtmlContent(content: string | null | undefined): boolean {
  if (!content) return false;
  return /class="(review-section|section-header|section-icon|dimension-table|classification-grid|evidence-tag|contribution-item|pattern-item|development-item|next-steps-list)"/.test(content)
    || /\bICON_[A-Z_]+\b/.test(content)
    || /\{\{ICON_[A-Z_]+\}\}/.test(content);
}

export function FormalReviewSheet({
  open,
  onOpenChange,
  reviewId,
  onSent,
}: FormalReviewSheetProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation('rhitmo');

  const [draftText, setDraftText] = useState('');
  const [competencyEvaluations, setCompetencyEvaluations] = useState<CompetencyEvaluation[]>([]);
  const [activeTab, setActiveTab] = useState('draft');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [coachingOpen, setCoachingOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Persist coaching tip open/closed per review
  useEffect(() => {
    if (!reviewId) return;
    const stored = localStorage.getItem(`coaching-tip-open-${reviewId}`);
    setCoachingOpen(stored === 'true');
  }, [reviewId]);

  const toggleCoaching = (next: boolean) => {
    setCoachingOpen(next);
    if (reviewId) localStorage.setItem(`coaching-tip-open-${reviewId}`, String(next));
  };

  // Fetch review data
  const { data: review, isLoading } = useQuery({
    queryKey: ['formal-review', reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select(`
          *,
          team_members!performance_reviews_member_id_fkey (
            id, name, role, email
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="draft" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {t('review.tabs.draft', 'Rascunho Geral')}
              </TabsTrigger>
              <TabsTrigger value="competencies" className="gap-1.5">
                <Award className="h-3.5 w-3.5" />
                {t('review.tabs.competencies', 'Competências')}
              </TabsTrigger>
              <TabsTrigger value="calibration" className="gap-1.5">
                <Scale className="h-3.5 w-3.5" />
                {t('review.tabs.calibration', 'Calibração')}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Draft tab */}
          <TabsContent value="draft" className="flex-1 px-6 mt-4 min-h-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4 pb-6">
                {/* Coaching tip — collapsible, persisted per review */}
                {review.coaching_tip && (
                  <Collapsible open={coachingOpen} onOpenChange={toggleCoaching}>
                    <div className="print:hidden rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20 overflow-hidden">
                      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-100/40 dark:hover:bg-blue-900/20 transition-colors">
                        <div className="flex items-center gap-2 text-left">
                          <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            Dicas para Apresentação
                          </span>
                          <span className="text-[11px] text-blue-600/70 dark:text-blue-400/70 font-normal">
                            · Visível apenas para você
                          </span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform ${coachingOpen ? 'rotate-180' : ''}`}
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-1 text-sm text-blue-800 dark:text-blue-200 prose prose-sm dark:prose-invert prose-p:my-1 prose-li:my-0.5 max-w-none">
                          <ReactMarkdown>{review.coaching_tip}</ReactMarkdown>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )}

                {/* Legacy HTML banner */}
                {isLegacyHtmlContent(draftText) && !editMode && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/20 p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        Rascunho em formato antigo
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                        Esta avaliação foi gerada num formato anterior e não renderiza corretamente.
                        Regenere com IA para ver no novo layout (sem perder a calibração).
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 h-8 gap-1.5 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                        disabled={regenerating}
                        onClick={async () => {
                          setRegenerating(true);
                          try {
                            const { error } = await supabase.functions.invoke('generate-formal-review', {
                              body: { reviewId },
                            });
                            if (error) throw error;
                            await queryClient.invalidateQueries({ queryKey: ['formal-review', reviewId] });
                            toast({ title: 'Rascunho regenerado!' });
                          } catch (err: any) {
                            toast({ title: 'Erro ao regenerar', description: err.message, variant: 'destructive' });
                          } finally {
                            setRegenerating(false);
                          }
                        }}
                      >
                        {regenerating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Regenerar com IA
                      </Button>
                    </div>
                  </div>
                )}

                {/* Header with title + edit toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <Label className="text-sm font-medium">Avaliação geral do período</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {editMode
                        ? 'Editando — clique em Visualizar para voltar ao modo leitura.'
                        : 'Texto gerado pela IA com base nas evidências do período.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 shrink-0"
                    onClick={() => setEditMode((m) => !m)}
                  >
                    {editMode ? (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Visualizar
                      </>
                    ) : (
                      <>
                        <Pencil className="h-3.5 w-3.5" /> Editar texto
                      </>
                    )}
                  </Button>
                </div>

                {/* Reading mode: styled markdown render */}
                {!editMode ? (
                  <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert
                        prose-headings:tracking-tight prose-headings:font-semibold
                        prose-h2:text-base prose-h2:mt-7 prose-h2:mb-3 prose-h2:pb-2
                        prose-h2:border-b prose-h2:border-border/60 prose-h2:flex prose-h2:items-center prose-h2:gap-2
                        first:prose-h2:mt-0
                        prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1 prose-h3:text-foreground prose-h3:font-semibold
                        prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground/85 prose-p:my-2
                        prose-strong:text-foreground prose-strong:font-semibold
                        prose-li:text-sm prose-li:my-1 prose-li:text-foreground/85
                        prose-ul:my-2 prose-ol:my-2
                        prose-blockquote:border-l-2 prose-blockquote:border-primary/30 prose-blockquote:pl-3
                        prose-blockquote:text-muted-foreground prose-blockquote:not-italic prose-blockquote:text-xs
                        prose-blockquote:my-1.5 prose-blockquote:font-normal"
                    >
                      <ReactMarkdown components={{ em: EvidenceTag }}>
                        {draftText || '_Sem conteúdo ainda._'}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <RichTextEditor
                    content={draftText}
                    onChange={setDraftText}
                    placeholder="Digite a avaliação geral do liderado no período..."
                    minHeight="400px"
                  />
                )}
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

          {/* Calibration tab */}
          <TabsContent value="calibration" className="flex-1 px-6 mt-4 min-h-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="pr-4 pb-4">
                <ReviewCalibrationPanel
                  reviewId={reviewId}
                  initial={{
                    classification: ((review as any).classification ?? null) as RecapClassification | null,
                    promotion_recommendation: ((review as any).promotion_recommendation ?? null) as PromotionRecommendation | null,
                    loss_risk: ((review as any).loss_risk ?? null) as LossRisk | null,
                    merit_recommendation: ((review as any).merit_recommendation ?? null) as MeritRecommendation | null,
                  }}
                  disabled={!!review.acknowledged_at}
                />
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
