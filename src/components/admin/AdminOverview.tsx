import { FunnelCard } from './FunnelCard';
import { ActivationCohorts } from './ActivationCohorts';
import { StatsGrid } from './StatsGrid';
import { InactiveWorkspacesAlert } from './InactiveWorkspacesAlert';
import { WaitlistTable } from './WaitlistTable';

export const AdminOverview = () => {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground mt-1">KPIs, funil de ativação e alertas operacionais.</p>
      </header>

      <StatsGrid />

      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelCard />
        <ActivationCohorts />
      </div>

      <InactiveWorkspacesAlert />
      <WaitlistTable />
    </div>
  );
};
