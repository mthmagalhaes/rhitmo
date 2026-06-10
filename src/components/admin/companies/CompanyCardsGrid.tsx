import { CompanyCard } from './CompanyCard';
import type { CompanyWorkspace, CompanyHealth } from '@/hooks/useAdminCompaniesData';

interface Props {
  workspaces: CompanyWorkspace[];
  healthByWorkspace: Map<string, CompanyHealth>;
  onOpenDetail: (workspaceId: string) => void;
  onOpenPendings: (workspaceId: string) => void;
}

export const CompanyCardsGrid = ({ workspaces, healthByWorkspace, onOpenDetail, onOpenPendings }: Props) => {
  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Nenhuma empresa encontrada com os filtros atuais.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {workspaces.map((ws) => {
        const health = healthByWorkspace.get(ws.id) || {
          totalMembers: 0,
          totalTeams: 0,
          linkedMembers: 0,
          syncedMembers: 0,
          teamsWithLeader: 0,
          teamsWithoutLeader: 0,
          ownerName: '—',
        };
        return (
          <CompanyCard
            key={ws.id}
            workspace={ws}
            health={health}
            onOpenDetail={() => onOpenDetail(ws.id)}
            onOpenPendings={() => onOpenPendings(ws.id)}
          />
        );
      })}
    </div>
  );
};
