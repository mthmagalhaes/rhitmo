import { useEffect, useState } from 'react';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminAccess } from '@/components/admin/AdminAccess';
import { AdminStructure } from '@/components/admin/AdminStructure';
import { AdminIntelligence } from '@/components/admin/AdminIntelligence';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const handleTabChange = (e: CustomEvent) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('admin-tab-change' as any, handleTabChange);
    return () => window.removeEventListener('admin-tab-change' as any, handleTabChange);
  }, []);

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
      observer.observe(tabsElement, { attributes: true, subtree: true, attributeFilter: ['data-state'] });
      return () => observer.disconnect();
    }
  }, [activeTab]);

  return (
    <>
      {activeTab === 'overview' && <AdminOverview />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'structure' && <AdminStructure />}
      {activeTab === 'access' && <AdminAccess />}
      {activeTab === 'intelligence' && <AdminIntelligence />}
    </>
  );
};

export default Admin;
