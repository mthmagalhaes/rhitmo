import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FeedbackTimeline } from '@/components/FeedbackTimeline';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { MentorChat } from '@/components/MentorChat';
import { Auth } from '@/components/Auth';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, PenSquare, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MemberDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user && id) {
      loadMemberAndFeedbacks();
    }
  }, [user, id]);

  const loadMemberAndFeedbacks = async () => {
    try {
      // Carregar membro
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', id)
        .single();

      if (memberError) throw memberError;
      setMember(memberData);

      // Carregar feedbacks
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('member_id', id)
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;
      setFeedbacks(feedbackData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      toast({
        title: "Feedback excluído",
        description: "O feedback foi removido com sucesso.",
      });

      loadMemberAndFeedbacks();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleReanalyze = async (feedbackId: string) => {
    setReanalyzingId(feedbackId);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reanalyze-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`
          },
          body: JSON.stringify({ feedbackId })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao reprocessar');
      }
      
      toast({ 
        title: "Análise gerada!", 
        description: "A IA processou o feedback com sucesso." 
      });
      
      loadMemberAndFeedbacks();
    } catch (error: any) {
      console.error('Erro ao reprocessar:', error);
      toast({ 
        title: "Erro ao gerar análise", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setReanalyzingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Membro não encontrado</h1>
          <Button onClick={() => navigate('/')}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setChatOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Mentor Chat
              </Button>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <PenSquare className="h-4 w-4" />
                Nova Nota
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-start gap-6 mb-6">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} 
                alt={member.name} 
              />
              <AvatarFallback>{member.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">{member.name}</h1>
              <p className="text-lg text-muted-foreground mb-4">{member.role}</p>
              <span className="text-muted-foreground">{feedbacks.length} notas registradas</span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">Histórico de Feedbacks</h2>
          {feedbacks.length > 0 ? (
            <FeedbackTimeline 
              feedbacks={feedbacks} 
              onDelete={handleDeleteFeedback}
              onReanalyze={handleReanalyze}
              reanalyzingId={reanalyzingId}
            />
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhum feedback registrado ainda</p>
              <Button onClick={() => setDialogOpen(true)}>Adicionar Primeira Nota</Button>
            </Card>
          )}
        </div>
      </main>

      <NewNoteDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        selectedMemberId={member.id}
        memberName={member.name}
        onSuccess={loadMemberAndFeedbacks}
      />

      <MentorChat
        open={chatOpen}
        onOpenChange={setChatOpen}
        memberName={member.name}
        feedbacks={feedbacks}
      />
    </div>
  );
};

export default MemberDetails;
