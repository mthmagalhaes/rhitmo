import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from 'react';
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
import { UpcomingMeetingsCard } from '@/components/dashboard/UpcomingMeetingsCard';
import { MirrorInsightCard } from '@/components/dashboard/MirrorInsightCard';
import { ActivitySheet } from '@/components/ActivitySheet';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import { useUserRole } from '@/hooks/useUserRole';
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
// UpgradeBanner removed from dashboard (Sprint 1.1) — kept only in /billing.
import { InviteMemberDialog } from '@/components/InviteMemberDialog';
import { format, formatDistanceToNow, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/lib/dateLocale';

class CalendarErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6 min-h-[200px] flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground mb-2">Erro ao carregar reuniões</p>
          <button onClick={() => this.setState({ hasError: false })} className="text-xs text-primary hover:text-primary/80 font-medium">
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CalendarCardBoundary = () => (
  <CalendarErrorBoundary>
    <UpcomingMeetingsCard />
  </CalendarErrorBoundary>
);

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
  email?: string | null;
  linked_user_id?: string | null;
  invite_status?: string | null;
  invite_token?: string | null;
}

/**
 * Auto-links a pending invite by email when a user lands on the dashboard
 * without being recognized as a linked member.
 */
function PendingInviteAutoLinker({ user, onLinked }: { user: { id: string; email?: string }; onLinked: () => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'linking' | 'failed'>('linking');
  const attemptedRef = useRef(false);

  const attemptAutoLink = useCallback(async () => {
    if (attemptedRef.current || !user.email) return;
    attemptedRef.current = true;

    try {
      // Find pending member by email
      const { data: pendingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('email', user.email)
        .eq('invite_status', 'pending')
        .is('linked_user_id', null)
        .maybeSingle();

      if (pendingMember) {
        const { error } = await supabase
          .from('team_members')
          .update({
            linked_user_id: user.id,
            invite_status: 'accepted',
            invite_token: null,
          })
          .eq('id', pendingMember.id)
          .eq('invite_status', 'pending')
          .is('linked_user_id', null);

        if (!error) {
          onLinked();
          return;
        }
      }
      setStatus('failed');
    } catch {
      setStatus('failed');
    }
  }, [user.id, user.email, onLinked]);

  useEffect(() => {
    attemptAutoLink();
  }, [attemptAutoLink]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {status === 'linking' ? t('auth.processingAccess') : t('auth.processingAccess')}
          </h1>
          <p className="text-muted-foreground">
            {status === 'linking'
              ? t('auth.processingAccessDescription')
              : t('auth.processingAccessDescription')}
          </p>
        </div>
        {status === 'failed' && (
          <Button variant="outline" onClick={() => { attemptedRef.current = false; setStatus('linking'); attemptAutoLink(); }}>
            {t('common.tryAgain')}
          </Button>
        )}
      </div>
    </div>
  );
}

const Index = ({ activeTab }: { activeTab?: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { id: effectiveUserId, email: effectiveEmail, isImpersonating } = useEffectiveUser();
  const { linkedMember, isLinkedMember, needsOnboarding, isLoading: linkedMemberLoading } = useLinkedMember();
  const { isLeader, isHRAdmin, loading: roleLoading } = useUserRole();
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
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteMember, setInviteMember] = useState<Pick<TeamMember, 'id' | 'name' | 'invite_status' | 'invite_token'> & { email?: string | null } | null>(null);
  const { toast } = useToast();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.greeting.morning');
    if (h < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'connected') {
      toast({ title: t('dashboard.calendarConnected') });
      window.history.replaceState({}, '', '/dashboard');
      queryClient.invalidateQueries({ queryKey: ['calendar-connected'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-upcoming-meetings'] });
    }
  }, []);

  const { data: workspace } = useQuery({
    queryKey: ['workspace', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session — will retry');
      }
      
      const { data: ownedWorkspace, error: ownedError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', effectiveUserId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (ownedError) console.warn('[Index] Owned workspace query error:', ownedError.message);
      if (ownedWorkspace) return ownedWorkspace as Workspace;
      
      const { data: leaderTeam } = await supabase
        .from('teams')
        .select('workspace_id')
        .eq('leader_user_id', effectiveUserId)
        .limit(1)
        .maybeSingle();

      if (leaderTeam?.workspace_id) {
        const { data: wsData, error: wsError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', leaderTeam.workspace_id)
          .eq('is_active', true)
          .maybeSingle();
        if (wsError) throw wsError;
        return wsData as Workspace;
      }

      return null;
    },
    enabled: !!effectiveUserId && !authLoading,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
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

  const { data: meetings = [] } = useQuery({
    queryKey: ['upcoming-meetings-db', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data } = await supabase
        .from('upcoming_meetings')
        .select('*, team_members(name)')
        .eq('user_id', effectiveUserId)
        .gte('start_time', new Date().toISOString())
        .order('start_time')
        .limit(6);
      return data || [];
    },
    enabled: !!effectiveUserId,
    staleTime: 60_000,
  });

  const { data: weeklyNotesCount = 0 } = useQuery({
    queryKey: ['weekly-notes', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return 0;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('manager_id', effectiveUserId)
        .gte('created_at', weekAgo.toISOString());
      return count || 0;
    },
    enabled: !!effectiveUserId,
    staleTime: 60_000,
  });


  const handleOpenInviteDialog = (member: TeamMember) => {
    setInviteMember({
      id: member.id,
      name: member.name,
      email: member.email ?? null,
      invite_status: member.invite_status ?? null,
      invite_token: member.invite_token ?? null,
    });
    setInviteDialogOpen(true);
  };

  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboarding-status', workspace?.id, effectiveUserId],
    queryFn: async () => {
      if (!workspace || !effectiveUserId) return { hasMembers: false, hasFeedbacks: false, hasAIAnalysis: false, hasMentorChat: false, hasLeaderSync: false };
      const hasLeaderSync = !!(workspace as unknown as Record<string, unknown>).leader_sync_data;
      const memberIds = teamMembers.map(m => m.id);
      if (memberIds.length === 0) return { hasMembers: false, hasFeedbacks: false, hasAIAnalysis: false, hasMentorChat: false, hasLeaderSync };
      const { count: feedbackCount } = await supabase.from('feedbacks').select('*', { count: 'exact', head: true }).in('member_id', memberIds);
      const { count: aiCount } = await supabase.from('feedbacks').select('*', { count: 'exact', head: true }).in('member_id', memberIds).not('summary', 'is', null);
      const { count: mentorCount } = await supabase.from('mentor_messages').select('*', { count: 'exact', head: true }).eq('user_id', effectiveUserId).eq('role', 'user');
      return {
        hasMembers: teamMembers.length > 0,
        hasFeedbacks: (feedbackCount || 0) > 0,
        hasAIAnalysis: (aiCount || 0) > 0,
        hasMentorChat: (mentorCount || 0) > 0,
        hasLeaderSync,
      };
    },
    enabled: !!workspace && !!effectiveUserId && !loading,
    staleTime: 30 * 1000,
  });

  // Sprint 1.1: reduced to 3 critical steps (members + 1st note + leader sync)
  const isSetupComplete = onboardingStatus?.hasMembers && onboardingStatus?.hasFeedbacks && onboardingStatus?.hasLeaderSync;

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['workspace'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['team-members'] });
    queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
  };

  const handleOpenMentor = () => {
    if (teamMembers.length > 0) navigate(`/member/${teamMembers[0].id}?openMentor=true`);
  };

  if (authLoading || linkedMemberLoading || roleLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (isLinkedMember && !isLeader && !isHRAdmin) {
    if (needsOnboarding) return <Navigate to="/onboarding" replace />;
    return <DirectReportDashboard linkedMember={linkedMember!} activeTab={activeTab} />;
  }

  if (!isLeader && !isHRAdmin && !isLinkedMember) {
    return (
      <PendingInviteAutoLinker
        user={user}
        onLinked={() => {
          queryClient.invalidateQueries({ queryKey: ['linked-member'] });
          queryClient.invalidateQueries({ queryKey: ['account-linked-member'] });
          queryClient.invalidateQueries({ queryKey: ['account-pending-invite'] });
        }}
      />
    );
  }

  const filteredMembers = activeTeamId
    ? teamMembers.filter(m => m.teamId === activeTeamId)
    : teamMembers;

  const activeTeam = teams.find(t => t.id === activeTeamId);

  const getPageTitle = () => {
    if (!activeTeamId) return t('dashboard.allMembers');
    if (activeTeam?.name === 'Sem Time') return t('dashboard.membersWithoutTeam');
    return activeTeam?.name || '';
  };

  const showTeamSettings = activeTeamId && activeTeam?.name !== 'Sem Time';
  const firstName = isImpersonating
    ? (linkedMember?.name?.split(' ')[0] || effectiveEmail?.split('@')[0] || t('common.leader'))
    : (user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || t('common.leader'));
  const todayMeetings = meetings.filter((m: any) => isToday(new Date(m.start_time)));
  const membersNeedingAttention = teamMembers.filter(m => {
    const ref = m.last_feedback_date || m.created_at;
    return differenceInDays(new Date(), new Date(ref)) > 14;
  });

  const dateLocale = getDateLocale();

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
                <Button variant="ghost" size="icon" onClick={() => setEditWorkspaceOpen(true)} className="h-8 w-8" aria-label={t('dashboard.editWorkspace')}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {teamMembers.length === 1
                    ? t('dashboard.membersCount', { count: 1 })
                    : t('dashboard.membersCount_plural', { count: teamMembers.length })}
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {todayMeetings.length === 1
                    ? t('dashboard.meetingsCount', { count: 1 })
                    : t('dashboard.meetingsCount_plural', { count: todayMeetings.length })}
                  {' '}{t('dashboard.meetingsToday')}
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {weeklyNotesCount === 1
                    ? t('dashboard.notesCount', { count: 1 })
                    : t('dashboard.notesCount_plural', { count: weeklyNotesCount })}
                  {' '}{t('dashboard.thisWeek')}
                </span>
                {membersNeedingAttention.length > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1.5 text-destructive font-medium">
                      <Bell className="h-3.5 w-3.5" />
                      {membersNeedingAttention.length === 1
                        ? t('dashboard.attentionCount', { count: 1 })
                        : t('dashboard.attentionCount_plural', { count: membersNeedingAttention.length })}
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
                          <span className="hidden sm:inline">{t('dashboard.newMember')}</span>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canAddMember && (
                      <TooltipContent>
                        <p>{t('dashboard.limitReachedTooltip', { max: limits.maxMembers })}</p>
                        <p className="text-primary font-medium">{t('dashboard.limitReachedTooltipUpgrade')}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button onClick={() => setDialogOpen(true)} className="rounded-full h-11 px-6 gap-2 shadow-md">
                <PenSquare className="h-4 w-4" />
                <span className="hidden sm:inline">{t('dashboard.newNote')}</span>
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

        {onboardingStatus && !isSetupComplete && (
          <SetupChecklist
            hasMembers={onboardingStatus.hasMembers}
            hasFeedbacks={onboardingStatus.hasFeedbacks}
            hasAIAnalysis={onboardingStatus.hasAIAnalysis}
            hasMentorChat={onboardingStatus.hasMentorChat}
            hasLeaderSync={onboardingStatus.hasLeaderSync}
            workspaceCreatedAt={workspace?.created_at}
            onAddMember={() => setMemberDialogOpen(true)}
            onAddNote={() => setDialogOpen(true)}
            onOpenMentor={handleOpenMentor}
            onOpenLeaderSync={() => setLeaderSyncOpen(true)}
          />
        )}

        {/* ═══ MIRROR INSIGHT (S3.2) ═══ */}
        <section className="mb-8">
          <MirrorInsightCard />
        </section>

        {/* ═══ PRÓXIMAS 1:1s ═══ */}
        <section className="mb-12">
          <CalendarCardBoundary />
        </section>




        {/* ═══ SEU TIME ═══ */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('dashboard.yourTeam')}</p>
            {showTeamSettings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('dashboard.teamSettings')}>
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setEditTeamOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />{t('dashboard.renameTeam')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleteTeamOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />{t('dashboard.deleteTeam')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredMembers.length === 1
                ? t('dashboard.membersCount', { count: 1 })
                : t('dashboard.membersCount_plural', { count: filteredMembers.length })}
              {' — '}{getPageTitle()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-4">
            <span className="font-medium text-foreground/70">{t('dashboard.lastNote')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {t('dashboard.recent')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" /> {t('dashboard.attention')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> {t('dashboard.noRecord')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> {t('dashboard.noNotes')}</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : teamMembers.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border shadow-sm p-12 text-center">
              <div className="max-w-md mx-auto">
                {workspace && (
                  <>
                    <p className="text-muted-foreground mb-3 text-sm">{t('dashboard.watchDemo')}</p>
                    <div className="aspect-video w-full rounded-xl shadow-md overflow-hidden mb-6">
                      <iframe className="w-full h-full" src="https://www.youtube.com/embed/bRQiwrBGlsc" title="Demo do Rhitmo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                    <Button onClick={() => setMemberDialogOpen(true)} className="rounded-full px-8 h-11">{t('dashboard.addFirstMember')}</Button>
                  </>
                )}
                {!workspace && (
                  <p className="text-muted-foreground text-sm">{t('dashboard.noContentAvailable')}</p>
                )}
              </div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border shadow-sm p-12 text-center">
              <p className="text-muted-foreground mb-4">{t('dashboard.noMembersInTeam')}</p>
              <Button onClick={() => setActiveTeamId(null)} variant="outline" className="rounded-full">{t('dashboard.viewAllMembers')}</Button>
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
                    avatar: member.avatar || null,
                    lastFeedback: member.last_feedback_date || member.created_at,
                    feedbackCount: member.feedback_count || 0,
                    performanceScore: member.performance_score,
                    teamId: member.teamId,
                    linked_user_id: member.linked_user_id,
                    email: member.email,
                    invite_status: member.invite_status,
                    invite_token: member.invite_token,
                  } as any}
                  pendingInvite={pendingInvitesMap.get(member.id) || null}
                  onSendInvite={
                    !member.linked_user_id && member.email
                      ? () => handleOpenInviteDialog(member)
                      : undefined
                  }
                  teamName={teams.find(t => t.id === member.teamId)?.name}
                  onEdit={() => {
                    setSelectedMember({
                      id: member.id, name: member.name, role: member.role,
                      teamId: member.teamId || '', avatar: member.avatar || null,
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
        {meetings.length === 0 && teamMembers.length > 0 && (
          <section className="mb-12">
            <div className="rounded-2xl bg-card border border-dashed border-border p-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t('dashboard.allCaughtUp')}</p>
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
      {inviteMember && (
        <InviteMemberDialog
          open={inviteDialogOpen}
          onOpenChange={(open) => {
            setInviteDialogOpen(open);
            if (!open) setInviteMember(null);
          }}
          member={inviteMember}
          onSuccess={handleSuccess}
        />
      )}
      <ActivitySheet open={activitySheetOpen} onOpenChange={setActivitySheetOpen} />
    </div>
  );
};

export default Index;
