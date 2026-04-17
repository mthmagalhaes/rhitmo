import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const RecentActivityCard = () => {
  const { data: recentFeedbacks } = useQuery({
    queryKey: ['admin-recent-feedbacks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('id, created_at, type, member_id, team_members(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentFeedbacks && recentFeedbacks.length > 0 ? (
          <div className="space-y-3">
            {recentFeedbacks.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={f.type === 'positive' ? 'default' : f.type === 'constructive' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {f.type}
                  </Badge>
                  <span className="text-sm font-medium">{f.team_members?.name || 'Membro'}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(f.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">Nenhuma atividade recente</p>
        )}
      </CardContent>
    </Card>
  );
};
