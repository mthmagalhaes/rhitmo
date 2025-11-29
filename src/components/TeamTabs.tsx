import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Team } from '@/types/team';
import { Plus } from 'lucide-react';

interface TeamTabsProps {
  teams: Team[];
  activeTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  onNewTeam: () => void;
}

export const TeamTabs = ({ 
  teams, 
  activeTeamId, 
  onTeamChange, 
  onNewTeam 
}: TeamTabsProps) => {
  // Separar "Sem Time" dos demais e ordenar alfabeticamente
  const semTimeTeam = teams.find(t => t.name === 'Sem Time');
  const otherTeams = teams
    .filter(t => t.name !== 'Sem Time')
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="mb-8">
      <Tabs 
        value={activeTeamId || 'all'} 
        onValueChange={(value) => onTeamChange(value === 'all' ? null : value)}
      >
        <TabsList className="h-auto flex-nowrap justify-start gap-2 bg-muted/50 p-2 overflow-x-auto max-w-full scrollbar-thin">
          <TabsTrigger 
            value="all"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Todos
          </TabsTrigger>
          
          {semTimeTeam && (
            <TabsTrigger 
              key={semTimeTeam.id} 
              value={semTimeTeam.id}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {semTimeTeam.name}
            </TabsTrigger>
          )}
          
          {otherTeams.map((team) => (
            <TabsTrigger 
              key={team.id} 
              value={team.id}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {team.name}
            </TabsTrigger>
          ))}
          
          <TabsTrigger
            value="__new_team__"
            onClick={(e) => {
              e.preventDefault();
              onNewTeam();
            }}
            className="gap-2 border-2 border-dashed border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 data-[state=active]:bg-transparent"
          >
            <Plus className="h-4 w-4" />
            Novo Time
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
