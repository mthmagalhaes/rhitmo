import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminWorkspaces } from '@/components/admin/AdminWorkspaces';

export type AdminTab = 'overview' | 'users' | 'workspaces';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && <AdminOverview />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'workspaces' && <AdminWorkspaces />}
    </AdminLayout>
  );
};

export default Admin;
