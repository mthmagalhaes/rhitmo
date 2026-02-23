import { createContext, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface HRAdminContextType {
  workspaceId: string;
  workspaceName: string;
}

const HRAdminContext = createContext<HRAdminContextType | null>(null);

export const useHRAdmin = () => {
  const ctx = useContext(HRAdminContext);
  if (!ctx) throw new Error('useHRAdmin must be inside HRAdminGuard');
  return ctx;
};

export const HRAdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['hr-admin-workspace', user?.id],
    queryFn: async () => {
      // RLS policy returns only workspaces where user is hr_admin
      // We also need to exclude workspaces the user owns (they'd see those too via owner policy)
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, hr_admin_ids')
        .order('name')
        .limit(10);
      if (error) throw error;
      // Find workspace where user is actually in hr_admin_ids
      return data?.find(w => 
        (w as any).hr_admin_ids?.includes(user?.id)
      ) || null;
    },
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !workspace) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <HRAdminContext.Provider value={{ workspaceId: workspace.id, workspaceName: workspace.name }}>
      {children}
    </HRAdminContext.Provider>
  );
};
