import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';

interface PlanLimits {
  maxMembers: number;
  maxReviews: number;
  maxTeams: number;
  maxMentorMessages: number;
  maxRecordingHours: number;
  maxBotMeetings: number;
  analytics: boolean;
  rhitmoSync: boolean;
  formalReviews: boolean;
  hrDashboard: boolean;
  prioritySupport: boolean;
  assistedOnboarding: boolean;
  planName: string;
  planTier: 'pulse' | 'pro' | 'business';
  isBetaUser: boolean;
}

const PLAN_LIMITS: Record<string, Omit<PlanLimits, 'planTier' | 'isBetaUser'>> = {
  pulse: {
    maxMembers: 2,
    maxReviews: 1,
    maxTeams: 1,
    maxMentorMessages: 20,
    maxRecordingHours: 0,
    maxBotMeetings: 0,
    analytics: false,
    rhitmoSync: false,
    formalReviews: true,
    hrDashboard: false,
    prioritySupport: false,
    assistedOnboarding: false,
    planName: 'Pulse',
  },
  pro: {
    // Pricing 18/04/2026: Pro agora oferece liderados, times e bot ilimitados
    // (15h/mês de bot conforme contrato), alinhado à remoção do plano Business.
    maxMembers: Infinity,
    maxReviews: Infinity,
    maxTeams: Infinity,
    maxMentorMessages: Infinity,
    maxRecordingHours: 30,
    maxBotMeetings: Infinity,
    analytics: true,
    rhitmoSync: true,
    formalReviews: true,
    hrDashboard: false,
    prioritySupport: true,
    assistedOnboarding: false,
    planName: 'Pro',
  },
  // 'business' é mantido por compatibilidade com workspaces legados,
  // mas é apresentado como Pro (mesmas capacidades).
  business: {
    maxMembers: Infinity,
    maxReviews: Infinity,
    maxTeams: Infinity,
    maxMentorMessages: Infinity,
    maxRecordingHours: 30,
    maxBotMeetings: Infinity,
    analytics: true,
    rhitmoSync: true,
    formalReviews: true,
    hrDashboard: true,
    prioritySupport: true,
    assistedOnboarding: true,
    planName: 'Pro',
  },
};

export const usePlanLimits = () => {
  const { id: effectiveUserId } = useEffectiveUser();
  const user = effectiveUserId ? { id: effectiveUserId } : null;

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ['workspace-plan', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, plan_tier, is_beta_user')
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

  // Count mentor messages sent this month (role = 'user' only)
  const { data: mentorMessageCount = 0, isLoading: mentorLoading } = useQuery({
    queryKey: ['mentor-message-count-month', user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('mentor_messages')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user')
        .gte('created_at', startOfMonth.toISOString());
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  // Sum recording hours used this month
  const { data: recordingSecondsUsed = 0, isLoading: recordingLoading } = useQuery({
    queryKey: ['recording-seconds-month', user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('meeting_transcripts')
        .select('duration_seconds')
        .gte('created_at', startOfMonth.toISOString());
      if (error) throw error;
      const total = (data || []).reduce((sum, row) => sum + (row.duration_seconds || 0), 0);
      return total;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  // Count bot meetings scheduled this month (status != 'error')
  const { data: botMeetingCount = 0, isLoading: botLoading } = useQuery({
    queryKey: ['bot-meeting-count-month', user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await (supabase as any)
        .from('recall_bots')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'error')
        .gte('created_at', startOfMonth.toISOString());
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const isBeta = !!workspace?.is_beta_user;
  const recordingHoursUsed = recordingSecondsUsed / 3600;

  const limits = useMemo<PlanLimits>(() => {
    const tier = (workspace?.plan_tier as 'pulse' | 'pro' | 'business') || 'pulse';
    const baseLimits = PLAN_LIMITS[tier];

    if (isBeta) {
      return {
        maxMembers: Infinity,
        maxReviews: Infinity,
        maxTeams: Infinity,
        maxMentorMessages: Infinity,
        maxRecordingHours: Infinity,
        maxBotMeetings: Infinity,
        analytics: true,
        rhitmoSync: true,
        formalReviews: true,
        hrDashboard: true,
        prioritySupport: true,
        assistedOnboarding: true,
        planName: baseLimits.planName,
        planTier: tier,
        isBetaUser: true,
      };
    }

    return {
      ...baseLimits,
      planTier: tier,
      isBetaUser: false,
    };
  }, [workspace?.plan_tier, isBeta]);

  const isLoading = workspaceLoading || memberLoading || reviewLoading || teamLoading || mentorLoading || recordingLoading || botLoading;

  return {
    limits,
    memberCount,
    teamCount,
    reviewCount,
    mentorMessageCount,
    recordingHoursUsed,
    botMeetingCount,
    isLoading,
    canAddMember: isBeta ? true : memberCount < limits.maxMembers,
    canAddTeam: isBeta ? true : teamCount < limits.maxTeams,
    canGenerateReview: isBeta ? true : reviewCount < limits.maxReviews,
    canSendMentorMessage: isBeta ? true : limits.maxMentorMessages === Infinity || mentorMessageCount < limits.maxMentorMessages,
    canRecord: isBeta ? true : limits.maxRecordingHours > 0 && recordingHoursUsed < limits.maxRecordingHours,
    canScheduleBot: isBeta ? true : limits.maxBotMeetings > 0 && botMeetingCount < limits.maxBotMeetings,
    hasAnalytics: isBeta ? true : limits.analytics,
    hasSync: isBeta ? true : limits.rhitmoSync,
    hasMentorChat: true,
    hasHrDashboard: isBeta ? true : limits.hrDashboard,
    hasFormalReviews: isBeta ? true : limits.formalReviews,
    membersRemaining: isBeta ? Infinity : limits.maxMembers - memberCount,
    teamsRemaining: isBeta ? Infinity : limits.maxTeams - teamCount,
    reviewsRemaining: isBeta ? Infinity : limits.maxReviews - reviewCount,
    mentorMessagesRemaining: isBeta ? Infinity : limits.maxMentorMessages === Infinity ? Infinity : limits.maxMentorMessages - mentorMessageCount,
    recordingHoursRemaining: isBeta ? Infinity : limits.maxRecordingHours === Infinity ? Infinity : limits.maxRecordingHours - recordingHoursUsed,
    botMeetingsRemaining: isBeta ? Infinity : limits.maxBotMeetings === 0 ? 0 : limits.maxBotMeetings - botMeetingCount,
  };
};
