import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, Crown, AlertTriangle, User } from 'lucide-react';
import type {
  CompanyWorkspace,
  CompanyTeam,
  CompanyMember,
} from '@/hooks/useAdminCompaniesData';

interface Props {
  workspaces: CompanyWorkspace[];
  teams: CompanyTeam[];
  members: CompanyMember[];
  getUserLabel: (userId: string | null | undefined) => string | null;
  initialWorkspaceId?: string | null;
}

export const CompanyOrgChart = ({
  workspaces,
  teams,
  members,
  getUserLabel,
  initialWorkspaceId,
}: Props) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialWorkspaceId || workspaces[0]?.id || null,
  );

  useEffect(() => {
    if (initialWorkspaceId) setSelectedId(initialWorkspaceId);
  }, [initialWorkspaceId]);

  const ws = workspaces.find((w) => w.id === selectedId);

  const wsTeams = useMemo(
    () => (selectedId ? teams.filter((t) => t.workspace_id === selectedId) : []),
    [teams, selectedId],
  );

  const orphanTeams = wsTeams.filter((t) => !t.leader_user_id);
  const ledTeams = wsTeams.filter((t) => !!t.leader_user_id);

  if (!ws) {
    return <div className="text-sm text-muted-foreground">Selecione uma empresa.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Empresa</span>
        <Select value={selectedId || ''} onValueChange={setSelectedId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Workspace node */}
      <div className="flex justify-center">
        <Card className="rounded-2xl px-6 py-4 flex items-center gap-3 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">{ws.name}</p>
            <p className="text-xs text-muted-foreground">
              Owner: {getUserLabel(ws.owner_id) || '—'}
              {ws.hr_admin_ids?.length ? ` · ${ws.hr_admin_ids.length} HR` : ''}
            </p>
          </div>
        </Card>
      </div>

      {orphanTeams.length > 0 && (
        <Card className="rounded-2xl p-4 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-400 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Times sem líder ({orphanTeams.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {orphanTeams.map((t) => (
              <Badge key={t.id} variant="outline" className="rounded-lg gap-1.5 py-1">
                <Users className="h-3 w-3" />
                {t.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {ledTeams.length === 0 && orphanTeams.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhum time cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ledTeams.map((t) => {
            const teamMembers = members.filter((m) => m.team_id === t.id);
            return (
              <Card key={t.id} className="rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {teamMembers.length} pessoas
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm pb-2 border-b">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  <span className="truncate">{getUserLabel(t.leader_user_id) || '—'}</span>
                </div>
                <div className="pt-2 space-y-1">
                  {teamMembers.length === 0 && (
                    <div className="text-xs text-muted-foreground">Sem liderados</div>
                  )}
                  {teamMembers.map((m) => {
                    const noAccount = !m.linked_user_id;
                    const noSync = m.linked_user_id && !m.work_style_data;
                    const hasPending = noAccount || noSync;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg ${
                          hasPending ? 'border border-amber-500/40 bg-amber-500/5' : ''
                        }`}
                      >
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate flex-1">{m.name}</span>
                        {noAccount && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            sem conta
                          </Badge>
                        )}
                        {noSync && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            sync pendente
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
