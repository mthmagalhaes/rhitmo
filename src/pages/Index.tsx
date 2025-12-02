import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Auth } from '@/components/Auth';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PenSquare, Users, Loader2, UserPlus, Pencil, Settings, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Workspace, Team } from '@/types/team';

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
  const { user, loading: authLoading, signOut } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadWorkspaceAndTeams();
      loadTeamMembers();
    }
  }, [user]);

  const loadWorkspaceAndTeams = async () => {
    try {
      // Buscar workspace do usuário
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .single();

      if (workspaceError) throw workspaceError;
      setWorkspace(workspaceData);

      // Buscar times do workspace
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('workspace_id', workspaceData.id)
        .order('name');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);
    } catch (error: any) {
      console.error('Erro ao carregar workspace e times:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadTeamMembers = async () => {
    try {
      // Query 1: Buscar membros do time
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .order('name');

      if (membersError) throw membersError;

      // Query 2: Buscar contagem de feedbacks por membro
      const { data: feedbackCounts, error: countError } = await supabase
        .from('feedbacks')
        .select('member_id, created_at');

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

      setTeamMembers(membersWithCounts);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar equipe",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
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
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              {workspace && (
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-foreground">{workspace.name}</h1>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setEditWorkspaceOpen(true)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-muted-foreground">Gestão de Performance Contínua</p>
            </div>
            <div className="flex gap-3">
              {teamMembers.length > 0 && (
                <Button onClick={() => setMemberDialogOpen(true)} size="lg" variant="outline" className="gap-2">
                  <UserPlus className="h-5 w-5" />
                  Novo Membro
                </Button>
              )}
              <Button onClick={() => setDialogOpen(true)} size="lg" className="gap-2 shadow-md">
                <PenSquare className="h-5 w-5" />
                Nova Nota
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8">
        <TeamTabs 
          teams={teams}
          activeTeamId={activeTeamId}
          onTeamChange={setActiveTeamId}
          onNewTeam={() => setNewTeamOpen(true)}
        />

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">{getPageTitle()}</h2>
            
            {showTeamSettings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum liderado cadastrado ainda</p>
            <Button onClick={() => setMemberDialogOpen(true)}>
              Adicionar Primeiro Liderado
            </Button>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum membro neste time</p>
            <Button onClick={() => setActiveTeamId(null)} variant="outline">
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
                  teamId: member.teamId
                }}
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

      <NewNoteDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <NewMemberDialog 
        open={memberDialogOpen} 
        onOpenChange={setMemberDialogOpen}
        workspaceId={workspace?.id || ''}
        onSuccess={() => {
          loadTeamMembers();
          loadWorkspaceAndTeams();
        }}
      />
      <EditWorkspaceDialog
        open={editWorkspaceOpen}
        onOpenChange={setEditWorkspaceOpen}
        workspaceId={workspace?.id || ''}
        currentName={workspace?.name || ''}
        onSuccess={loadWorkspaceAndTeams}
      />
      <NewTeamDialog
        open={newTeamOpen}
        onOpenChange={setNewTeamOpen}
        workspaceId={workspace?.id || ''}
        onSuccess={loadWorkspaceAndTeams}
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
        onSuccess={() => {
          loadTeamMembers();
          loadWorkspaceAndTeams();
        }}
      />
      <EditTeamDialog
        open={editTeamOpen}
        onOpenChange={setEditTeamOpen}
        team={activeTeam}
        onSuccess={loadWorkspaceAndTeams}
      />
      <DeleteTeamDialog
        open={deleteTeamOpen}
        onOpenChange={setDeleteTeamOpen}
        team={activeTeam}
        workspaceId={workspace?.id || ''}
        onSuccess={() => {
          setActiveTeamId(null);
          loadWorkspaceAndTeams();
          loadTeamMembers();
        }}
      />
    </div>
  );
};

export default Index;
