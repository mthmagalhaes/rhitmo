import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { CompanyHealth, CompanyWorkspace } from '@/hooks/useAdminCompaniesData';

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
  internal: 'bg-slate-500/15 text-slate-700 dark:text-slate-500',
  test: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400',
};

interface Props {
  workspace: CompanyWorkspace;
  health: CompanyHealth;
  onOpenDetail: () => void;
  onOpenPendings: () => void;
}

export const CompanyCard = ({ workspace, health, onOpenDetail, onOpenPendings }: Props) => {
  const synced = health.totalMembers > 0 ? `${health.syncedMembers}/${health.totalMembers}` : '0/0';
  const linked = health.totalMembers > 0 ? `${health.linkedMembers}/${health.totalMembers}` : '0/0';

  return (
    <Card className="rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-transform">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold tracking-tight truncate">{workspace.name}</h3>
            <p className="text-xs text-muted-foreground truncate">Owner: {health.ownerName}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          {workspace.customer_segment && (
            <Badge variant="outline" className={segmentColors[workspace.customer_segment] || ''}>
              {workspace.customer_segment}
            </Badge>
          )}
          <Badge variant="outline" className={planColors[workspace.plan_tier] || ''}>
            {workspace.plan_tier}
          </Badge>
          {!workspace.is_active && (
            <Badge variant="destructive" className="text-[10px]">Suspenso</Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {health.totalMembers} pessoas
        </span>
        <span>·</span>
        <span>{health.totalTeams} times</span>
        {workspace.client_account && (
          <>
            <span>·</span>
            <span className="truncate">{workspace.client_account}</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <HealthChip
          ok={health.syncedMembers === health.totalMembers && health.totalMembers > 0}
          label={`${synced} Rhitmo Sync`}
        />
        <HealthChip
          ok={health.teamsWithoutLeader === 0}
          label={`${health.teamsWithoutLeader} sem líder`}
          warn={health.teamsWithoutLeader > 0}
        />
        <HealthChip
          ok={health.linkedMembers === health.totalMembers && health.totalMembers > 0}
          label={`${linked} com conta`}
        />
        <HealthChip
          ok={health.teamsWithLeader > 0}
          label={`${health.teamsWithLeader} times ativos`}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={onOpenDetail}>
          Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="rounded-xl" onClick={onOpenPendings}>
          Pendências
        </Button>
      </div>
    </Card>
  );
};

const HealthChip = ({ ok, warn, label }: { ok: boolean; warn?: boolean; label: string }) => {
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  const tone = ok
    ? 'text-emerald-600 dark:text-emerald-400'
    : warn
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-muted-foreground';
  return (
    <span className={`flex items-center gap-1.5 ${tone}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
};
