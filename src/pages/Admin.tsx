import { useEffect, useState } from 'react';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminSupport } from '@/components/admin/AdminSupport';
import { AdminExport } from '@/components/admin/AdminExport';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminAccess } from '@/components/admin/AdminAccess';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Listen to custom events from AdminLayout
  useEffect(() => {
    const handleTabChange = (e: CustomEvent) => {
      setActiveTab(e.detail);
    };

    window.addEventListener('admin-tab-change' as any, handleTabChange);
    return () => window.removeEventListener('admin-tab-change' as any, handleTabChange);
  }, []);

  // Sync activeTab state with AdminLayout via custom events
  useEffect(() => {
    const tabsElement = document.querySelector('[role="tablist"]');
    if (tabsElement) {
      const observer = new MutationObserver(() => {
        const activeButton = tabsElement.querySelector('[data-state="active"]');
        if (activeButton) {
          const value = activeButton.getAttribute('value');
          if (value && value !== activeTab) {
            setActiveTab(value);
          }
        }
      });

      observer.observe(tabsElement, {
        attributes: true,
        subtree: true,
        attributeFilter: ['data-state'],
      });

      return () => observer.disconnect();
    }
  }, [activeTab]);

  return (
    <>
      {activeTab === 'overview' && <AdminOverview />}
      {activeTab === 'support' && <AdminSupport />}
      {activeTab === 'export' && <AdminExport />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'access' && <AdminAccess />}
    </>
  );
};

export default Admin;
