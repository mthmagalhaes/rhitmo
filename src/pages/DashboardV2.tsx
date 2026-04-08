import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { NewMemberDialog } from '@/components/NewMemberDialog';
import { SetupChecklist } from '@/components/SetupChecklist';
import { LeaderSyncWizard } from '@/components/LeaderSyncWizard';
import { useAuth } from '@/hooks/useAuth';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import DirectReportDashboard from '@/components/dashboard/DirectReportDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PenSquare, UserPlus, Loader2, Calendar, Clock, FileText, ChevronRight, Video, Bell, CheckCircle2, Users, MessageSquare, ArrowRight } from 'lucide-react';
import { Workspace, Team } from '@/types/team';
import { format, formatDistanceToNow, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

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
  email?: string;
  linked_user_id?: string;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getHealthColor = (lastDate: string | undefined, createdAt: string) => {
  const ref = lastDate || createdAt;
  const days = differenceInDays(new Date(), new Date(ref));
  if (days <= 7) return 'bg-emerald-500';
  if (days <= 14) return 'bg-yellow-500';
  return 'bg-destructive';
};

const DashboardV2 = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { linkedMember, isLinkedMember, needsOnboarding, isLoading: linkedMemberLoading } = useLinkedMember();
  const { canAddMember } = usePlanLimits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [leaderSyncOpen, setLeaderSyncOpen] = useState(false);

  useEffect(() => {
    if (!user && !authLoading) navigate('/', { replace: true });
  }, [user, authLoading, navigate]);

  // ── Queries (same as Index.tsx) ──
  const { data: workspace } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from('workspaces').select('*').eq('owner_id', user.id).maybeSingle();
      if (error) throw error;
      return data as Workspace;
    },
    enabled: !!user && !authLoading,
    staleTime: 30_000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase.from('teams').select('*').eq('workspace_id', workspace.id).order('name');
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!workspace,
    staleTime: 30_000,
  });

  const { data: teamMembers = [], isLoading: loading } = useQuery({
    queryKey: ['team-members', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data: members, error: membersError } = await supabase
        .from('team_members').select('*, teams!inner(workspace_id)')
        .eq('teams.workspace_id', workspace.id).order('name');
      if (membersError) throw membersError;
      const memberIds = (members || []).map(m => m.id);
      const { data: feedbackCounts } = await supabase
        .from('feedbacks').select('member_id, created_at')
        .in('member_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000']);
      return (members || []).map(member => {
        const mf = (feedbackCounts || []).filter(f => f.member_id === member.id);
        const lastFeedback = mf.length > 0
          ? mf.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : member.created_at;
        return { ...member, feedback_count: mf.length, last_feedback_date: lastFeedback, teamId: member.team_id };
      }) as TeamMember[];
    },
    enabled: !!workspace,
    staleTime: 30_000,
  });

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
      return { hasMembers: teamMembers.length > 0, hasFeedbacks: (feedbackCount || 0) > 0, hasAIAnalysis: (aiCount || 0) > 0, hasMentorChat: (mentorCount || 0) > 0, hasLeaderSync };
    },
    enabled: !!workspace && !!user && !loading,
    staleTime: 30_000,
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

  const todayMeetings = meetings.filter((m: any) => isToday(new Date(m.start_time)));
  const tomorrowMeetings = meetings.filter((m: any) => isTomorrow(new Date(m.start_time)));
  const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Líder';

  // Members needing attention (no feedback > 14 days)
  const membersNeedingAttention = teamMembers.filter(m => {
    const ref = m.last_feedback_date || m.created_at;
    return differenceInDays(new Date(), new Date(ref)) > 14;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ═══ HERO STRIP ═══ */}
      <div className="bg-primary/5 border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
                Dashboard
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-serif">
                {getGreeting()}, {firstName}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {teamMembers.length} liderado{teamMembers.length !== 1 ? 's' : ''}
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {todayMeetings.length} reuniõ{todayMeetings.length !== 1 ? 'es' : ''} hoje
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {weeklyNotesCount} nota{weeklyNotesCount !== 1 ? 's' : ''} esta semana
                </span>
                {membersNeedingAttention.length > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1.5 text-destructive font-medium">
                      <Bell className="h-3.5 w-3.5" />
                      {membersNeedingAttention.length} precisa{membersNeedingAttention.length !== 1 ? 'm' : ''} de atenção
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {teamMembers.length > 0 && (
                <Button
                  onClick={() => setMemberDialogOpen(true)}
                  variant="outline"
                  className="rounded-full h-11 px-6 gap-2"
                  disabled={!canAddMember}
                >
                  <UserPlus className="h-4 w-4" />
                  Novo Membro
                </Button>
              )}
              <Button
                onClick={() => setDialogOpen(true)}
                className="rounded-full h-11 px-6 gap-2 shadow-md"
              >
                <PenSquare className="h-4 w-4" />
                Nova Nota
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {/* ═══ SETUP CHECKLIST (above everything for new users) ═══ */}
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Próximas 1:1s
            </p>
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
                      <a
                        href={meeting.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="ml-auto shrink-0"
                      >
                        <Badge variant="outline" className="gap-1 text-xs hover:bg-primary/10 transition-colors">
                          <Video className="h-3 w-3" />
                          Meet
                        </Badge>
                      </a>
                    )}
                  </div>
                );
              })}
              {meetings.length > 4 && (
                <div className="flex items-center px-3 text-sm text-muted-foreground">
                  +{meetings.length - 4} mais
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══ SEU TIME ═══ */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Seu Time
            </p>
            <p className="text-xs text-muted-foreground">
              {teamMembers.length} liderado{teamMembers.length !== 1 ? 's' : ''}
            </p>
          </div>

          {teamMembers.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border shadow-sm p-12 text-center">
              <div className="max-w-md mx-auto">
                <p className="text-muted-foreground mb-3 text-sm">Veja como gerenciar seu time em 2 minutos</p>
                <div className="aspect-video w-full rounded-xl shadow-md overflow-hidden mb-6">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/bRQiwrBGlsc"
                    title="Demo do Rhitmo"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <Button onClick={() => setMemberDialogOpen(true)} className="rounded-full px-8 h-11">
                  Adicionar Primeiro Liderado
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamMembers.map((member) => {
                const healthColor = getHealthColor(member.last_feedback_date, member.created_at);
                const lastDate = member.last_feedback_date || member.created_at;
                const teamName = teams.find(t => t.id === member.teamId)?.name;
                const timeAgo = formatDistanceToNow(new Date(lastDate), { locale: ptBR, addSuffix: true });

                return (
                  <div
                    key={member.id}
                    onClick={() => navigate(`/member/${member.id}`)}
                    className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                        alt={member.name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-background shadow-sm"
                      />
                      <span className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card", healthColor)} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                        {teamName && teamName !== 'Sem Time' && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                            {teamName}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-lg font-bold text-foreground">{member.feedback_count || 0}</p>
                        <p className="text-[10px] text-muted-foreground">notas</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        <p className="text-[10px] text-muted-foreground">última nota</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══ ATIVIDADE RECENTE ═══ */}
        {nudges.length > 0 && (
          <section className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Atividade Recente
            </p>
            <div className="space-y-2">
              {nudges.slice(0, 4).map((nudge: any) => (
                <div
                  key={nudge.id}
                  className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3"
                >
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-3 w-3 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground leading-relaxed">{nudge.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(nudge.created_at), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state when no meetings and no nudges */}
        {meetings.length === 0 && nudges.length === 0 && teamMembers.length > 0 && (
          <section className="mb-12">
            <div className="rounded-2xl bg-card border border-dashed border-border p-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Tudo em dia! Nenhuma reunião ou alerta pendente.</p>
            </div>
          </section>
        )}
      </main>

      {/* ── Dialogs ── */}
      <NewNoteDialog open={dialogOpen} onOpenChange={setDialogOpen} workspaceId={workspace?.id} />
      <NewMemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        workspaceId={workspace?.id || ''}
        onSuccess={handleSuccess}
      />
      {workspace && (
        <LeaderSyncWizard
          open={leaderSyncOpen}
          onOpenChange={setLeaderSyncOpen}
          workspaceId={workspace.id}
          existingData={(workspace as unknown as Record<string, unknown>).leader_sync_data as Record<string, unknown> | null}
        />
      )}
    </div>
  );
};

export default DashboardV2;
