import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAdminCompaniesData, PENDING_LABEL, type PendingRow } from '@/hooks/useAdminCompaniesData';

interface Props {
  workspaceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeePendings: (workspaceId: string) => void;
}

export const CompanyDetailDrawer = ({ workspaceId, open, onOpenChange, onSeePendings }: Props) => {
  const data = useAdminCompaniesData();
  const ws = data.workspaces.find((w) => w.id === workspaceId);
  if (!ws) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg" />
      </Sheet>
    );
  }
  const health = data.healthByWorkspace.get(ws.id);
  const wsTeams = data.teams.filter((t) => t.workspace_id === ws.id);
  const teamIds = new Set(wsTeams.map((t) => t.id));
  const wsMembers = data.members.filter((m) => teamIds.has(m.team_id));
  const pendings: PendingRow[] = data.pendingRows.filter((p) => p.workspaceId === ws.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="font-serif tracking-tight truncate">{ws.name}</SheetTitle>
              <SheetDescription>
                Owner: {health?.ownerName || '—'}
                {ws.client_account ? ` · ${ws.client_account}` : ''}
              </SheetDescription>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="outline" className="text-[10px]">{ws.plan_tier}</Badge>
                {ws.customer_segment && (
                  <Badge variant="outline" className="text-[10px]">{ws.customer_segment}</Badge>
                )}
                {!ws.is_active && <Badge variant="destructive" className="text-[10px]">Suspenso</Badge>}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Kpi label="Pessoas" value={health?.totalMembers ?? 0} />
          <Kpi label="Times" value={health?.totalTeams ?? 0} />
          <Kpi label="Com conta" value={`${health?.linkedMembers ?? 0}/${health?.totalMembers ?? 0}`} />
          <Kpi label="Rhitmo Sync" value={`${health?.syncedMembers ?? 0}/${health?.totalMembers ?? 0}`} />
        </div>

        <section className="mb-6">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" /> Times ({wsTeams.length})
          </h3>
          {wsTeams.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum time criado ainda.</p>
          ) : (
            <ul className="space-y-1.5">
              {wsTeams.map((t) => {
                const tMembers = wsMembers.filter((m) => m.team_id === t.id);
                return (
                  <li key={t.id} className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        Líder: {data.getUserLabel(t.leader_user_id) || (
                          <span className="text-amber-600">sem líder</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {tMembers.length} pessoa{tMembers.length === 1 ? '' : 's'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {pendings.length > 0
                ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              Pendências ({pendings.length})
            </h3>
            {pendings.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => { onSeePendings(ws.id); onOpenChange(false); }}
              >
                Abrir lista <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
          {pendings.length === 0 ? (
            <p className="text-xs text-emerald-600">Tudo em dia.</p>
          ) : (
            <ul className="space-y-1.5">
              {pendings.slice(0, 6).map((p) => (
                <li key={p.id} className="text-sm flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2">
                  <span className="truncate">{p.personName}</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {p.pendings.map((pt) => (
                      <Badge key={pt} variant="outline" className="text-[10px]">
                        {PENDING_LABEL[pt]}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
              {pendings.length > 6 && (
                <li className="text-xs text-muted-foreground">+ {pendings.length - 6} outras</li>
              )}
            </ul>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
};

const Kpi = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-2xl border bg-muted/30 px-3 py-2.5">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-xl font-semibold tabular-nums">{value}</div>
  </div>
);
