import { createContext, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface HRAdminContextType {
  workspaceId: string;
  workspaceName: string;
  /** True when the user is the workspace Owner (regardless of HR Admin). */
  isOwner: boolean;
  /** True when the user is listed in workspaces.hr_admin_ids. */
  isHRAdmin: boolean;
}

const HRAdminContext = createContext<HRAdminContextType | null>(null);

export const useHRAdmin = () => {
  const ctx = useContext(HRAdminContext);
  if (!ctx) throw new Error('useHRAdmin must be inside HRAdminGuard');
  return ctx;
};

/**
 * Workspace Admin guard.
 *
 * Allows access to /hr/* (and /workspace/*) for either the workspace Owner
 * OR an HR Admin. Pre-2026-05 this was HR-only; Owner now also enters
 * because Owner lost "see-all" inside /lider/* and needs a dedicated
 * structural/analytics view of the workspace.
 */
export const HRAdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspace-admin-workspace', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Try Owner first (single owner per workspace).
      const ownedRes = await supabase
        .from('workspaces')
        .select('id, name, owner_id, hr_admin_ids')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (ownedRes.data) {
        return {
          id: ownedRes.data.id,
          name: ownedRes.data.name,
          isOwner: true,
          isHRAdmin: (ownedRes.data.hr_admin_ids ?? []).includes(user.id),
        };
      }

      // Fall back to HR Admin membership.
      const hrRes = await supabase
        .from('workspaces')
        .select('id, name, owner_id, hr_admin_ids')
        .contains('hr_admin_ids', [user.id])
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (hrRes.data) {
        return {
          id: hrRes.data.id,
          name: hrRes.data.name,
          isOwner: hrRes.data.owner_id === user.id,
          isHRAdmin: true,
        };
      }
      return null;
    },
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000,
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
    <HRAdminContext.Provider
      value={{
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        isOwner: workspace.isOwner,
        isHRAdmin: workspace.isHRAdmin,
      }}
    >
      {children}
    </HRAdminContext.Provider>
  );
};
