import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PlanLimits {
  maxMembers: number;
  maxReviews: number;
  analytics: boolean;
  sync: boolean;
  planName: string;
  planTier: 'pulse' | 'flow' | 'maestro';
}

const PLAN_LIMITS: Record<string, Omit<PlanLimits, 'planTier'>> = {
  pulse: {
    maxMembers: 3,
    maxReviews: 2,
    analytics: false,
    sync: false,
    planName: 'Pulse',
  },
  flow: {
    maxMembers: 10,
    maxReviews: 999,
    analytics: false,
    sync: true,
    planName: 'Flow',
  },
  maestro: {
    maxMembers: 999,
    maxReviews: 999,
    analytics: true,
    sync: true,
    planName: 'Maestro',
  },
};

export const usePlanLimits = () => {
  const { user } = useAuth();

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ['workspace-plan', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, plan_tier')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 segundos para sincronizar mudanças do admin rapidamente
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: memberCount = 0, isLoading: memberLoading } = useQuery({
    queryKey: ['member-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: reviewCount = 0, isLoading: reviewLoading } = useQuery({
    queryKey: ['review-count-month', user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count, error } = await supabase
        .from('performance_reviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const limits = useMemo<PlanLimits>(() => {
    const tier = (workspace?.plan_tier as 'pulse' | 'flow' | 'maestro') || 'pulse';
    return {
      ...PLAN_LIMITS[tier],
      planTier: tier,
    };
  }, [workspace?.plan_tier]);

  const isLoading = workspaceLoading || memberLoading || reviewLoading;

  return {
    limits,
    memberCount,
    reviewCount,
    isLoading,
    // Helpers
    canAddMember: memberCount < limits.maxMembers,
    canGenerateReview: reviewCount < limits.maxReviews,
    hasAnalytics: limits.analytics,
    hasSync: limits.sync,
    // Para upgrade messages
    membersRemaining: limits.maxMembers - memberCount,
    reviewsRemaining: limits.maxReviews - reviewCount,
  };
};
