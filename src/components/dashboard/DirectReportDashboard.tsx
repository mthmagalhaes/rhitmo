import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { FeedbackTimeline } from '@/components/FeedbackTimeline';
import { User, FileText, Loader2 } from 'lucide-react';

interface LinkedMemberData {
  id: string;
  name: string;
  email: string | null;
  role: string;
  skills_data: {
    role_tenure?: string;
    responsibilities?: string[];
    aspirations?: string;
    interests?: string[];
    onboarding_completed?: boolean;
    completed_at?: string;
  } | null;
}

interface DirectReportDashboardProps {
  linkedMember: LinkedMemberData;
}

const tenureLabels: Record<string, string> = {
  'less_than_1': 'Menos de 1 ano',
  '1_to_3': '1 a 3 anos',
  '3_to_5': '3 a 5 anos',
  'more_than_5': 'Mais de 5 anos',
};

export default function DirectReportDashboard({ linkedMember }: DirectReportDashboardProps) {
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-foreground">Olá, {linkedMember.name}!</h1>
          <p className="text-muted-foreground">Painel do Colaborador</p>
        </div>
      </div>

      {/* Grid de Cards */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Meu Perfil */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground">
              <User className="h-5 w-5 text-primary" />
              Meu Perfil
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-medium text-foreground">{linkedMember.role}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Tempo na função</p>
                <p className="font-medium text-foreground">
                  {tenure ? tenureLabels[tenure] || tenure : '-'}
                </p>
              </div>
              
              {responsibilities.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Responsabilidades</p>
                  <ul className="list-disc list-inside space-y-1">
                    {responsibilities.map((resp, i) => (
                      <li key={i} className="text-foreground">{resp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {linkedMember.skills_data?.aspirations && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Aspirações</p>
                  <p className="text-foreground">{linkedMember.skills_data.aspirations}</p>
                </div>
              )}

              {linkedMember.skills_data?.interests && linkedMember.skills_data.interests.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Interesses</p>
                  <div className="flex flex-wrap gap-2">
                    {linkedMember.skills_data.interests.map((interest, i) => (
                      <span 
                        key={i} 
                        className="px-2 py-1 bg-muted rounded-md text-sm text-foreground"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Card: Minhas Anotações */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              Minhas Anotações
            </h2>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma anotação compartilhada</p>
                <p className="text-sm">Seu líder pode compartilhar feedbacks com você</p>
              </div>
            ) : (
              <FeedbackTimeline feedbacks={feedbacks} />
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
