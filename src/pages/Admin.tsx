import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminWorkspaces } from '@/components/admin/AdminWorkspaces';
import { AdminCosts } from '@/components/admin/AdminCosts';

export type AdminTab = 'overview' | 'users' | 'workspaces' | 'costs';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && <AdminOverview />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'workspaces' && <AdminWorkspaces />}
      {activeTab === 'costs' && <AdminCosts />}
    </AdminLayout>
  );
};

export default Admin;
