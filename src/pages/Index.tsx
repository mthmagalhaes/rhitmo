import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TeamMemberCard } from '@/components/TeamMemberCard';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { mockTeamMembers } from '@/data/mockData';
import { PenSquare, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-1">Rhitmo</h1>
              <p className="text-muted-foreground">Gestão de Performance Contínua</p>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="lg" className="gap-2 shadow-md">
              <PenSquare className="h-5 w-5" />
              Nova Nota
            </Button>
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
            {mockTeamMembers.length} liderados · Clique em um card para ver o histórico
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mockTeamMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              onClick={() => navigate(`/member/${member.id}`)}
            />
          ))}
        </div>
      </main>

      <NewNoteDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default Index;
