import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export const InactiveWorkspacesAlert = () => {
  const { data: alerts } = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: allWs } = await supabase
        .from('workspaces')
        .select('id, name, owner_id')
        .eq('is_active', true);

      const { data: activeFeedbackWs } = await supabase
        .from('feedbacks')
        .select('member_id, team_members(team_id, teams(workspace_id))')
        .gte('created_at', thirtyDaysAgo);

      const activeWsIds = new Set<string>();
      activeFeedbackWs?.forEach((f: any) => {
        const wsId = f.team_members?.teams?.workspace_id;
        if (wsId) activeWsIds.add(wsId);
      });

      const inactiveWs = allWs?.filter((ws) => !activeWsIds.has(ws.id)) || [];
      return { inactiveWorkspaces: inactiveWs.length };
    },
  });

  if (!alerts || alerts.inactiveWorkspaces === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex items-center gap-4 py-4">
        <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
        <div>
          <p className="font-medium text-amber-700 dark:text-amber-400">
            {alerts.inactiveWorkspaces} workspace{alerts.inactiveWorkspaces > 1 ? 's' : ''} sem atividade há 30+ dias
          </p>
          <p className="text-sm text-muted-foreground">Verifique na aba Inteligência para detalhes</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: 'intelligence' }))}
        >
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
};
