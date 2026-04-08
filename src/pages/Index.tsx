import { useState, useEffect } from 'react';
import { RhythmWave } from '@/components/RhythmWave';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TeamMemberCard } from '@/components/TeamMemberCard';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { NewMemberDialog } from '@/components/NewMemberDialog';
import { EditWorkspaceDialog } from '@/components/EditWorkspaceDialog';
import { NewTeamDialog } from '@/components/NewTeamDialog';
import { EditMemberDialog } from '@/components/EditMemberDialog';
import { EditTeamDialog } from '@/components/EditTeamDialog';
import { DeleteTeamDialog } from '@/components/DeleteTeamDialog';
import { TeamTabs } from '@/components/TeamTabs';
import { SetupChecklist } from '@/components/SetupChecklist';
import { LeaderSyncWizard } from '@/components/LeaderSyncWizard';
import { ActivityPreview } from '@/components/ActivityPreview';
import { ActivitySheet } from '@/components/ActivitySheet';
import { useAuth } from '@/hooks/useAuth';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import DirectReportDashboard from '@/components/dashboard/DirectReportDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PenSquare, Users, Loader2, UserPlus, Pencil, Settings, Trash2, Calendar, FileText, Bell, Video, ChevronRight, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Workspace, Team } from '@/types/team';
import { PendingInvitesSection } from '@/components/team/PendingInvitesSection';
import { UpgradeBanner } from '@/components/billing/UpgradeBanner';
import { format, formatDistanceToNow, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  performance_score: number;
  created_at: string;
  feedback_count?: number;
  last_feedback_date?: string;
  teamId?: string;
  team_id?: string;
  lastFeedback?: string;
  feedbackCount?: number;
  performanceScore?: number;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { linkedMember, isLinkedMember, needsOnboarding, isLoading: linkedMemberLoading } = useLinkedMember();
  const { canAddMember, limits } = usePlanLimits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false);
  const [leaderSyncOpen, setLeaderSyncOpen] = useState(false);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'connected') {
      toast({ title: 'Google Calendar conectado! 🗓️' });
      window.history.replaceState({}, '', '/dashboard');
      queryClient.invalidateQueries({ queryKey: ['calendar-connected'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-meetings'] });
    }
  }, []);

  const { data: workspace } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Workspace;
    },
    enabled: !!user && !authLoading,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: activeSubscription } = useQuery({
    queryKey: ['active-subscription', workspace?.id],
    queryFn: async () => {
      if (!workspace) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_tier, status')
        .eq('workspace_id', workspace.id)
        .in('status', ['trialing', 'active', 'past_due'])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspace,
    staleTime: 30 * 1000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('name');
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!workspace,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: teamMembers = [], isLoading: loading } = useQuery({
    queryKey: ['team-members', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*, teams!inner(workspace_id)')
        .eq('teams.workspace_id', workspace.id)
        .order('name');
      if (membersError) throw membersError;
      const memberIds = (members || []).map(m => m.id);
      const { data: feedbackCounts, error: countError } = await supabase
        .from('feedbacks')
        .select('member_id, created_at')
        .in('member_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000']);
      if (countError) throw countError;
      const membersWithCounts = (members || []).map(member => {
        const memberFeedbacks = (feedbackCounts || []).filter(f => f.member_id === member.id);
        const lastFeedback = memberFeedbacks.length > 0
          ? memberFeedbacks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : member.created_at;
        return { ...member, feedback_count: memberFeedbacks.length, last_feedback_date: lastFeedback, teamId: member.team_id };
      });
      return membersWithCounts as TeamMember[];
    },
    enabled: !!workspace,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: pendingInvitesMap = new Map() } = useQuery({
    queryKey: ['pending-slack-invites', workspace?.id],
    queryFn: async () => {
      if (!workspace) return new Map();
      const { data, error } = await supabase
        .from('pending_slack_invites')
        .select('member_id, status, member_has_account, created_at')
        .eq('status', 'sent');
      if (error) throw error;
      const map = new Map<string, { status: string; member_has_account: boolean; created_at: string }>();
      (data || []).forEach(inv => {
        map.set(inv.member_id, { status: inv.status || 'sent', member_has_account: inv.member_has_account || false, created_at: inv.created_at || '' });
      });
      return map;
    },
    enabled: !!workspace,
    staleTime: 30 * 1000,
  });

  // Meetings query (from V2)
  const { data: meetings = [] } = useQuery({
    queryKey: ['upcoming-meetings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('upcoming_meetings')
        .select('*, team_members(name)')
        .eq('user_id', user.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time')
        .limit(6);
      return data || [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Weekly notes count
  const { data: weeklyNotesCount = 0 } = useQuery({
    queryKey: ['weekly-notes', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('manager_id', user.id)
        .gte('created_at', weekAgo.toISOString());
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Nudges
  const { data: nudges = [] } = useQuery({
    queryKey: ['leader-nudges', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('leader_nudges')
        .select('*')
        .eq('leader_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const handleSendSlackInvite = async (member: TeamMember) => {
    try {
      const { data, error } = await supabase.functions.invoke('invite-member-slack', {
        body: { member_id: member.id, member_name: member.name, member_email: (member as any).email },
      });
      if (error) throw error;
      if (data?.success) {
        toast({
          title: data.has_existing_account ? '🔗 Convite Slack enviado' : '🚀 Convite Slack enviado',
          description: data.has_existing_account
            ? `${member.name} já tem conta, só precisa conectar ao Slack.`
            : `${member.name} receberá link para criar conta via Slack.`,
        });
        queryClient.invalidateQueries({ queryKey: ['pending-slack-invites'] });
      } else if (data?.reason === 'not_in_workspace') {
        toast({ title: '⚠️ Email não encontrado no Slack', description: 'Adicione a pessoa ao workspace Slack primeiro.' });
      }
    } catch (err: any) {
      console.error('Slack invite error:', err);
      toast({ title: 'Erro ao enviar convite Slack', description: err.message, variant: 'destructive' });
    }
  };

  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboarding-status', workspace?.id, user?.id],
    queryFn: async () => {
      if (!workspace || !user) return { hasMembers: false, hasFeedbacks: false, hasAIAnalysis: false, hasMentorChat: false, hasLeaderSync: false };
      const hasLeaderSync = !!(workspace as unknown as Record<string, unknown>).leader_sync_data;
      const memberIds = teamMembers.map(m => m.id);
      if (memberIds.length === 0) return { hasMembers: false, hasFeedbacks: false, hasAIAnalysis: false, hasMentorChat: false, hasLeaderSync };
      const { count: feedbackCount } = await supabase.from('feedbacks').select('*', { count: 'exact', head: true }).in('member_id', memberIds);
      const { count: aiCount } = await supabase.from('feedbacks').select('*', { count: 'exact', head: true }).in('member_id', memberIds).not('summary', 'is', null);
      const { count: mentorCount } = await supabase.from('mentor_messages').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('role', 'user');
      return {
        hasMembers: teamMembers.length > 0,
        hasFeedbacks: (feedbackCount || 0) > 0,
        hasAIAnalysis: (aiCount || 0) > 0,
        hasMentorChat: (mentorCount || 0) > 0,
        hasLeaderSync,
      };
    },
    enabled: !!workspace && !!user && !loading,
    staleTime: 30 * 1000,
  });

  const isSetupComplete = onboardingStatus?.hasMembers && onboardingStatus?.hasFeedbacks && onboardingStatus?.hasAIAnalysis && onboardingStatus?.hasMentorChat && onboardingStatus?.hasLeaderSync;

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['workspace'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['team-members'] });
    queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
  };

  const handleOpenMentor = () => {
    if (teamMembers.length > 0) navigate(`/member/${teamMembers[0].id}?openMentor=true`);
  };

  if (authLoading || linkedMemberLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (isLinkedMember) {
    if (needsOnboarding) return <Navigate to="/onboarding" replace />;
    return <DirectReportDashboard linkedMember={linkedMember!} />;
  }

  const filteredMembers = activeTeamId
    ? teamMembers.filter(m => m.teamId === activeTeamId)
    : teamMembers;

  const activeTeam = teams.find(t => t.id === activeTeamId);

  const getPageTitle = () => {
    if (!activeTeamId) return 'Todos os Membros';
    if (activeTeam?.name === 'Sem Time') return 'Membros sem Time';
    return activeTeam?.name || '';
  };

  const showTeamSettings = activeTeamId && activeTeam?.name !== 'Sem Time';
  const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Líder';
  const todayMeetings = meetings.filter((m: any) => isToday(new Date(m.start_time)));
  const membersNeedingAttention = teamMembers.filter(m => {
    const ref = m.last_feedback_date || m.created_at;
    return differenceInDays(new Date(), new Date(ref)) > 14;
  });

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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Dashboard</p>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-serif">
                  {getGreeting()}, {firstName}
                </h1>
                <Badge
                  variant={activeSubscription ? 'default' : 'outline'}
                  className={activeSubscription?.plan_tier === 'business' ? 'bg-foreground text-background hover:bg-foreground/90' : ''}
                >
                  {activeSubscription
                    ? `${activeSubscription.plan_tier.charAt(0).toUpperCase() + activeSubscription.plan_tier.slice(1)}${activeSubscription.status === 'trialing' ? ' · Trial' : ''}`
                    : 'Pulse'}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => setEditWorkspaceOpen(true)} className="h-8 w-8" aria-label="Editar workspace">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{teamMembers.length} liderado{teamMembers.length !== 1 ? 's' : ''}</span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{todayMeetings.length} reuniõ{todayMeetings.length !== 1 ? 'es' : ''} hoje</span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />{weeklyNotesCount} nota{weeklyNotesCount !== 1 ? 's' : ''} esta semana</span>
                {membersNeedingAttention.length > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1.5 text-destructive font-medium">
                      <Bell className="h-3.5 w-3.5" />{membersNeedingAttention.length} precisa{membersNeedingAttention.length !== 1 ? 'm' : ''} de atenção
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {teamMembers.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button onClick={() => setMemberDialogOpen(true)} variant="outline" className="rounded-full h-11 px-6 gap-2" disabled={!canAddMember}>
                          <UserPlus className="h-4 w-4" />
                          <span className="hidden sm:inline">Novo Membro</span>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canAddMember && (
                      <TooltipContent>
                        <p>Limite atingido ({limits.maxMembers} membros).</p>
                        <p className="text-primary font-medium">Faça upgrade para adicionar mais.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button onClick={() => setDialogOpen(true)} className="rounded-full h-11 px-6 gap-2 shadow-md">
                <PenSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Nota</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <TeamTabs
          teams={teams}
          activeTeamId={activeTeamId}
          onTeamChange={setActiveTeamId}
          onNewTeam={() => setNewTeamOpen(true)}
        />

        <UpgradeBanner />

        {onboardingStatus && !isSetupComplete && (
          <SetupChecklist
            hasMembers={onboardingStatus.hasMembers}
            hasFeedbacks={onboardingStatus.hasFeedbacks}
            hasAIAnalysis={onboardingStatus.hasAIAnalysis}
            hasMentorChat={onboardingStatus.hasMentorChat}
            hasLeaderSync={onboardingStatus.hasLeaderSync}
            onAddMember={() => setMemberDialogOpen(true)}
            onAddNote={() => setDialogOpen(true)}
            onOpenMentor={handleOpenMentor}
            onOpenLeaderSync={() => setLeaderSyncOpen(true)}
          />
        )}

        {/* ═══ PRÓXIMAS 1:1s ═══ */}
        {meetings.length > 0 && (
          <section className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">Próximas 1:1s</p>
            <div className="flex flex-wrap gap-3">
              {meetings.slice(0, 4).map((meeting: any) => {
                const startDate = new Date(meeting.start_time);
                const memberName = meeting.team_members?.name || meeting.title || 'Reunião';
                const timeLabel = isToday(startDate)
                  ? `Hoje · ${format(startDate, 'HH:mm')}`
                  : isTomorrow(startDate)
                    ? `Amanhã · ${format(startDate, 'HH:mm')}`
                    : format(startDate, "EEE, dd MMM · HH:mm", { locale: ptBR });
                return (
                  <div
                    key={meeting.id}
                    className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                    onClick={() => meeting.member_id && navigate(`/brief/${meeting.id}`)}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{memberName}</p>
                      <p className="text-xs text-muted-foreground">{timeLabel}</p>
                    </div>
                    {meeting.meet_link && (
                      <a href={meeting.meet_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="ml-auto shrink-0">
                        <Badge variant="outline" className="gap-1 text-xs hover:bg-primary/10 transition-colors">
                          <Video className="h-3 w-3" />Meet
                        </Badge>
                      </a>
                    )}
                  </div>
                );
              })}
              {meetings.length > 4 && (
                <div className="flex items-center px-3 text-sm text-muted-foreground">+{meetings.length - 4} mais</div>
              )}
            </div>
          </section>
        )}

        {/* ═══ BENTO: Activity + Invites ═══ */}
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">Atividade Recente</p>
              <ActivityPreview onOpenSheet={() => setActivitySheetOpen(true)} />
            </div>
            {workspace && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">Convites Pendentes</p>
                <PendingInvitesSection workspaceId={workspace.id} compact />
              </div>
            )}
          </div>
        </section>

        {/* ═══ Nudges ═══ */}
        {nudges.length > 0 && (
          <section className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">Alertas</p>
            <div className="space-y-2">
              {nudges.slice(0, 4).map((nudge: any) => (
                <div key={nudge.id} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-3 w-3 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground leading-relaxed">{nudge.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(nudge.created_at), { locale: ptBR, addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══ SEU TIME ═══ */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Seu Time</p>
            {showTeamSettings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Configurações do time">
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setEditTeamOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />Renomear Time
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleteTeamOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />Excluir Time
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredMembers.length} {filteredMembers.length === 1 ? 'liderado' : 'liderados'} — {getPageTitle()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-4">
            <span className="font-medium text-foreground/70">Última anotação:</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Recente (até 7 dias)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Atenção (8–14 dias)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Sem registro (+14 dias)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Nenhuma nota</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : teamMembers.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border shadow-sm p-12 text-center">
              <div className="max-w-md mx-auto">
                <p className="text-muted-foreground mb-3 text-sm">Veja como gerenciar seu time em 2 minutos</p>
                <div className="aspect-video w-full rounded-xl shadow-md overflow-hidden mb-6">
                  <iframe className="w-full h-full" src="https://www.youtube.com/embed/bRQiwrBGlsc" title="Demo do Rhitmo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
                <Button onClick={() => setMemberDialogOpen(true)} className="rounded-full px-8 h-11">Adicionar Primeiro Liderado</Button>
              </div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border shadow-sm p-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhum membro neste time</p>
              <Button onClick={() => setActiveTeamId(null)} variant="outline" className="rounded-full">Ver Todos os Membros</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMembers.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={{
                    id: member.id,
                    name: member.name,
                    role: member.role,
                    avatar: member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`,
                    lastFeedback: member.last_feedback_date || member.created_at,
                    feedbackCount: member.feedback_count || 0,
                    performanceScore: member.performance_score,
                    teamId: member.teamId,
                    linked_user_id: (member as any).linked_user_id,
                    email: (member as any).email,
                  } as any}
                  pendingInvite={pendingInvitesMap.get(member.id) || null}
                  onSendInvite={
                    !(member as any).linked_user_id && !pendingInvitesMap.has(member.id) && (member as any).email
                      ? () => handleSendSlackInvite(member)
                      : undefined
                  }
                  teamName={teams.find(t => t.id === member.teamId)?.name}
                  onEdit={() => {
                    setSelectedMember({
                      id: member.id, name: member.name, role: member.role,
                      teamId: member.teamId || '', avatar: member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`,
                      lastFeedback: member.last_feedback_date || member.created_at, feedbackCount: member.feedback_count || 0,
                      performanceScore: member.performance_score, performance_score: member.performance_score, created_at: member.created_at,
                    });
                    setEditMemberOpen(true);
                  }}
                  onClick={() => navigate(`/member/${member.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Empty state */}
        {meetings.length === 0 && nudges.length === 0 && teamMembers.length > 0 && (
          <section className="mb-12">
            <div className="rounded-2xl bg-card border border-dashed border-border p-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Tudo em dia! Nenhuma reunião ou alerta pendente.</p>
            </div>
          </section>
        )}
      </main>

      {/* ═══ DIALOGS ═══ */}
      <NewNoteDialog open={dialogOpen} onOpenChange={setDialogOpen} workspaceId={workspace?.id} />
      <NewMemberDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} workspaceId={workspace?.id || ''} onSuccess={handleSuccess} />
      <EditWorkspaceDialog open={editWorkspaceOpen} onOpenChange={setEditWorkspaceOpen} workspaceId={workspace?.id || ''} currentName={workspace?.name || ''} onSuccess={handleSuccess} />
      <NewTeamDialog open={newTeamOpen} onOpenChange={setNewTeamOpen} workspaceId={workspace?.id || ''} onSuccess={handleSuccess} />
      <EditMemberDialog
        open={editMemberOpen}
        onOpenChange={setEditMemberOpen}
        member={selectedMember ? { id: selectedMember.id, name: selectedMember.name, role: selectedMember.role, teamId: selectedMember.teamId || '' } : null}
        workspaceId={workspace?.id || ''}
        onSuccess={handleSuccess}
      />
      <EditTeamDialog open={editTeamOpen} onOpenChange={setEditTeamOpen} team={activeTeam} onSuccess={handleSuccess} />
      <DeleteTeamDialog
        open={deleteTeamOpen}
        onOpenChange={setDeleteTeamOpen}
        team={activeTeam}
        workspaceId={workspace?.id || ''}
        onSuccess={() => { setActiveTeamId(null); handleSuccess(); }}
      />
      {workspace && (
        <LeaderSyncWizard
          open={leaderSyncOpen}
          onOpenChange={setLeaderSyncOpen}
          workspaceId={workspace.id}
          existingData={(workspace as unknown as Record<string, unknown>).leader_sync_data as Record<string, unknown> | null}
        />
      )}
      <ActivitySheet open={activitySheetOpen} onOpenChange={setActivitySheetOpen} />
    </div>
  );
};

export default Index;
