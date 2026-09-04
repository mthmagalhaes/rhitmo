import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminWorkspaces } from '@/components/admin/AdminWorkspaces';
import { AdminCosts } from '@/components/admin/AdminCosts';
import { AdminAdoption } from '@/components/admin/AdminAdoption';

export type AdminTab = 'overview' | 'users' | 'workspaces' | 'adoption' | 'costs';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && <AdminOverview />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'workspaces' && <AdminWorkspaces />}
      {activeTab === 'adoption' && <AdminAdoption />}
      {activeTab === 'costs' && <AdminCosts />}
    </AdminLayout>
  );
};

export default Admin;
