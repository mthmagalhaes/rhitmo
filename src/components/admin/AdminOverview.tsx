import { FunnelCard } from './FunnelCard';
import { ActivationCohorts } from './ActivationCohorts';
import { StatsGrid } from './StatsGrid';
import { InactiveWorkspacesAlert } from './InactiveWorkspacesAlert';
import { RecentActivityCard } from './RecentActivityCard';
import { WaitlistTable } from './WaitlistTable';

export const AdminOverview = () => {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground">Visão geral e alertas do sistema</p>
      </div>

      <FunnelCard />
      <ActivationCohorts />
      <StatsGrid />
      <InactiveWorkspacesAlert />
      <RecentActivityCard />
      <WaitlistTable />
    </div>
  );
};
