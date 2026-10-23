import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog as Sheet,
  DialogContent as SheetContent,
  DialogHeader as SheetHeader,
  DialogTitle as SheetTitle,
  DialogFooter as SheetFooter,
} from '@/components/ui/dialog';
import { markdownToEditorHtml, editorHtmlToMarkdown, normalizeReviewHeadings, looksLikeHtml, normalizeLegacyReviewHtml } from '@/lib/reviewMarkdown';
import DOMPurify from 'dompurify';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CultureGuidedPanel } from '@/components/review/CultureGuidedPanel';
import { RhitmoThinking } from '@/components/ai/RhitmoThinking';
import { ReviewMirrorPanel, type MirrorResult, type MirrorFinding } from '@/components/review/ReviewMirrorPanel';
import { Compass, ScanSearch, Radio, Lock, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Mesmo visual da leitura, reaproveitado no editor para "editar como se lê".
const READING_PROSE = `prose prose-sm max-w-none dark:prose-invert
  prose-headings:tracking-tight prose-headings:font-semibold
  prose-h2:text-base prose-h2:mt-7 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/60
  prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1 prose-h3:text-foreground
  prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground/85 prose-p:my-2
  prose-strong:text-foreground prose-strong:font-semibold
  prose-li:text-sm prose-li:my-1 prose-li:text-foreground/85 prose-ul:my-2 prose-ol:my-2`;
import { SignalsGuidedPanel } from '@/components/review/SignalsGuidedPanel';
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
  Printer,
  EyeOff,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { printReview } from '@/lib/printReview';
import ReactMarkdown from 'react-markdown';
import { citationMarkdownComponents } from '@/lib/markdownCitations';
import { CitationCounterProvider } from '@/components/context/CitationCounterProvider';
import { ShareReviewDialog } from './ShareReviewDialog';
import { DeleteDraftReviewButton } from './DeleteDraftReviewButton';
import { ReviewCalibrationPanel, type PromotionRecommendation, type LossRisk, type MeritRecommendation } from './ReviewCalibrationPanel';
import type { RecapClassification } from '@/lib/recapActions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { replaceFuzzy } from '@/lib/fuzzyRange';
import { capture } from '@/lib/productAnalytics';

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
  const [editorHtml, setEditorHtml] = useState('');
  const [coachingOpen, setCoachingOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [mirrorRunning, setMirrorRunning] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [mirrorResult, setMirrorResult] = useState<MirrorResult | null>(null);
  const [mirrorCheckedText, setMirrorCheckedText] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

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
    // Enquanto o rascunho completo está sendo gerado, recarrega até chegar.
    refetchInterval: (q) => {
      const d = q.state.data as any;
      return d && d.authoring_mode !== 'culture_guided' && String(d.content ?? '').startsWith('_Gerando') ? 4000 : false;
    },
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
    if ((review as any).authoring_mode === 'culture_guided' && !(review as any).content?.startsWith('##')) setActiveTab('culture');

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

  useEffect(() => {
    if (!open || !reviewId) return;
    setMirrorResult(null); setMirrorCheckedText(null);
    supabase.from('review_mirror_checks').select('findings, checked_at').eq('review_id', reviewId).maybeSingle()
      .then(({ data }) => { if (data) setMirrorResult({ findings: data.findings as unknown as MirrorFinding[], checked_at: data.checked_at }); });
  }, [open, reviewId]);

  const isCultureGuided = (review as any)?.authoring_mode === 'culture_guided';
  const isPlaceholder = /^_(Preparando|Gerando)/.test((draftText || '').trim());
  // Passos obrigatórios na primeira vez: 0 = só Cultura, 1 = + Sinais, 2 = tudo livre.
  const stepKey = reviewId ? `guided-step-${reviewId}` : null;
  const [guidedStep, setGuidedStep] = useState<number | null>(null);
  useEffect(() => {
    if (!review || !stepKey || guidedStep !== null) return;
    const stored = Number(localStorage.getItem(stepKey) ?? NaN);
    const content = String((review as any).content ?? '').trim();
    const hasRealDraft = !!content && !/^_(Preparando|Gerando)/.test(content);
    const opened = !isCultureGuided || !!review.shared_with_member || (hasRealDraft && !(stored >= 0 && stored < 2)) ? 2 : (stored >= 0 ? stored : 0);
    if (opened < 2) localStorage.setItem(stepKey, String(opened));
    setGuidedStep(opened);
  }, [review, stepKey, guidedStep, isCultureGuided]);
  const advanceStep = (n: number) => {
    setGuidedStep((s) => Math.max(s ?? 0, n));
    if (stepKey) localStorage.setItem(stepKey, String(n));
  };
  const step = guidedStep ?? 2;
  const openFindings = (mirrorResult?.findings ?? []).filter((f) => !f.dismissed).length;

  const invokeMirror = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('review-mirror', { body });
    if (error) {
      let msg = error.message;
      try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* noop */ }
      throw new Error(msg);
    }
    return data as MirrorResult;
  };

  const runMirror = async (): Promise<MirrorResult | null> => {
    if (!reviewId || isPlaceholder) return null;
    setMirrorRunning(true);
    try {
      capture('mirror_run', {});
      const res = await invokeMirror({ reviewId, content: draftText });
      setMirrorResult(res);
      setMirrorCheckedText(draftText);
      return res;
    } catch (e: any) {
      toast({ title: 'Não foi possível revisar', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setMirrorRunning(false);
    }
  };

  const dismissFinding = async (index: number) => {
    if (!reviewId) return;
    setMirrorResult((prev) => prev ? { ...prev, findings: prev.findings.map((f, i) => i === index ? { ...f, dismissed: true } : f) } : prev);
    try { await invokeMirror({ reviewId, dismissIndex: index }); } catch { /* registro best-effort */ }
  };

  const markFinding = (f: MirrorFinding, patch: Partial<MirrorFinding>) =>
    setMirrorResult((prev) => prev ? { ...prev, findings: prev.findings.map((x) => x === f ? { ...x, ...patch } : x) } : prev);
  const commitDraft = (next: string) => {
    setDraftText(next);
    if (editMode) setEditorHtml(markdownToEditorHtml(next));
  };

  const applySuggestion = async (f: MirrorFinding) => {
    if (isPlaceholder) return;
    if (f.excerpt) {
      const prev = draftText;
      const next = replaceFuzzy(prev, f.excerpt, f.suggestion);
      if (next === null) { markFinding(f, { stale: true }); return; }
      commitDraft(next);
      markFinding(f, { dismissed: true });
      capture('mirror_suggestion_applied', { type: f.type });
      toast({
        title: 'Sugestão aplicada no Rascunho Geral',
        description: 'Lembre de salvar o rascunho.',
        action: (
          <ToastAction altText="Desfazer" onClick={() => { commitDraft(prev); markFinding(f, { dismissed: false }); }}>
            Desfazer
          </ToastAction>
        ),
      });
      return;
    }
    // Alertas sem trecho (ex.: Cobertura): a Rhitmo escreve um parágrafo e o líder decide.
    try {
      const { data, error } = await supabase.functions.invoke('review-rewrite', {
        body: { reviewId, action: 'suggest_insert', text: `${f.explanation}\nSugestão: ${f.suggestion}` },
      });
      if (error) throw error;
      const accepted = window.confirm(`A Rhitmo sugere acrescentar ao final:\n\n${String(data.text).replace(/\[doc:[0-9a-f-]+\]/gi, '(evidência)')}\n\nInserir no rascunho?`);
      if (!accepted) return;
      commitDraft(`${draftText.trimEnd()}\n\n${data.text}\n`);
      markFinding(f, { dismissed: true });
      capture('mirror_suggestion_applied', { type: f.type });
      toast({ title: 'Trecho inserido', description: 'Lembre de salvar o rascunho.' });
    } catch (e: any) {
      toast({ title: 'Não foi possível escrever o trecho', description: e.message, variant: 'destructive' });
    }
  };

  // Espelho roda uma vez ao compartilhar: avisa, nunca bloqueia.
  const [mirrorWarnCount, setMirrorWarnCount] = useState(0);
  const handleShareClick = async () => {
    const res = mirrorResult ?? await runMirror();
    const pending = (res?.findings ?? []).filter((f) => !f.dismissed && f.severity !== 'low').length;
    if (pending > 0) { setMirrorWarnCount(pending); return; }
    setShareDialogOpen(true);
  };

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
      queryClient.invalidateQueries({ queryKey: ['team-performance-reviews'] });
      toast({ title: `Avaliação compartilhada com ${(review as any)?.team_members?.name || 'liderado'}!` });
      setShareDialogOpen(false);
      onSent?.();
      // Fire-and-forget email notification via transactional system
      supabase.functions.invoke('notify-review-shared', {
        body: { reviewId }
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

  const renameMutation = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from('performance_reviews')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      setRenaming(false);
      queryClient.invalidateQueries({ queryKey: ['formal-review', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['team-performance-reviews'] });
      toast({ title: 'Nome atualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao renomear', description: error.message, variant: 'destructive' });
    },
  });

  const handleExportPdf = () => {
    if (!review) return;
    const md = review.team_members as any;
    const period = review.period_start && review.period_end
      ? `${format(new Date(review.period_start), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(review.period_end), 'dd/MM/yyyy', { locale: ptBR })}`
      : undefined;
    const ok = printReview({
      title: (review as any).title || 'Avaliação Formal',
      content: draftText || (review as any).content || '',
      memberName: md?.name,
      periodText: period,
    });
    if (!ok) toast({ title: 'Não foi possível abrir a impressão', description: 'Libere pop-ups para este site.', variant: 'destructive' });
  };

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
        <SheetContent className="max-w-[1200px] w-[94vw] h-[92vh] p-0 gap-0 flex flex-col rounded-3xl overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-8">
            <RhitmoThinking className="w-full max-w-md" hint={null} title="Abrindo a avaliação" steps={['Carregando a avaliação...']} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!review) return null;

  const memberData = review.team_members as any;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-[1200px] w-[94vw] h-[92vh] p-0 gap-0 flex flex-col rounded-3xl overflow-hidden">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 pr-14 border-b space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {renaming ? (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => { e.preventDefault(); renameMutation.mutate(titleDraft.trim()); }}
                  >
                    <Input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      className="h-9 w-[320px] max-w-full rounded-xl"
                      onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(false); }}
                    />
                    <Button type="submit" size="sm" disabled={!titleDraft.trim() || renameMutation.isPending}>
                      {renameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setRenaming(false)}>Cancelar</Button>
                  </form>
                ) : (
                  <SheetTitle className="text-xl tracking-tight">{(review as any).title || 'Avaliação Formal'}</SheetTitle>
                )}
                {review.acknowledged_at ? (
                  <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Confirmada
                  </Badge>
                ) : review.shared_with_member ? (
                  <Badge className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                    <Send className="w-3 h-3" /> Enviada
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="w-3 h-3" /> Rascunho
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {memberData?.name}
                </span>
                {memberData?.role && (
                  <span className="text-muted-foreground">{memberData.role}</span>
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
            <div className="flex items-center gap-2 flex-wrap">
              {!renaming && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setTitleDraft((review as any).title || ''); setRenaming(true); }}>
                  <Pencil className="h-4 w-4" /> Renomear
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPdf} disabled={isPlaceholder}>
                <Printer className="h-4 w-4" /> Exportar PDF
              </Button>
              {review.shared_with_member && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => unshareMutation.mutate()} disabled={unshareMutation.isPending}>
                  {unshareMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                  Revogar acesso
                </Button>
              )}
              {!review.shared_with_member && !(review as any).acknowledged_at && (
                <DeleteDraftReviewButton
                  reviewId={reviewId}
                  label={(review as any).title}
                  onDeleted={() => { onOpenChange(false); onSent?.(); }}
                />
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className={`grid w-full ${isCultureGuided ? 'grid-cols-4' : 'grid-cols-2'}`}>
              {isCultureGuided && (
                <TabsTrigger value="culture" className="gap-1.5">
                  <Compass className="h-3.5 w-3.5" />
                  Cultura
                </TabsTrigger>
              )}
              {isCultureGuided && (
                <TabsTrigger value="signals" className="gap-1.5" disabled={step < 1} title={step < 1 ? 'Conclua a Cultura primeiro' : undefined}>
                  {step < 1 ? <Lock className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}
                  Sinais & Rede
                </TabsTrigger>
              )}
              <TabsTrigger value="draft" className="gap-1.5" disabled={step < 2} title={step < 2 ? 'Conclua Cultura e Sinais primeiro' : undefined}>
                {step < 2 ? <Lock className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                {t('review.tabs.draft', 'Rascunho Geral')}
              </TabsTrigger>
              <TabsTrigger value="mirror" className="gap-1.5" disabled={step < 2} title={step < 2 ? 'Disponível depois do Rascunho Geral' : undefined}>
                {step < 2 ? <Lock className="h-3.5 w-3.5" /> : <ScanSearch className="h-3.5 w-3.5" />}
                Espelho{openFindings > 0 ? ` (${openFindings})` : ''}
              </TabsTrigger>
            </TabsList>
          </div>

          {isCultureGuided && (
            <TabsContent value="culture" forceMount className="flex-1 px-6 mt-4 min-h-0 overflow-hidden data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="pr-4 pb-6">
                  <CultureGuidedPanel
                    reviewId={reviewId!}
                    versionId={(review as any).org_context_version_id ?? null}
                    readOnly={!!review.shared_with_member}
                    needsAssembly={isPlaceholder}
                    onAssembled={async (content, advance) => {
                      if (advance) { advanceStep(1); setActiveTab('signals'); }
                      if (content == null) return;
                      setDraftText(content);
                      await supabase.from('performance_reviews').update({ content }).eq('id', reviewId!);
                      queryClient.invalidateQueries({ queryKey: ['formal-review', reviewId] });
                    }}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          {isCultureGuided && (
            <TabsContent value="signals" className="flex-1 px-6 mt-4 min-h-0 overflow-hidden data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="pr-4 pb-6">
                  <SignalsGuidedPanel
                    reviewId={reviewId!}
                    readOnly={!!review.shared_with_member}
                    onAssembleStart={() => { setAssembling(true); advanceStep(2); setActiveTab('draft'); }}
                    onAssembleFailed={() => { setAssembling(false); setActiveTab('signals'); }}
                    onAssembleDelta={(partial) => { setAssembling(false); setDraftText(partial); }}
                    onAssembled={async (content, advance) => {
                      setDraftText(content);
                      setAssembling(false);
                      await supabase.from('performance_reviews').update({ content }).eq('id', reviewId!);
                      queryClient.invalidateQueries({ queryKey: ['formal-review', reviewId] });
                      if (advance) { advanceStep(2); setActiveTab('draft'); }
                    }}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          <TabsContent value="mirror" className="flex-1 px-6 mt-4 min-h-0 overflow-hidden data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="pr-4 pb-6">
                <ReviewMirrorPanel
                  result={mirrorResult}
                  running={mirrorRunning}
                  readOnly={!!review.shared_with_member}
                  waiting={isPlaceholder}
                  onRun={() => runMirror()}
                  onDismiss={dismissFinding}
                  onApplySuggestion={applySuggestion}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Draft tab */}
          <TabsContent value="draft" className="flex-1 px-6 mt-4 min-h-0 overflow-hidden data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-4 pb-6">
                {assembling && (
                  <RhitmoThinking steps={['Juntando cultura e sinais aceitos...', 'Montando o documento...', 'Revisando o texto final...']} stepMs={2500} />
                )}
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
                          <CitationCounterProvider>
                            <ReactMarkdown components={citationMarkdownComponents}>{review.coaching_tip}</ReactMarkdown>
                          </CitationCounterProvider>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )}

                {!editMode && !assembling && draftText.startsWith('_Gerando') && (
                  <RhitmoThinking
                    steps={[
                      `Buscando anotações e 1:1s de ${(review.team_members as any)?.name ?? 'quem você avalia'}...`,
                      'Cruzando evidências do período...',
                      'Escrevendo o rascunho com citações...',
                    ]}
                  />
                )}
                {!editMode && !assembling && draftText.startsWith('_Preparando') && (
                  <RhitmoThinking steps={['Esperando as sugestões da cultura...', 'Juntando valores e comportamentos...', 'Montando o documento...']} />
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
                  <div className="flex items-center gap-2 shrink-0">
                  {!review.shared_with_member && !isPlaceholder && step >= 2 && (
                    <Button size="sm" variant="ghost" className="gap-1.5" disabled={mirrorRunning}
                      onClick={() => { setActiveTab('mirror'); if (!isPlaceholder && !mirrorRunning) runMirror(); }}>
                      <ScanSearch className="h-3.5 w-3.5" /> Revisar no Espelho
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 shrink-0"
                    onClick={() => {
                      if (!editMode) setEditorHtml(markdownToEditorHtml(draftText));
                      setEditMode((m) => !m);
                    }}
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
                      {looksLikeHtml(draftText) ? (
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(normalizeLegacyReviewHtml(draftText)) }} />
                      ) : (
                      <CitationCounterProvider>
                        <ReactMarkdown components={{ em: EvidenceTag, ...citationMarkdownComponents }}>
                          {normalizeReviewHeadings(draftText) || '_Sem conteúdo ainda._'}
                        </ReactMarkdown>
                      </CitationCounterProvider>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`[&_.ProseMirror]:px-5 sm:[&_.ProseMirror]:px-6 [&_.ProseMirror]:py-5 ${READING_PROSE}`}>
                    <RichTextEditor
                      appearance="reading"
                      aiMagicReviewId={review.shared_with_member ? undefined : reviewId}
                      content={editorHtml}
                      onChange={(html) => {
                        setEditorHtml(html);
                        setDraftText(editorHtmlToMarkdown(html));
                      }}
                      placeholder="Digite a avaliação geral do liderado no período..."
                      minHeight="400px"
                    />
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

        </Tabs>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t">
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
            {!review.shared_with_member && (
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
                {isCultureGuided && step < 2 ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      aria-disabled="true"
                      onClick={(e) => e.preventDefault()}
                      className="opacity-50 cursor-not-allowed saturate-50 hover:bg-primary hover:translate-y-0 shadow-none"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Compartilhar com Liderado
                    </Button>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="Por que não posso compartilhar?" className="rounded-full p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[260px] text-xs">
                          Conclua as etapas Cultura e Sinais &amp; Rede para chegar ao Rascunho Geral antes de compartilhar com o liderado.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <Button onClick={handleShareClick} disabled={mirrorRunning}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Compartilhar com Liderado
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetFooter>

        <AlertDialog open={mirrorWarnCount > 0} onOpenChange={(o) => { if (!o) setMirrorWarnCount(0); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>O Espelho tem {mirrorWarnCount} ponto(s) em aberto</AlertDialogTitle>
              <AlertDialogDescription>
                Os alertas são só sugestões. Você pode revisar antes ou compartilhar agora com o texto atual, incluindo as sugestões que já aceitou.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setMirrorWarnCount(0); setActiveTab('mirror'); }}>Revisar no Espelho</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setMirrorWarnCount(0); setShareDialogOpen(true); }}>Compartilhar mesmo assim</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
