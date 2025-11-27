import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FeedbackTimeline } from '@/components/FeedbackTimeline';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { mockTeamMembers, mockFeedbacks } from '@/data/mockData';
import { ArrowLeft, PenSquare, TrendingUp } from 'lucide-react';

const MemberDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const member = mockTeamMembers.find(m => m.id === id);
  const feedbacks = mockFeedbacks[id || ''] || [];

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
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <PenSquare className="h-4 w-4" />
              Nova Nota
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-start gap-6 mb-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={member.avatar} alt={member.name} />
              <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">{member.name}</h1>
              <p className="text-lg text-muted-foreground mb-4">{member.role}</p>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance: {member.performanceScore}%
                </Badge>
                <span className="text-muted-foreground">{member.feedbackCount} notas registradas</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">Histórico de Feedbacks</h2>
          {feedbacks.length > 0 ? (
            <FeedbackTimeline feedbacks={feedbacks} />
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
      />
    </div>
  );
};

export default MemberDetails;
