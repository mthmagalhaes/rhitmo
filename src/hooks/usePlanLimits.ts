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
  maxTeams: number;
  maxMentorMessages: number;
  maxRecordingHours: number;
  analytics: boolean;
  rhitmoSync: boolean;
  formalReviews: boolean;
  hrDashboard: boolean;
  prioritySupport: boolean;
  assistedOnboarding: boolean;
  planName: string;
  planTier: 'pulse' | 'pro' | 'business';
}

const PLAN_LIMITS: Record<string, Omit<PlanLimits, 'planTier'>> = {
  pulse: {
    maxMembers: 3,
    maxReviews: 1,
    maxTeams: 1,
    maxMentorMessages: 20,
    maxRecordingHours: 0,
    analytics: false,
    rhitmoSync: false,
    formalReviews: true,
    hrDashboard: false,
    prioritySupport: false,
    assistedOnboarding: false,
    planName: 'Pulse',
  },
  pro: {
    maxMembers: 5,
    maxReviews: Infinity,
    maxTeams: 3,
    maxMentorMessages: Infinity,
    maxRecordingHours: 12,
    analytics: true,
    rhitmoSync: true,
    formalReviews: true,
    hrDashboard: false,
    prioritySupport: false,
    assistedOnboarding: false,
    planName: 'Pro',
  },
  business: {
    maxMembers: 8,
    maxReviews: Infinity,
    maxTeams: Infinity,
    maxMentorMessages: Infinity,
    maxRecordingHours: 30,
    analytics: true,
    rhitmoSync: true,
    formalReviews: true,
    hrDashboard: true,
    prioritySupport: true,
    assistedOnboarding: true,
    planName: 'Business',
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

  const { data: teamCount = 0, isLoading: teamLoading } = useQuery({
    queryKey: ['team-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('teams')
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

  // BETA: Forçar limites do plano Business para todos
  const limits = useMemo<PlanLimits>(() => {
    if (BETA_MODE) {
      return {
        maxMembers: 9999,
        maxReviews: 9999,
        maxTeams: 9999,
        maxMentorMessages: 9999,
        maxRecordingHours: 9999,
        analytics: true,
        rhitmoSync: true,
        formalReviews: true,
        hrDashboard: true,
        prioritySupport: true,
        assistedOnboarding: true,
        planName: 'Business',
        planTier: 'business',
      };
    }
    
    const tier = (workspace?.plan_tier as 'pulse' | 'pro' | 'business') || 'pulse';
    return {
      ...PLAN_LIMITS[tier],
      planTier: tier,
    };
  }, [workspace?.plan_tier]);

  const isLoading = workspaceLoading || memberLoading || reviewLoading || teamLoading;

  return {
    limits,
    memberCount,
    teamCount,
    reviewCount,
    isLoading,
    // BETA: Sempre true para todas as permissões
    canAddMember: BETA_MODE ? true : memberCount < limits.maxMembers,
    canAddTeam: BETA_MODE ? true : teamCount < limits.maxTeams,
    canGenerateReview: BETA_MODE ? true : reviewCount < limits.maxReviews,
    hasAnalytics: BETA_MODE ? true : limits.analytics,
    hasSync: BETA_MODE ? true : limits.rhitmoSync,
    hasMentorChat: BETA_MODE ? true : true,
    hasHrDashboard: BETA_MODE ? true : limits.hrDashboard,
    hasFormalReviews: BETA_MODE ? true : limits.formalReviews,
    // Valores altos para upgrade messages
    membersRemaining: BETA_MODE ? 9999 : limits.maxMembers - memberCount,
    teamsRemaining: BETA_MODE ? 9999 : limits.maxTeams - teamCount,
    reviewsRemaining: BETA_MODE ? 9999 : limits.maxReviews - reviewCount,
  };
};
