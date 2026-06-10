import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CompanyWorkspace, CompanyHealth } from '@/hooks/useAdminCompaniesData';

interface Props {
  workspaces: CompanyWorkspace[];
  healthByWorkspace: Map<string, CompanyHealth>;
  pendingCountByWorkspace: Map<string, number>;
  onOpenDetail: (workspaceId: string) => void;
  onOpenPendings: (workspaceId: string) => void;
}

const planColors: Record<string, string> = {
  pulse: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  pro: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  business: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  enterprise: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
};

const segmentColors: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  beta: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  trial: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  internal: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  test: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400',
};

export const CompaniesTable = ({
  workspaces,
  healthByWorkspace,
  pendingCountByWorkspace,
  onOpenDetail,
  onOpenPendings,
}: Props) => {
  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Nenhuma empresa encontrada com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Segmento</TableHead>
            <TableHead className="text-right">Pessoas</TableHead>
            <TableHead className="text-right">Times</TableHead>
            <TableHead>Sync</TableHead>
            <TableHead>Pendências</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workspaces.map((ws) => {
            const h = healthByWorkspace.get(ws.id);
            const pendingCount = pendingCountByWorkspace.get(ws.id) || 0;
            const syncLabel = h && h.totalMembers > 0
              ? `${h.syncedMembers}/${h.totalMembers}`
              : '—';
            const syncOk = !!h && h.totalMembers > 0 && h.syncedMembers === h.totalMembers;
            return (
              <TableRow
                key={ws.id}
                className="cursor-pointer"
                onClick={() => onOpenDetail(ws.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{ws.name}</div>
                      {ws.client_account && (
                        <div className="text-xs text-muted-foreground truncate">{ws.client_account}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">
                  {h?.ownerName || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={planColors[ws.plan_tier] || ''}>
                    {ws.plan_tier}
                  </Badge>
                </TableCell>
                <TableCell>
                  {ws.customer_segment ? (
                    <Badge variant="outline" className={segmentColors[ws.customer_segment] || ''}>
                      {ws.customer_segment}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{h?.totalMembers ?? 0}</TableCell>
                <TableCell className="text-right tabular-nums">{h?.totalTeams ?? 0}</TableCell>
                <TableCell>
                  <span className={`flex items-center gap-1.5 text-xs ${syncOk ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {syncOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {syncLabel}
                  </span>
                </TableCell>
                <TableCell>
                  {pendingCount > 0 ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenPendings(ws.id); }}
                      className="text-xs underline-offset-2 hover:underline text-amber-600"
                    >
                      {pendingCount} pendente{pendingCount === 1 ? '' : 's'}
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-600">Em dia</span>
                  )}
                </TableCell>
                <TableCell>
                  {ws.is_active ? (
                    <Badge variant="outline" className="text-[10px]">Ativo</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">Suspenso</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
