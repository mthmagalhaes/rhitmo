import { AdminStructure } from './AdminStructure';
import { HRAdminInviteCard, HRAdminsListCard } from './AdminAccessParts';

export const AdminWorkspaces = () => {
  return (
    <div className="space-y-6">
      <AdminStructure />
      <div className="px-6 lg:px-8 max-w-5xl mx-auto space-y-6 pb-10">
        <HRAdminInviteCard />
        <HRAdminsListCard />
      </div>
    </div>
  );
};
