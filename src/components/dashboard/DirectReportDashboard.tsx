import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RhythmWave } from '@/components/RhythmWave';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeedbackTimeline } from '@/components/FeedbackTimeline';
import { Home, Compass, FileText, User, Zap, CheckCircle, ChevronRight, Sparkles, Loader2, Download, Bell, Sprout, Plus, CheckCircle2, MessageCircle, Camera } from 'lucide-react';
import { NewPDIDialog } from '@/components/NewPDIDialog';
import { cn } from '@/lib/utils';
import SkillsMapCard from './SkillsMapCard';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { MentorChat } from '@/components/MentorChat';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { AvatarLibrary } from '@/components/avatar/AvatarLibrary';
import { MemberAvatar } from '@/components/MemberAvatar';
import { SelfReflectionCard } from '@/components/dashboard/SelfReflectionCard';
import { PendingPulseAlert } from '@/components/pulse/PendingPulseAlert';
import { StartSelfReviewCard } from '@/components/self-review/StartSelfReviewCard';
import { PendingPeerReviewsAlert } from '@/components/peer-review/PendingPeerReviewsAlert';
import { getDateLocale } from '@/lib/dateLocale';
import { format } from 'date-fns';

interface LinkedMemberData {
  id: string;
  name: string;
  email: string | null;
  role: string;
  updated_at?: string;
  skills_data: {
    role_tenure?: string;
    responsibilities?: string[];
    aspirations?: string;
    interests?: string[];
    onboarding_completed?: boolean;
    ai_analysis?: {
      alignment_score?: number;
      analysis_summary?: string;
      key_gaps?: string[];
      suggested_focus?: string[];
      analyzed_at?: string;
    };
  } | null;
  work_style_data?: Record<string, unknown> | null;
  chronotype?: string | null;
  feedback_style?: string | null;
  recognition_style?: string | null;
  motivators?: unknown[] | null;
  user_manual?: Record<string, unknown> | null;
}

interface DirectReportDashboardProps {
  linkedMember: LinkedMemberData;
  activeTab?: string;
}

const TENURE_KEYS: Record<string, string> = {
  'less_than_1': 'directReport.tenure.lessThan1',
  '1_to_3': 'directReport.tenure.1to3',
  '3_to_5': 'directReport.tenure.3to5',
  'more_than_5': 'directReport.tenure.moreThan5',
};

const CHRONOTYPE_KEYS: Record<string, string> = {
  'early_bird': 'directReport.chronotype.earlyBird',
  'madrugador': 'directReport.chronotype.earlyBird',
  'commercial': 'directReport.chronotype.commercial',
  'comercial': 'directReport.chronotype.commercial',
  'night_owl': 'directReport.chronotype.nightOwl',
  'noturno': 'directReport.chronotype.nightOwl',
  'variable': 'directReport.chronotype.variable',
};

const FEEDBACK_STYLE_KEYS: Record<string, string> = {
  'direct': 'directReport.feedbackStyle.direct',
  'direto': 'directReport.feedbackStyle.direct',
  'empathetic': 'directReport.feedbackStyle.empathetic',
  'empatico': 'directReport.feedbackStyle.empathetic',
  'written': 'directReport.feedbackStyle.written',
  'escrito': 'directReport.feedbackStyle.written',
  'private': 'directReport.feedbackStyle.private',
  'privado': 'directReport.feedbackStyle.private',
  'context': 'directReport.feedbackStyle.context',
};

const RECOGNITION_STYLE_KEYS: Record<string, string> = {
  'public': 'directReport.recognitionStyle.public',
  'publico': 'directReport.recognitionStyle.public',
  'private': 'directReport.recognitionStyle.private',
  'privado': 'directReport.recognitionStyle.private',
  'results': 'directReport.recognitionStyle.results',
  'learning': 'directReport.recognitionStyle.learning',
};

const CHRONOTYPE_CONTEXT_KEYS: Record<string, string> = {
  'early_bird': 'directReport.chronotypeContext.earlyBird',
  'madrugador': 'directReport.chronotypeContext.earlyBird',
  'commercial': 'directReport.chronotypeContext.commercial',
  'comercial': 'directReport.chronotypeContext.commercial',
  'night_owl': 'directReport.chronotypeContext.nightOwl',
  'noturno': 'directReport.chronotypeContext.nightOwl',
};

const FEEDBACK_CONTEXT_KEYS: Record<string, string> = {
  'direct': 'directReport.feedbackContext.direct',
  'direto': 'directReport.feedbackContext.direct',
  'empathetic': 'directReport.feedbackContext.empathetic',
  'empatico': 'directReport.feedbackContext.empathetic',
  'written': 'directReport.feedbackContext.written',
  'escrito': 'directReport.feedbackContext.written',
  'private': 'directReport.feedbackContext.private',
  'privado': 'directReport.feedbackContext.private',
};

const RECOGNITION_CONTEXT_KEYS: Record<string, string> = {
  'public': 'directReport.recognitionContext.public',
  'publico': 'directReport.recognitionContext.public',
  'private': 'directReport.recognitionContext.private',
  'privado': 'directReport.recognitionContext.private',
  'results': 'directReport.recognitionContext.results',
  'learning': 'directReport.recognitionContext.learning',
};

const MOTIVATOR_KEYS = ['autonomy', 'money', 'stability', 'learning', 'purpose', 'status'] as const;

const getDaysSince = (dateStr: string | null | undefined): number | null => {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const filterReviewForMember = (content: string): string => {
  const lines = content.split('\n');
  let inDicasBlock = false;
  const filtered: string[] = [];
  for (const line of lines) {
    if (line.includes('Dicas para Apresentação') || line.includes('Como Apresentar Esta')) {
      inDicasBlock = true;
      continue;
    }
    if (inDicasBlock && (line.startsWith('##') || /^[📊💪🎯🚀]/.test(line))) {
      inDicasBlock = false;
    }
    if (!inDicasBlock) filtered.push(line);
  }
  return filtered.join('\n').trim();
};

export default function DirectReportDashboard({ linkedMember, activeTab: activeTabProp }: DirectReportDashboardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(activeTabProp || 'visao-geral');

  useEffect(() => {
    if (activeTabProp) setActiveTab(activeTabProp);
  }, [activeTabProp]);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncSaving, setSyncSaving] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [showPDIDialog, setShowPDIDialog] = useState(false);
  const [meuRhitmoOpen, setMeuRhitmoOpen] = useState(false);
  const [meuRhitmoInitialPrompt, setMeuRhitmoInitialPrompt] = useState<string | undefined>();
  const [avatarLibraryOpen, setAvatarLibraryOpen] = useState(false);
  const queryClient = useQueryClient();

  const [syncForm, setSyncForm] = useState({
    chronotype: '',
    work_environment: '',
    energy_drains: '',
    energy_sources: '',
    stress_signs: '',
    support_needed: '',
    feedback_style: '',
    recognition_style: '',
    motivators: [] as string[],
    skill_goal: '',
  });

  // Pre-populate form when dialog opens
  useEffect(() => {
    if (syncDialogOpen) {
      const wsd = linkedMember.work_style_data as any;
      const um = linkedMember.user_manual as any;
      setSyncForm({
        chronotype: linkedMember.chronotype || '',
        work_environment: wsd?.work_environment || '',
        energy_drains: um?.energy_drainers || wsd?.energy_drains || '',
        energy_sources: um?.energy_boosters || wsd?.energy_sources || '',
        stress_signs: um?.stress_signs || wsd?.stress_signs || '',
        support_needed: um?.bad_day_support || wsd?.support_needed || '',
        feedback_style: linkedMember.feedback_style || '',
        recognition_style: linkedMember.recognition_style || '',
        motivators: (Array.isArray(linkedMember.motivators) && linkedMember.motivators.length > 0
          ? linkedMember.motivators as string[]
          : wsd?.motivators || []),
        skill_goal: um?.skill_goal || wsd?.skill_goal || '',
      });
    }
  }, [syncDialogOpen, linkedMember]);

  // Fix nome concatenado
  const displayName = linkedMember.name?.replace(linkedMember.role, '').trim() || linkedMember.name;

  const getTranslatedLabel = (keyMap: Record<string, string>, value: string) => {
    const key = keyMap[value];
    return key ? t(key) : value.charAt(0).toUpperCase() + value.slice(1);
  };

  const formatLocalDate = (dateStr: string, fmt = 'dd MMM yyyy') =>
    format(new Date(dateStr), fmt, { locale: getDateLocale(i18n.language) });

  // Query feedbacks do próprio membro (visibility = 'shared')
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['my-feedbacks', linkedMember.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('id, created_at, occurred_at, content, type, tags, title')
        .eq('member_id', linkedMember.id)
        .eq('visibility', 'shared')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching feedbacks:', error);
        return [];
      }
      return (data || []) as Array<{
        id: string;
        created_at: string;
        occurred_at?: string;
        content: string;
        type: 'positive' | 'constructive' | 'neutral';
        tags?: string[];
        title?: string | null;
      }>;
    },
  });

  const responsibilities = linkedMember.skills_data?.responsibilities || [];
  const tenure = linkedMember.skills_data?.role_tenure;
  const aiAnalysis = linkedMember.skills_data?.ai_analysis;
  const hasRhitmoSync = !!(linkedMember.work_style_data || linkedMember.chronotype || linkedMember.feedback_style || linkedMember.recognition_style);

  // Query shared performance reviews — apenas reviews do líder (manager). Auto-avaliações
  // do próprio liderado vão em uma sub-seção separada (`my-self-reviews`) para não confundir
  // a visualização do que é "feedback recebido" vs "auto-reflexão".
  const { data: sharedReviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['shared-reviews', linkedMember.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('id, title, content, period_type, period_start, period_end, created_at, member_viewed_at, acknowledged_at, sent_at, review_type')
        .eq('member_id', linkedMember.id)
        .eq('shared_with_member', true)
        .neq('review_type', 'self')
        .order('created_at', { ascending: false });
      if (error) { console.error('Error fetching shared reviews:', error); return []; }
      return data || [];
    },
  });

  // Sprint 10.2 — auto-avaliações do próprio liderado.
  const { data: mySelfReviews = [] } = useQuery({
    queryKey: ['my-self-reviews', linkedMember.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('id, title, content, created_at, review_type')
        .eq('member_id', linkedMember.id)
        .eq('review_type', 'self')
        .eq('author_user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) { console.error('Error fetching self reviews:', error); return []; }
      return data || [];
    },
  });

  const unreadReviews = sharedReviews.filter((r: any) => !r.member_viewed_at);

  // Query PDI (development plan)
  const { data: devPlan } = useQuery({
    queryKey: ['my-dev-plan', linkedMember.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('development_plans')
        .select('*')
        .eq('member_id', linkedMember.id)
        .in('status', ['draft', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) { console.error('Error fetching dev plan:', error); return null; }
      return data;
    },
  });

  const { data: devItems = [] } = useQuery({
    queryKey: ['my-dev-items', devPlan?.id],
    queryFn: async () => {
      if (!devPlan?.id) return [];
      const { data, error } = await supabase
        .from('development_items')
        .select('*')
        .eq('plan_id', devPlan.id)
        .order('created_at', { ascending: true });
      if (error) { console.error('Error fetching dev items:', error); return []; }
      return data || [];
    },
    enabled: !!devPlan?.id,
  });

  // Active PDI items for MeuRhitmo context
  const activePdiItems = (devItems as any[]).filter((item: any) => item.status !== 'completed');

  // Latest shared review for MeuRhitmo context
  const { data: latestReviewContent } = useQuery({
    queryKey: ['latest-review-content', linkedMember.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('performance_reviews')
        .select('content')
        .eq('member_id', linkedMember.id)
        .eq('shared_with_member', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.content || null;
    },
  });

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
    const { error } = await supabase
      .from('development_items')
      .update(updates)
      .eq('id', itemId);
    if (error) { toast.error(t('directReport.toast.errorUpdateItem')); return; }
    toast.success(newStatus === 'completed' ? t('directReport.toast.goalCompleted') : t('directReport.toast.statusUpdated'));
    queryClient.invalidateQueries({ queryKey: ['my-dev-items', devPlan?.id] });
  };

  // Mark review as read when opened
  useEffect(() => {
    if (selectedReview && !selectedReview.member_viewed_at) {
      supabase
        .rpc('member_view_review', { p_review_id: selectedReview.id })
        .then(() => queryClient.invalidateQueries({ queryKey: ['shared-reviews', linkedMember.id] }));
    }
  }, [selectedReview?.id]);

  const handleToggleMotivator = (m: string) => {
    setSyncForm(prev => {
      const has = prev.motivators.includes(m);
      if (has) return { ...prev, motivators: prev.motivators.filter(x => x !== m) };
      if (prev.motivators.length >= 3) return prev;
      return { ...prev, motivators: [...prev.motivators, m] };
    });
  };

  const handleSaveSync = async () => {
    setSyncSaving(true);
    try {
      const existingWsd = (linkedMember.work_style_data as Record<string, unknown>) || {};
      const existingUm = (linkedMember.user_manual as Record<string, unknown>) || {};
      const { error } = await supabase
        .from('team_members')
        .update({
          chronotype: syncForm.chronotype || null,
          feedback_style: syncForm.feedback_style || null,
          recognition_style: syncForm.recognition_style || null,
          motivators: syncForm.motivators.length > 0 ? syncForm.motivators : null,
          user_manual: {
            ...existingUm,
            energy_drainers: syncForm.energy_drains || null,
            energy_boosters: syncForm.energy_sources || null,
            stress_signs: syncForm.stress_signs || null,
            bad_day_support: syncForm.support_needed || null,
            skill_goal: syncForm.skill_goal || null,
          },
          work_style_data: {
            ...existingWsd,
            work_environment: syncForm.work_environment || null,
            energy_drains: syncForm.energy_drains || null,
            energy_sources: syncForm.energy_sources || null,
            stress_signs: syncForm.stress_signs || null,
            support_needed: syncForm.support_needed || null,
            motivators: syncForm.motivators.length > 0 ? syncForm.motivators : null,
            skill_goal: syncForm.skill_goal || null,
          },
        })
        .eq('id', linkedMember.id);

      if (error) throw error;

      console.log('[Rhitmo Sync] Updated successfully for member:', linkedMember.id);
      toast.success(t('directReport.toast.syncUpdated'));
      setSyncDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['linked-member'] });
    } catch (err) {
      console.error('Error saving sync:', err);
      toast.error(t('directReport.toast.errorSave'));
    } finally {
      setSyncSaving(false);
    }
  };

  const handleReanalyze = async () => {
    if (!linkedMember || !user) return;
    setIsReanalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-job-crafting', {
        body: {
          role: linkedMember.role,
          responsibilities: linkedMember.skills_data?.responsibilities || [],
          aspirations: linkedMember.skills_data?.aspirations || '',
          interests: linkedMember.skills_data?.interests || [],
        },
      });
      if (error) throw error;

      await supabase
        .from('team_members')
        .update({
          skills_data: {
            ...linkedMember.skills_data,
            ai_analysis: {
              ...data,
              analyzed_at: new Date().toISOString(),
            },
          },
        } as any)
        .eq('linked_user_id', user.id);

      await queryClient.invalidateQueries({ queryKey: ['linked-member'] });
      toast.success(t('directReport.toast.analysisUpdated'));
    } catch (err) {
      console.error('[handleReanalyze] Error:', err);
      toast.error(t('directReport.toast.errorAnalysis'));
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleSuggestOneOnOne = (focusArea: string) => {
    const text = t('directReport.suggestOneOnOneText', { focusArea });
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t('directReport.toast.oneOnOneCopied'));
    }).catch(() => {
      toast.error(t('directReport.toast.errorCopy'));
    });
  };

  const handleOpenMeuRhitmoWithContext = (focusArea: string) => {
    const prompt = t('directReport.meuRhitmoPrompt', { focusArea });
    setMeuRhitmoInitialPrompt(prompt);
    setMeuRhitmoOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ═══ HERO STRIP ═══ */}
      <div className="relative bg-primary/5 border-b border-border/50 overflow-hidden">
        <div className="absolute inset-0 flex items-end">
          <RhythmWave variant="hero" className="opacity-60" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">{t('directReport.myPanel')}</p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-serif">
                {t('directReport.hello', { name: displayName })} 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {feedbacks.length > 0
                  ? `${t('directReport.feedbackCount', { count: feedbacks.length })} · ${devItems.length > 0 ? t('directReport.pdiProgress', { percent: Math.round(((devItems as any[]).filter((i: any) => i.status === 'completed').length / devItems.length) * 100) }) : linkedMember.role}`
                  : `${t('directReport.collaboratorPanel')} · ${linkedMember.role}`}
              </p>
            </div>
            <Button onClick={() => setMeuRhitmoOpen(true)} variant="outline" className="gap-2 rounded-full h-11 px-6">
              <Sparkles className="h-4 w-4" />
              {t('directReport.meuRhitmo')}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* TabsList hidden — navigation moved to sidebar */}

          {/* ═══ TAB 1: Visão Geral ═══ */}
          <TabsContent value="visao-geral">
            {/* Sprint 9.2 — Pulse Surveys pendentes (aparece só se houver) */}
            <PendingPulseAlert memberId={linkedMember.id} />
            <PendingPeerReviewsAlert />

            {/* S3.4 — Self-reflection card semanal */}
            <div className="mb-6">
              <SelfReflectionCard memberId={linkedMember.id} />
            </div>

            {/* Seção Novidades — apenas se houver reviews não lidas */}
            {unreadReviews.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-3 text-foreground">
                  <Bell className="h-5 w-5 text-primary" />
                  {t('directReport.news')}
                </h2>
                {unreadReviews.map((review: any) => (
                  <div
                    key={review.id}
                    onClick={() => {
                      setActiveTab('feedbacks');
                      setSelectedReview(review);
                    }}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors mb-2"
                  >
                    <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{t('directReport.newReviewAvailable')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        &ldquo;{review.title}&rdquo; {t('directReport.sharedByLeader')}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pulse Card - 1/3 */}
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] lg:col-span-1">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-4 text-foreground">
                  <Zap className="h-5 w-5 text-primary" />
                  {t('directReport.yourPulse')}
                </h2>
                <div className="space-y-4">
                  {/* Last feedback */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('directReport.lastFeedback')}</p>
                    {feedbacks.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${feedbacks[0].type === 'positive' ? 'bg-emerald-500' : feedbacks[0].type === 'constructive' ? 'bg-amber-500' : 'bg-muted-foreground/40'}`} />
                        <span className="text-sm font-medium text-foreground">
                          {getDaysSince(feedbacks[0].created_at) === 0 ? t('common.today') : getDaysSince(feedbacks[0].created_at) === 1 ? t('common.yesterday') : t('directReport.daysAgo', { count: getDaysSince(feedbacks[0].created_at) })}
                        </span>
                        <Badge variant="secondary" className="text-[10px] rounded-full">
                          {feedbacks[0].type === 'positive' ? t('directReport.feedbackType.positive') : feedbacks[0].type === 'constructive' ? t('directReport.feedbackType.constructive') : t('directReport.feedbackType.neutral')}
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('directReport.noneYet')}</p>
                    )}
                  </div>

                  {/* PDI progress */}
                  {devItems.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('directReport.pdiProgressLabel')}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.round(((devItems as any[]).filter((i: any) => i.status === 'completed').length / devItems.length) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {(devItems as any[]).filter((i: any) => i.status === 'completed').length}/{devItems.length}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Reviews count */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('directReport.reviews')}</span>
                    <span className="text-sm font-medium text-foreground">{sharedReviews.length}</span>
                  </div>
                </div>
              </Card>

              {/* Contextual Actions - 2/3 */}
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] lg:col-span-2">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-4 text-foreground">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  {t('directReport.nextActions')}
                </h2>
                <div className="space-y-3">
                  {(() => {
                    const actions: { text: string; action: () => void; priority?: boolean }[] = [];

                    // Unread review
                    if (unreadReviews.length > 0) {
                      actions.push({
                        text: `📋 ${t('directReport.action.readReview', { title: unreadReviews[0].title })}`,
                        action: () => { setActiveTab('feedbacks'); setSelectedReview(unreadReviews[0]); },
                        priority: true,
                      });
                    }

                    // Overdue PDI items
                    const overdueItems = (devItems as any[]).filter((i: any) => i.status !== 'completed' && i.due_date && new Date(i.due_date) < new Date());
                    if (overdueItems.length > 0) {
                      actions.push({
                        text: `🎯 ${t('directReport.action.overdueItem', { title: overdueItems[0].title })}`,
                        action: () => setActiveTab('carreira'),
                        priority: true,
                      });
                    }

                    // No Rhitmo Sync
                    if (!hasRhitmoSync) {
                      actions.push({
                        text: `🧠 ${t('directReport.action.completeSync')}`,
                        action: () => setActiveTab('perfil'),
                      });
                    }

                    // Default actions if nothing urgent
                    if (actions.length === 0) {
                      return (
                        <div className="flex flex-col items-center text-center py-6">
                          <CheckCircle2 className="h-10 w-10 text-primary/30 mb-3" />
                          <p className="text-sm font-medium text-foreground">{t('directReport.allCaughtUp')} 🎉</p>
                          <p className="text-xs text-muted-foreground mt-1">{t('directReport.exploreMeuRhitmo')}</p>
                          <Button variant="outline" size="sm" className="mt-3 gap-1.5 rounded-xl" onClick={() => setMeuRhitmoOpen(true)}>
                            <Sparkles className="h-3.5 w-3.5" />
                            {t('directReport.openMeuRhitmo')}
                          </Button>
                        </div>
                      );
                    }

                    // Add a filler if less than 3 actions
                    if (actions.length < 3 && feedbacks.length > 0) {
                      actions.push({ text: `💬 ${t('directReport.action.talkMeuRhitmo')}`, action: () => setMeuRhitmoOpen(true) });
                    }

                    return actions.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        onClick={item.action}
                        className={cn(
                          "rounded-xl p-3 text-sm text-foreground flex items-center justify-between cursor-pointer transition-colors",
                          item.priority ? "bg-primary/5 border border-primary/15 hover:bg-primary/10" : "bg-muted/40 hover:bg-muted/60"
                        )}
                      >
                        <span>{item.text}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    ));
                  })()}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ TAB 2: Minha Carreira ═══ */}
          <TabsContent value="carreira">
            <div className="mt-6 space-y-6">
              <SkillsMapCard
                aiAnalysis={aiAnalysis ?? null}
                memberId={linkedMember.id}
                onReanalyze={handleReanalyze}
                isReanalyzing={isReanalyzing}
                onSuggestOneOnOne={handleSuggestOneOnOne}
                onOpenMeuRhitmo={handleOpenMeuRhitmoWithContext}
              />
              {/* Seção Meu Desenvolvimento (PDI) */}
              {!devPlan || devPlan.status === 'draft' ? (
                <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Sprout className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold tracking-tight text-foreground">{t('directReport.myDevelopment')}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    {t('directReport.developmentDescription')}
                  </p>
                  {devPlan?.status === 'draft' && devPlan.leader_comment && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
                      <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">{t('directReport.leaderFeedback')}</p>
                      <p className="text-sm italic text-foreground">"{devPlan.leader_comment}"</p>
                    </div>
                  )}
                  {linkedMember.skills_data?.aspirations && (
                    <div className="bg-muted/40 rounded-xl p-4 mb-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t('directReport.youSaidYouWant')}</p>
                      <p className="text-sm italic text-foreground">"{linkedMember.skills_data.aspirations}"</p>
                    </div>
                  )}
                  <Button onClick={() => setShowPDIDialog(true)} size="lg" className="gap-2 w-full">
                    <Plus className="h-4 w-4" />
                    {t('directReport.proposeDevAction')}
                  </Button>
                </Card>
              ) : devPlan.status === 'active' ? (
                <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sprout className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-bold tracking-tight text-foreground">{t('directReport.myDevelopment')}</h2>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-xs">✓ {t('directReport.active')}</Badge>
                  </div>
                  {devPlan.period_label && <p className="text-sm text-muted-foreground mb-3">{t('directReport.period')}: {devPlan.period_label}</p>}
                  {(devItems as any[]).map((item: any) => (
                    <div key={item.id} className={cn("flex items-start gap-3 py-3 border-b border-border last:border-0", item.status === 'completed' && "opacity-60")}>
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", item.category === 'aprender' && "bg-blue-400", item.category === 'praticar' && "bg-purple-400", item.category === 'entregar' && "bg-emerald-400")} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium text-foreground", item.status === 'completed' && "line-through")}>{item.title}</p>
                        {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                        {item.due_date && <p className="text-xs text-muted-foreground mt-1">{t('directReport.deadline')}: {formatLocalDate(item.due_date, 'dd MMM yyyy')}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.status === 'completed' ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-xs">{t('directReport.completed')}</Badge>
                        ) : item.status === 'in_progress' ? (
                          <Button variant="ghost" size="sm" className="text-emerald-600 text-xs" onClick={() => updateItemStatus(item.id, 'completed')}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> {t('directReport.complete')}
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateItemStatus(item.id, 'in_progress')}>{t('directReport.start')}</Button>
                            <Button variant="ghost" size="sm" className="text-emerald-600 text-xs" onClick={() => updateItemStatus(item.id, 'completed')}>
                              <CheckCircle2 className="h-4 w-4 mr-1" /> {t('directReport.complete')}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </Card>
              ) : null}

              <NewPDIDialog open={showPDIDialog} onOpenChange={setShowPDIDialog} memberId={linkedMember.id} />

              
            </div>
          </TabsContent>

          {/* ═══ TAB 3: Feedbacks ═══ */}
          <TabsContent value="feedbacks">
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">{t('directReport.feedbacksFromLeader')}</h2>
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('directReport.noSharedNotes')}</p>
                    <p className="text-sm">{t('directReport.leaderCanShare')}</p>
                  </div>
                ) : (
                  <FeedbackTimeline feedbacks={feedbacks} />
                )}
              </Card>

              {/* Seção de Avaliações Formais */}
              <div className="mt-8 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  {t('directReport.formalReviews')}
                </h2>

                {/* Sprint 10.2 — Card de auto-avaliação (sempre visível) */}
                {user?.id && (
                  <StartSelfReviewCard
                    memberId={linkedMember.id}
                    memberName={linkedMember.name}
                    authorUserId={user.id}
                    selfReviewCount={mySelfReviews.length}
                  />
                )}

                {/* Reviews compartilhadas pelo líder */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    Avaliações do seu líder
                  </h3>
                  {loadingReviews ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : sharedReviews.length === 0 ? (
                    <Card className="p-8 text-center rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                      <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {t('directReport.noSharedReviews')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('directReport.leaderWillShare')}
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {sharedReviews.map((review: any) => (
                        <Card
                          key={review.id}
                          className="p-5 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
                          onClick={() => setSelectedReview(review)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm text-foreground">{review.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatLocalDate(review.created_at, 'dd MMMM yyyy')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {review.acknowledged_at ? (
                                <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-0 text-[10px]">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {t('directReport.confirmed')}
                                </Badge>
                              ) : !review.member_viewed_at ? (
                                <Badge className="bg-primary/10 text-primary border-0 text-[10px]">{t('directReport.new')}</Badge>
                              ) : null}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sprint 10.2 — Suas auto-avaliações enviadas */}
                {mySelfReviews.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                      Suas auto-avaliações
                    </h3>
                    <div className="space-y-3">
                      {mySelfReviews.map((review: any) => (
                        <Card
                          key={review.id}
                          className="p-5 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
                          onClick={() => setSelectedReview(review)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm text-foreground">{review.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatLocalDate(review.created_at, 'dd MMMM yyyy')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Auto-avaliação
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dialog de leitura da avaliação */}
            <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedReview?.title}</DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {selectedReview && formatLocalDate(selectedReview.created_at, 'dd MMMM yyyy')}
                  </p>
                </DialogHeader>
                <div className="prose prose-sm max-w-none mt-4">
                  {(() => {
                    const filtered = filterReviewForMember(selectedReview?.content || '');
                    if (filtered.includes('</')) {
                      return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(filtered) }} />;
                    }
                    return <ReactMarkdown>{filtered}</ReactMarkdown>;
                  })()}
                </div>

                <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-border">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        if (!selectedReview) return;
                        const printWindow = window.open('', '_blank');
                        if (!printWindow) return;
                        const filtered = filterReviewForMember(selectedReview.content || '');
                        const htmlContent = filtered.includes('</') ? filtered : marked(filtered);
                        const dateStr = formatLocalDate(selectedReview.created_at, 'dd MMMM yyyy');
                        printWindow.document.write(`<!DOCTYPE html><html><head><title>${selectedReview.title}</title><style>body{font-family:'Segoe UI',Arial,sans-serif;padding:2cm;line-height:1.6;color:#333}h1{color:#222;border-bottom:3px solid #7C3AED;padding-bottom:16px}h2{color:#444;margin-top:28px}ul,ol{padding-left:24px}li{margin:6px 0}</style></head><body><h1>${selectedReview.title}</h1><p style="color:#666">${dateStr}</p>${htmlContent}</body></html>`);
                        printWindow.document.close();
                        setTimeout(() => printWindow.print(), 300);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      {t('directReport.exportPDF')}
                    </Button>
                  </div>
                  {!selectedReview?.acknowledged_at && (
                    <Button
                      className="gap-2"
                      onClick={async () => {
                        if (!selectedReview) return;
                        const { error } = await supabase
                          .rpc('member_acknowledge_review', { p_review_id: selectedReview.id });
                        if (error) {
                          toast.error(t('directReport.toast.errorConfirm'));
                          return;
                        }
                        toast.success(t('directReport.toast.readingConfirmed'));
                        setSelectedReview({ ...selectedReview, acknowledged_at: new Date().toISOString() });
                        queryClient.invalidateQueries({ queryKey: ['shared-reviews', linkedMember.id] });
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t('directReport.confirmReading')}
                    </Button>
                  )}
                  {selectedReview?.acknowledged_at && (
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('directReport.readingConfirmedOn', { date: formatLocalDate(selectedReview.acknowledged_at) })}
                    </Badge>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ═══ TAB 4: Meu Perfil ═══ */}
          <TabsContent value="perfil">
            {/* Avatar Section */}
            <div className="mb-6 mt-6">
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <MemberAvatar
                      memberId={linkedMember.id}
                      memberName={linkedMember.name}
                      avatarUrl={(linkedMember as any).avatar}
                      size="xl"
                      className="rounded-2xl border-2 border-border shadow-sm"
                    />
                    <button
                      onClick={() => setAvatarLibraryOpen(true)}
                      className="absolute inset-0 rounded-2xl bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Camera className="h-5 w-5 text-background" />
                    </button>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-foreground">{displayName}</h2>
                    <p className="text-sm text-muted-foreground">{linkedMember.role}</p>
                    <Button variant="outline" size="sm" className="mt-2 gap-1.5 rounded-full text-xs" onClick={() => setAvatarLibraryOpen(true)}>
                      <Camera className="h-3.5 w-3.5" />
                      {t('directReport.changeAvatar')}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informações da função */}
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-foreground">
                    <User className="h-5 w-5 text-primary" />
                    {t('directReport.roleInfo')}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast(t('directReport.toast.profileEditTitle'), { description: t('directReport.toast.profileEditDesc') })}
                  >
                    {t('common.edit')}
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('directReport.jobTitle')}</p>
                    <p className="font-medium text-foreground">{linkedMember.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('directReport.timeInRole')}</p>
                    <p className="font-medium text-foreground">
                      {tenure ? getTranslatedLabel(TENURE_KEYS, tenure) : '-'}
                    </p>
                  </div>
                  {responsibilities.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{t('directReport.responsibilities')}</p>
                      <ul className="list-disc list-inside space-y-1">
                        {responsibilities.map((resp, i) => (
                          <li key={i} className="text-foreground">{resp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {linkedMember.skills_data?.aspirations && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t('directReport.aspirations')}</p>
                      <p className="text-foreground">{linkedMember.skills_data.aspirations}</p>
                    </div>
                  )}
                  {linkedMember.skills_data?.interests && linkedMember.skills_data.interests.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{t('directReport.interests')}</p>
                      <div className="flex flex-wrap gap-2">
                        {linkedMember.skills_data.interests.map((interest, i) => (
                          <span key={i} className="px-2 py-1 bg-muted rounded-xl text-sm text-foreground">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Rhitmo Sync */}
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-foreground">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {t('directReport.myRhitmoSync')}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{t('directReport.syncSubtitle')}</p>

                {(() => {
                  const syncDate = (linkedMember.work_style_data as any)?.completed_at || linkedMember.updated_at;
                  const days = getDaysSince(syncDate);
                  if (days !== null && days <= 180) {
                    return (
                      <p className="text-xs text-muted-foreground mb-4">
                        {t('directReport.updatedDaysAgo', { count: days })}
                      </p>
                    );
                  }
                  if (days !== null && days > 180) {
                    return (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 mt-1 mb-4">
                        <span className="text-amber-500 text-sm">⏰</span>
                        <div>
                          <p className="text-xs font-medium text-amber-700">{t('directReport.profileOutdated')}</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            {t('directReport.profileOutdatedDesc')}
                          </p>
                          <button
                            onClick={() => setSyncDialogOpen(true)}
                            className="text-xs text-amber-700 font-semibold underline mt-1"
                          >
                            {t('directReport.updateNow')}
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return <div className="mb-4" />;
                })()}

                {hasRhitmoSync ? (
                  <div className="space-y-3">
                    {linkedMember.chronotype && (
                      <div>
                        <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary text-xs px-3 py-1">
                          {getTranslatedLabel(CHRONOTYPE_KEYS, linkedMember.chronotype)}
                        </Badge>
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {CHRONOTYPE_CONTEXT_KEYS[linkedMember.chronotype] ? t(CHRONOTYPE_CONTEXT_KEYS[linkedMember.chronotype]) : t('directReport.chronotypeContext.default')}
                        </p>
                      </div>
                    )}
                    {linkedMember.feedback_style && (
                      <div>
                        <Badge variant="secondary" className="rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs px-3 py-1">
                          {getTranslatedLabel(FEEDBACK_STYLE_KEYS, linkedMember.feedback_style)}
                        </Badge>
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {FEEDBACK_CONTEXT_KEYS[linkedMember.feedback_style] ? t(FEEDBACK_CONTEXT_KEYS[linkedMember.feedback_style]) : t('directReport.feedbackContext.default')}
                        </p>
                      </div>
                    )}
                    {linkedMember.recognition_style && (
                      <div>
                        <Badge variant="secondary" className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs px-3 py-1">
                          {getTranslatedLabel(RECOGNITION_STYLE_KEYS, linkedMember.recognition_style)}
                        </Badge>
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {RECOGNITION_CONTEXT_KEYS[linkedMember.recognition_style] ? t(RECOGNITION_CONTEXT_KEYS[linkedMember.recognition_style]) : t('directReport.recognitionContext.default')}
                        </p>
                      </div>
                    )}
                    {(linkedMember.work_style_data as any)?.motivators?.length > 0 && (
                      <div>
                        <div className="flex flex-wrap gap-2">
                          {(linkedMember.work_style_data as any).motivators.map((m: string) => (
                            <Badge key={m} variant="secondary" className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs px-3 py-1">
                              {m}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {t('directReport.motivatorContext')}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">{t('directReport.noSyncYet')}</p>
                    <p className="text-xs mt-1">{t('directReport.completeSyncHint')}</p>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSyncDialogOpen(true)}
                  >
                    {t('directReport.updateSync')}
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ═══ Dialog: Editar Rhitmo Sync ═══ */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('directReport.syncDialog.title')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* ── Seção: Ritmo e Energia ── */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">{t('directReport.syncDialog.rhythmEnergy')}</p>

            <div className="space-y-2">
              <Label>{t('directReport.syncDialog.whenProductive')}</Label>
              <Select value={syncForm.chronotype} onValueChange={(v) => setSyncForm(prev => ({ ...prev, chronotype: v }))}>
                <SelectTrigger><SelectValue placeholder={t('directReport.syncDialog.selectPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="madrugador">{t('directReport.syncDialog.earlyBird')}</SelectItem>
                  <SelectItem value="comercial">{t('directReport.syncDialog.commercial')}</SelectItem>
                  <SelectItem value="noturno">{t('directReport.syncDialog.nightOwl')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('directReport.syncDialog.idealEnvironment')}</Label>
              <Select value={syncForm.work_environment} onValueChange={(v) => setSyncForm(prev => ({ ...prev, work_environment: v }))}>
                <SelectTrigger><SelectValue placeholder={t('directReport.syncDialog.selectPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="silencioso">{t('directReport.syncDialog.envQuiet')}</SelectItem>
                  <SelectItem value="dinamico">{t('directReport.syncDialog.envDynamic')}</SelectItem>
                  <SelectItem value="flexivel">{t('directReport.syncDialog.envFlexible')}</SelectItem>
                  <SelectItem value="remoto">{t('directReport.syncDialog.envRemote')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('directReport.syncDialog.energyDrains')}</Label>
              <Textarea placeholder={t('directReport.syncDialog.energyDrainsPlaceholder')} maxLength={200} value={syncForm.energy_drains} onChange={(e) => setSyncForm(prev => ({ ...prev, energy_drains: e.target.value }))} />
              <p className="text-xs text-muted-foreground text-right">{syncForm.energy_drains.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label>{t('directReport.syncDialog.energySources')}</Label>
              <Textarea placeholder={t('directReport.syncDialog.energySourcesPlaceholder')} maxLength={200} value={syncForm.energy_sources} onChange={(e) => setSyncForm(prev => ({ ...prev, energy_sources: e.target.value }))} />
              <p className="text-xs text-muted-foreground text-right">{syncForm.energy_sources.length}/200</p>
            </div>

            {/* ── Seção: Manual de Instruções ── */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">{t('directReport.syncDialog.userManual')}</p>

            <div className="space-y-2">
              <Label>{t('directReport.syncDialog.stressSigns')}</Label>
              <Textarea placeholder={t('directReport.syncDialog.stressSignsPlaceholder')} maxLength={200} value={syncForm.stress_signs} onChange={(e) => setSyncForm(prev => ({ ...prev, stress_signs: e.target.value }))} />
              <p className="text-xs text-muted-foreground text-right">{syncForm.stress_signs.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label>{t('directReport.syncDialog.badDaySupport')}</Label>
              <Textarea placeholder={t('directReport.syncDialog.badDaySupportPlaceholder')} maxLength={200} value={syncForm.support_needed} onChange={(e) => setSyncForm(prev => ({ ...prev, support_needed: e.target.value }))} />
              <p className="text-xs text-muted-foreground text-right">{syncForm.support_needed.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label>{t('directReport.syncDialog.feedbackPreference')}</Label>
              <Select value={syncForm.feedback_style} onValueChange={(v) => setSyncForm(prev => ({ ...prev, feedback_style: v }))}>
                <SelectTrigger><SelectValue placeholder={t('directReport.syncDialog.selectPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direto">{t('directReport.syncDialog.feedbackDirect')}</SelectItem>
                  <SelectItem value="empatico">{t('directReport.syncDialog.feedbackEmpathetic')}</SelectItem>
                  <SelectItem value="escrito">{t('directReport.syncDialog.feedbackWritten')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('directReport.syncDialog.recognitionPreference')}</Label>
              <Select value={syncForm.recognition_style} onValueChange={(v) => setSyncForm(prev => ({ ...prev, recognition_style: v }))}>
                <SelectTrigger><SelectValue placeholder={t('directReport.syncDialog.selectPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="publico">{t('directReport.syncDialog.recognitionPublic')}</SelectItem>
                  <SelectItem value="privado">{t('directReport.syncDialog.recognitionPrivate')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Seção: Futuro ── */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">{t('directReport.syncDialog.future')}</p>

            <div className="space-y-2">
              <Label>{t('directReport.syncDialog.motivators')}</Label>
              <div className="flex flex-wrap gap-2">
                {MOTIVATOR_KEYS.map((key) => {
                  const label = t(`directReport.motivator.${key}`);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleToggleMotivator(label)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        syncForm.motivators.includes(label)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('directReport.syncDialog.skillGoal')}</Label>
              <Textarea placeholder={t('directReport.syncDialog.skillGoalPlaceholder')} maxLength={200} value={syncForm.skill_goal} onChange={(e) => setSyncForm(prev => ({ ...prev, skill_goal: e.target.value }))} />
              <p className="text-xs text-muted-foreground text-right">{syncForm.skill_goal.length}/200</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)} disabled={syncSaving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveSync} disabled={syncSaving}>
              {syncSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meu Rhitmo Dialog */}
      {user && (
        <MentorChat
          open={meuRhitmoOpen}
          onOpenChange={(open) => {
            setMeuRhitmoOpen(open);
            if (!open) setMeuRhitmoInitialPrompt(undefined);
          }}
          userType="direct_report"
          memberName={displayName}
          memberRole={linkedMember.role}
          workStyleData={linkedMember.work_style_data}
          aiAnalysis={aiAnalysis}
          pdiItems={activePdiItems}
          latestReview={latestReviewContent ?? null}
          userId={user.id}
          initialPrompt={meuRhitmoInitialPrompt}
        />
      )}
      <AvatarLibrary
        open={avatarLibraryOpen}
        onOpenChange={setAvatarLibraryOpen}
        memberId={linkedMember.id}
        currentAvatar={(linkedMember as any).avatar}
      />
    </div>
  );
}
