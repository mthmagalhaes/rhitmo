import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TeamMemberCard } from '@/components/TeamMemberCard';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { NewMemberDialog } from '@/components/NewMemberDialog';
import { Auth } from '@/components/Auth';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PenSquare, Users, LogOut, Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  performance_score: number;
  created_at: string;
  feedback_count?: number;
  last_feedback_date?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadTeamMembers();
    }
  }, [user]);

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
          last_feedback_date: lastFeedback
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

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!"
    });
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-1">Rhitmo</h1>
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
              <Button onClick={handleSignOut} variant="outline" size="lg" className="gap-2">
                <LogOut className="h-5 w-5" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Minha Equipe</h2>
          </div>
          <p className="text-muted-foreground">
            {teamMembers.length} liderados · Clique em um card para ver o histórico
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={{
                  id: member.id,
                  name: member.name,
                  role: member.role,
                  avatar: member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`,
                  lastFeedback: member.last_feedback_date || member.created_at,
                  feedbackCount: member.feedback_count || 0,
                  performanceScore: member.performance_score
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
        onSuccess={loadTeamMembers}
      />
    </div>
  );
};

export default Index;
