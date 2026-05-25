import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NewTeamDialog } from '@/components/NewTeamDialog';
import { Plus } from 'lucide-react';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Users, Search, AlertTriangle, ChevronRight,
  FileText, CheckCircle, XCircle
} from 'lucide-react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { HRUpgradeGate } from '@/components/hr/HRUpgradeGate';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Leader {
  leader_id: string;
  leader_name: string;
  leader_email: string;
  total_members: number;
  feedbacks_last_30d: number;
  last_feedback_at: string | null;
  days_since_last_feedback: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  last_feedback_at: string | null;
  days_since_last_feedback: number;
  pdi_count: number;
  has_sync: boolean;
}

const HRTeams = () => {
  const { workspaceId } = useHRAdmin();
  const { hasHrDashboard, isLoading: planLoading } = usePlanLimits();
  const [search, setSearch] = useState('');

  if (!planLoading && !hasHrDashboard) {
    return <HRUpgradeGate title="Times e líderes exigem Enterprise" description="A prévia Pulse mostra a visão geral. Para cadastrar e acompanhar múltiplos líderes, faça upgrade para o plano Enterprise." />;
  }
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: leadersData, isLoading } = useQuery({
    queryKey: ['hr-leaders', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_leaders_overview', {
        _workspace_id: workspaceId,
      });
      if (error) throw error;
      return data as unknown as { leaders: Leader[] };
    },
  });

  const { data: teamData, isLoading: isLoadingTeam } = useQuery({
    queryKey: ['hr-leader-team', workspaceId, selectedLeader?.leader_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_leader_team', {
        _workspace_id: workspaceId,
        _leader_id: selectedLeader!.leader_id,
      });
      if (error) throw error;
      return data as unknown as { members: TeamMember[] };
    },
    enabled: !!selectedLeader,
  });

  const leaders = leadersData?.leaders ?? [];
  const teamMembers = teamData?.members ?? [];

  const filtered = leaders.filter(
    (l) =>
      l.leader_name.toLowerCase().includes(search.toLowerCase()) ||
      l.leader_email.toLowerCase().includes(search.toLowerCase()),
  );

  const activityBadge = (days: number) => {
    if (days === 999)
      return <Badge variant="destructive" className="text-xs">Sem feedback</Badge>;
    if (days >= 60)
      return <Badge variant="destructive" className="text-xs">{days}d inativo</Badge>;
    if (days >= 30)
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">{days}d</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">{days}d atrás</Badge>;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Times e Líderes</h1>
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar líder por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>

        {/* Leaders list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-3xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/80 rounded-3xl shadow-sm p-12 text-center">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {search
                ? `Nenhum líder encontrado para "${search}"`
                : 'Nenhum líder cadastrado'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((leader) => (
              <div
                key={leader.leader_id}
                className="bg-white/80 rounded-3xl shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold tracking-tight text-gray-900">
                        {leader.leader_name}
                      </h3>
                      {leader.days_since_last_feedback >= 60 && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{leader.leader_email}</p>
                    <div className="flex items-center gap-4 pt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {leader.total_members} liderado{leader.total_members !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {leader.feedbacks_last_30d} feedback{leader.feedbacks_last_30d !== 1 ? 's' : ''} (30d)
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        Atividade: {activityBadge(leader.days_since_last_feedback)}
                      </span>
                    </div>
                  </div>
          <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1"
                    onClick={() => setSelectedLeader(leader)}
                  >
                    Ver time <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      

      {/* Sheet: Team drill-down */}
      <Sheet open={!!selectedLeader} onOpenChange={() => setSelectedLeader(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Time de {selectedLeader?.leader_name}</SheetTitle>
            <SheetDescription>
              {teamMembers.length} liderado{teamMembers.length !== 1 ? 's' : ''}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {isLoadingTeam ? (
              [1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum liderado cadastrado</p>
              </div>
            ) : (
              teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="border border-gray-100 rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email ?? member.role}</p>
                    </div>
                    {member.has_sync && (
                      <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 text-xs">
                        Sync ✓
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      Feedback:{' '}
                      {member.last_feedback_at ? (
                        <span className="text-gray-700">
                          {formatDistanceToNow(new Date(member.last_feedback_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      ) : (
                        <span className="text-red-500">Nunca</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      PDI:{' '}
                      {member.pdi_count > 0 ? (
                        <span className="flex items-center gap-0.5 text-emerald-600">
                          <CheckCircle className="h-3 w-3" /> {member.pdi_count}
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-red-500">
                          <XCircle className="h-3 w-3" /> Sem PDI
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default HRTeams;
