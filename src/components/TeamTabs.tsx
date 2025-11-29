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
  return (
    <div className="mb-8">
      <Tabs 
        value={activeTeamId || 'all'} 
        onValueChange={(value) => onTeamChange(value === 'all' ? null : value)}
      >
        <TabsList className="h-auto flex-wrap justify-start gap-2 bg-muted/50 p-2">
          <TabsTrigger 
            value="all"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Todos
          </TabsTrigger>
          
          {teams.map((team) => (
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
            className="gap-2 text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent"
          >
            <Plus className="h-4 w-4" />
            Novo Time
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
