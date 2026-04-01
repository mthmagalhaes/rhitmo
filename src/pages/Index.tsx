import { useState, useEffect } from 'react';
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
import { PendingInvitesSection } from '@/components/team/PendingInvitesSection';
import { LeaderSyncWizard } from '@/components/LeaderSyncWizard';
import { LeaderSyncReminder } from '@/components/LeaderSyncReminder';
import { useAuth } from '@/hooks/useAuth';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import DirectReportDashboard from '@/components/dashboard/DirectReportDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PenSquare, Users, Loader2, UserPlus, Pencil, Settings, Trash2 } from 'lucide-react';
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
import { CalendarWidget } from '@/components/CalendarWidget';
import { UpgradeBanner } from '@/components/billing/UpgradeBanner';

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
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Handle calendar callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'connected') {
      toast({ title: 'Google Calendar conectado! 🗓️' });
      window.history.replaceState({}, '', '/dashboard');
      queryClient.invalidateQueries({ queryKey: ['calendar-connected'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-meetings'] });
    }
  }, []);

  // Query para workspace - FILTRO EXPLÍCITO por owner_id para isolamento de tenant
  const { data: workspace } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id) // ✅ ISOLAMENTO: Apenas workspace do usuário logado
        .maybeSingle();
      if (error) throw error;
      return data as Workspace;
    },
    enabled: !!user && !authLoading,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Query para subscription ativa do workspace (source of truth para badge)
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

  // Query para teams
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

  // Query para team members com feedback info - FILTRO EXPLÍCITO por workspace
  const { data: teamMembers = [], isLoading: loading } = useQuery({
    queryKey: ['team-members', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];

      // Query 1: Buscar membros APENAS do workspace atual via join com teams
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*, teams!inner(workspace_id)')
        .eq('teams.workspace_id', workspace.id) // ✅ ISOLAMENTO: Apenas membros do workspace
        .order('name');

      if (membersError) throw membersError;

      // Query 2: Buscar feedbacks apenas dos membros deste workspace
      const memberIds = (members || []).map(m => m.id);
      const { data: feedbackCounts, error: countError } = await supabase
        .from('feedbacks')
        .select('member_id, created_at')
        .in('member_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000']);

      if (countError) throw countError;

      // Combinar os dados: contar feedbacks e pegar o mais recente
      const membersWithCounts = (members || []).map(member => {
        const memberFeedbacks = (feedbackCounts || []).filter(
          f => f.member_id === member.id
        );
        
        const lastFeedback = memberFeedbacks.length > 0
          ? memberFeedbacks.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0].created_at
          : member.created_at;

        return {
          ...member,
          feedback_count: memberFeedbacks.length,
          last_feedback_date: lastFeedback,
          teamId: member.team_id
        };
      });

      return membersWithCounts as TeamMember[];
    },
    enabled: !!workspace, // ✅ Só executa após ter workspace
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Query para pending slack invites
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
        map.set(inv.member_id, {
          status: inv.status || 'sent',
          member_has_account: inv.member_has_account || false,
          created_at: inv.created_at || '',
        });
      });
      return map;
    },
    enabled: !!workspace,
    staleTime: 30 * 1000,
  });

  const handleSendSlackInvite = async (member: TeamMember) => {
    try {
      const { data, error } = await supabase.functions.invoke('invite-member-slack', {
        body: {
          member_id: member.id,
          member_name: member.name,
          member_email: (member as any).email,
        },
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
        toast({
          title: '⚠️ Email não encontrado no Slack',
          description: 'Adicione a pessoa ao workspace Slack primeiro.',
        });
      }
    } catch (err: any) {
      console.error('Slack invite error:', err);
      toast({ title: 'Erro ao enviar convite Slack', description: err.message, variant: 'destructive' });
    }
  };

  // Query para status de onboarding
  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboarding-status', workspace?.id, user?.id],
    queryFn: async () => {
      if (!workspace || !user) return { hasMembers: false, hasFeedbacks: false, hasAIAnalysis: false, hasMentorChat: false, hasLeaderSync: false };
      
      const hasLeaderSync = !!(workspace as unknown as Record<string, unknown>).leader_sync_data;
      
      const memberIds = teamMembers.map(m => m.id);
      if (memberIds.length === 0) {
        return { hasMembers: false, hasFeedbacks: false, hasAIAnalysis: false, hasMentorChat: false, hasLeaderSync };
      }

      // Contar feedbacks
      const { count: feedbackCount } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .in('member_id', memberIds);

      // Contar feedbacks com análise de IA (summary preenchido)
      const { count: aiCount } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .in('member_id', memberIds)
        .not('summary', 'is', null);

      // Contar mensagens do mentor (apenas role='user' para garantir que o usuário interagiu)
      const { count: mentorCount } = await supabase
        .from('mentor_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'user');

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

  const isSetupComplete = onboardingStatus?.hasMembers && 
    onboardingStatus?.hasFeedbacks && 
    onboardingStatus?.hasAIAnalysis && 
    onboardingStatus?.hasMentorChat &&
    onboardingStatus?.hasLeaderSync;

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['workspace'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['team-members'] });
    queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
  };

  const handleOpenMentor = () => {
    // Se tem membros, navega para o primeiro membro para abrir o mentor
    if (teamMembers.length > 0) {
      navigate(`/member/${teamMembers[0].id}?openMentor=true`);
    }
  };

  // Loading combinado: auth + linked member + dados
  if (authLoading || linkedMemberLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // INVERSÃO: Priorizar fluxo de liderado ANTES de verificar workspace
  if (isLinkedMember) {
    if (needsOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
    // Liderado com onboarding completo → Dashboard próprio
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

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              {workspace && (
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">{workspace.name}</h1>
                  <Badge 
                    variant={activeSubscription ? 'default' : 'outline'}
                    className={
                      activeSubscription?.plan_tier === 'business' 
                        ? 'bg-foreground text-background hover:bg-foreground/90' 
                        : activeSubscription?.plan_tier === 'pro'
                          ? ''
                          : ''
                    }
                  >
                    {activeSubscription 
                      ? `${activeSubscription.plan_tier.charAt(0).toUpperCase() + activeSubscription.plan_tier.slice(1)}${activeSubscription.status === 'trialing' ? ' · Trial' : ''}`
                      : 'Pulse'
                    }
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setEditWorkspaceOpen(true)}
                    className="h-8 w-8"
                    aria-label="Editar workspace"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">Gestão de Performance Contínua</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {teamMembers.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button 
                          onClick={() => setMemberDialogOpen(true)} 
                          size="lg" 
                          variant="outline" 
                          className="gap-2 rounded-full"
                          disabled={!canAddMember}
                        >
                          <UserPlus className="h-5 w-5" />
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
              <Button onClick={() => setDialogOpen(true)} size="lg" className="gap-2 shadow-md rounded-full">
                <PenSquare className="h-5 w-5" />
                <span className="hidden sm:inline">Nova Nota</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <TeamTabs 
          teams={teams}
          activeTeamId={activeTeamId}
          onTeamChange={setActiveTeamId}
          onNewTeam={() => setNewTeamOpen(true)}
        />

        {/* Calendar Widget */}
        <CalendarWidget />

        <UpgradeBanner />

        {workspace && onboardingStatus?.hasLeaderSync && (
          <LeaderSyncReminder
            leaderSyncCompletedAt={(workspace as unknown as Record<string, unknown>).leader_sync_completed_at as string | null}
            onUpdate={() => setLeaderSyncOpen(true)}
          />
        )}

        {/* Pending Slack Invites */}
        {workspace && <PendingInvitesSection workspaceId={(workspace as any).id} />}

        {/* Setup Checklist - aparece enquanto setup não está completo */}
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

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{getPageTitle()}</h2>
            
            {showTeamSettings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Configurações do time">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setEditTeamOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Renomear Time
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setDeleteTeamOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Time
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="text-muted-foreground">
            {filteredMembers.length} {filteredMembers.length === 1 ? 'liderado' : 'liderados'} · Clique em um card para ver o histórico
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-3">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Até 7 dias</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500"></span> 8 a 14 dias</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive"></span> Mais de 14 dias</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40"></span> Sem notas</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="col-span-full rounded-3xl bg-gradient-to-br from-primary/5 to-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-12 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <p className="text-muted-foreground mb-3">
                  Veja como gerenciar seu time em 2 minutos
                </p>
                <div className="aspect-video w-full rounded-2xl shadow-md overflow-hidden">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/bRQiwrBGlsc"
                    title="Demo do Rhitmo"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
              <p className="text-muted-foreground mb-4">Nenhum liderado cadastrado ainda</p>
              <Button onClick={() => setMemberDialogOpen(true)} className="rounded-full px-8 py-3 text-lg">
                Adicionar Primeiro Liderado
              </Button>
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="col-span-full rounded-2xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum membro neste time</p>
            <Button onClick={() => setActiveTeamId(null)} variant="outline" className="rounded-full">
              Ver Todos os Membros
            </Button>
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
                    id: member.id,
                    name: member.name,
                    role: member.role,
                    teamId: member.teamId || '',
                    avatar: member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`,
                    lastFeedback: member.last_feedback_date || member.created_at,
                    feedbackCount: member.feedback_count || 0,
                    performanceScore: member.performance_score,
                    performance_score: member.performance_score,
                    created_at: member.created_at
                  });
                  setEditMemberOpen(true);
                }}
                onClick={() => navigate(`/member/${member.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      <NewNoteDialog open={dialogOpen} onOpenChange={setDialogOpen} workspaceId={workspace?.id} />
      <NewMemberDialog 
        open={memberDialogOpen} 
        onOpenChange={setMemberDialogOpen}
        workspaceId={workspace?.id || ''}
        onSuccess={handleSuccess}
      />
      <EditWorkspaceDialog
        open={editWorkspaceOpen}
        onOpenChange={setEditWorkspaceOpen}
        workspaceId={workspace?.id || ''}
        currentName={workspace?.name || ''}
        onSuccess={handleSuccess}
      />
      <NewTeamDialog
        open={newTeamOpen}
        onOpenChange={setNewTeamOpen}
        workspaceId={workspace?.id || ''}
        onSuccess={handleSuccess}
      />
      <EditMemberDialog
        open={editMemberOpen}
        onOpenChange={setEditMemberOpen}
        member={selectedMember ? {
          id: selectedMember.id,
          name: selectedMember.name,
          role: selectedMember.role,
          teamId: selectedMember.teamId || ''
        } : null}
        workspaceId={workspace?.id || ''}
        onSuccess={handleSuccess}
      />
      <EditTeamDialog
        open={editTeamOpen}
        onOpenChange={setEditTeamOpen}
        team={activeTeam}
        onSuccess={handleSuccess}
      />
      <DeleteTeamDialog
        open={deleteTeamOpen}
        onOpenChange={setDeleteTeamOpen}
        team={activeTeam}
        workspaceId={workspace?.id || ''}
        onSuccess={() => {
          setActiveTeamId(null);
          handleSuccess();
        }}
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

export default Index;
