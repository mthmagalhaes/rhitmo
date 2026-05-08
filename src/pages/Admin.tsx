import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminWorkspaces } from '@/components/admin/AdminWorkspaces';
import { AdminSystem } from '@/components/admin/AdminSystem';

export type AdminTab = 'overview' | 'users' | 'workspaces' | 'system';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && <AdminOverview />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'workspaces' && <AdminWorkspaces />}
      {activeTab === 'system' && <AdminSystem />}
    </AdminLayout>
  );
};

export default Admin;
