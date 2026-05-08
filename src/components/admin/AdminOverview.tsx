import { ShieldCheck } from 'lucide-react';
import { FunnelCard } from './FunnelCard';
import { ActivationCohorts } from './ActivationCohorts';
import { StatsGrid } from './StatsGrid';
import { InactiveWorkspacesAlert } from './InactiveWorkspacesAlert';
import { WaitlistTable } from './WaitlistTable';

export const AdminOverview = () => {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Painel admin
        </div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">KPIs, funil de ativação e alertas operacionais.</p>
      </header>

      <StatsGrid />

      <InactiveWorkspacesAlert />

      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelCard />
        <ActivationCohorts />
      </div>

      <WaitlistTable />
    </div>
  );
};
