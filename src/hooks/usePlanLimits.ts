import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// BETA MODE: Libera todas as funcionalidades para todos os usuários
// Mudar para false quando sair do Beta para respeitar plan_tier do banco
const BETA_MODE = true;

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

  // CORRIGIDO: Adicionar filtro owner_id + order().limit(1) para evitar problemas com duplicatas
  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ['workspace-plan', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, plan_tier')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
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

  // BETA: Forçar limites do plano Maestro para todos
  const limits = useMemo<PlanLimits>(() => {
    if (BETA_MODE) {
      return {
        maxMembers: 9999,
        maxReviews: 9999,
        analytics: true,
        sync: true,
        planName: 'Maestro',
        planTier: 'maestro',
      };
    }
    
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
    // BETA: Sempre true para todas as permissões
    canAddMember: BETA_MODE ? true : memberCount < limits.maxMembers,
    canGenerateReview: BETA_MODE ? true : reviewCount < limits.maxReviews,
    hasAnalytics: BETA_MODE ? true : limits.analytics,
    hasSync: BETA_MODE ? true : limits.sync,
    // Valores altos para upgrade messages
    membersRemaining: BETA_MODE ? 9999 : limits.maxMembers - memberCount,
    reviewsRemaining: BETA_MODE ? 9999 : limits.maxReviews - reviewCount,
  };
};
