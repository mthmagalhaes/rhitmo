import { AdminIntelligence } from './AdminIntelligence';
import { AdminObservability } from './AdminObservability';
import { DataExportCard } from './AdminAccessParts';

export const AdminSystem = () => {
  return (
    <div className="space-y-6">
      <AdminIntelligence />
      <div className="px-6 lg:px-8 max-w-5xl mx-auto pb-2">
        <DataExportCard />
      </div>
      <AdminObservability />
    </div>
  );
};
