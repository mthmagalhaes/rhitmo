import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';

/**
 * Pricing v4 — assento + teto de horas de bot (calibrado pelo custo real
 * do Recall: US$0,72/h ≈ R$4,20/h).
 *
 * - Grátis: líder + 3 liderados, 4h de bot por mês por workspace.
 * - Pago: R$ 49,90/mês por assento (R$ 39,90 no anual), assentos ilimitados,
 *   4h de bot por assento pago (sem piso fixo por workspace).
 * - Excedente: pacote de 5h (R$ 39) ou hora avulsa (R$ 8).
 * - Upload manual e Granola continuam livres em qualquer plano.
 * - Workspaces beta/grandfathered mantêm assentos e Recall ilimitados até a
 *   data já combinada.
 */

export const FREE_SEATS = 3;
export const FREE_RECALL_CAP_HOURS = 4;
export const RECALL_HOURS_PER_PAID_SEAT = 4;
export const SEAT_PRICE_MONTHLY_BRL = 49.9;
export const SEAT_PRICE_ANNUAL_MONTHLY_BRL = 39.9;
export const SEAT_PRICE_ANNUAL_BRL = 478.8; // 12 × R$ 39,90
export const ANNUAL_DISCOUNT_PERCENT = 20;
export const EXTRA_HOURS_PACK_HOURS = 5;
export const EXTRA_HOURS_PACK_BRL = 39;
export const EXTRA_HOUR_BRL = 8;
export const RECALL_COST_BRL_PER_HOUR = 4.2;

export type SeatCycle = 'monthly' | 'annual';

interface PlanLimits {
  // Seats / capacity
  freeSeats: number;
  paidSeats: number;
  maxMembers: number;
  maxTeams: number;
  maxReviews: number;
  maxMentorMessages: number;
  maxRecordingHours: number;
  maxBotMeetings: number;

  // Capabilities (todas incluídas no plano único)
  analytics: boolean;
  rhitmoSync: boolean;
  formalReviews: boolean;
  hrDashboard: boolean;
  prioritySupport: boolean;
  assistedOnboarding: boolean;

  // Identidade do plano
  planName: string;
  planTier: 'pulse' | 'pro' | 'business';
  isBetaUser: boolean;

  // Modelo Windmill
  isGrandfathered: boolean;
  grandfatherUntil: string | null;
  recallUnlimited: boolean;
  seatCycle: SeatCycle;
}

const ALL_CAPABILITIES = {
  analytics: true,
  rhitmoSync: true,
  formalReviews: true,
  hrDashboard: true,
  prioritySupport: true,
  assistedOnboarding: true,
};

export const usePlanLimits = () => {
  const { id: effectiveUserId } = useEffectiveUser();
  const user = effectiveUserId ? { id: effectiveUserId } : null;

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ['workspace-plan', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, plan_tier, is_beta_user, paid_seats, grandfather_until, seat_cycle')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: isHrAdmin = false } = useQuery({
    queryKey: ['is-hr-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .contains('hr_admin_ids', [user.id])
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
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
  });

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
  });

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
      return (data || []).reduce((sum, row) => sum + (row.duration_seconds || 0), 0);
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

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
  });

  const isBeta = !!workspace?.is_beta_user;
  const recordingHoursUsed = recordingSecondsUsed / 3600;

  const limits = useMemo<PlanLimits>(() => {
    const tier = (workspace?.plan_tier as 'pulse' | 'pro' | 'business') || 'pulse';
    const grandfatherUntilStr = (workspace as any)?.grandfather_until ?? null;
    const isGrandfathered = !!grandfatherUntilStr && new Date(grandfatherUntilStr) >= new Date(new Date().toDateString());
    const paidSeats: number = (workspace as any)?.paid_seats ?? 0;
    const seatCycle: SeatCycle = ((workspace as any)?.seat_cycle as SeatCycle) || 'monthly';

    const unlocked = isBeta || isGrandfathered;
    const totalSeats = unlocked ? Infinity : FREE_SEATS + paidSeats;
    // Pricing v4: horas de bot com teto por workspace (nunca ilimitado no pago).
    const recallUnlimited = unlocked;
    const recallCapHours =
      paidSeats > 0 ? paidSeats * RECALL_HOURS_PER_PAID_SEAT : FREE_RECALL_CAP_HOURS;

    return {
      freeSeats: FREE_SEATS,
      paidSeats,
      maxMembers: totalSeats,
      maxTeams: Infinity,
      maxReviews: Infinity,
      maxMentorMessages: Infinity,
      maxRecordingHours: recallUnlimited ? Infinity : recallCapHours,
      maxBotMeetings: Infinity,
      ...ALL_CAPABILITIES,
      planName: 'Rhitmo',
      planTier: tier,
      isBetaUser: isBeta,
      isGrandfathered,
      grandfatherUntil: grandfatherUntilStr,
      recallUnlimited,
      seatCycle,
    };
  }, [workspace, isBeta]);

  const isLoading =
    workspaceLoading || memberLoading || reviewLoading || teamLoading || mentorLoading || recordingLoading || botLoading;

  const seatsUsed = memberCount;
  const seatsAvailable = limits.maxMembers === Infinity ? Infinity : Math.max(0, limits.maxMembers - seatsUsed);
  const needsSeatPurchase = !limits.isBetaUser && !limits.isGrandfathered && seatsUsed >= FREE_SEATS + limits.paidSeats;

  return {
    limits,
    memberCount,
    teamCount,
    reviewCount,
    mentorMessageCount,
    recordingHoursUsed,
    botMeetingCount,
    isLoading,
    // seat-aware helpers
    seatsUsed,
    seatsAvailable,
    needsSeatPurchase,
    canAddMember: limits.maxMembers === Infinity || memberCount < limits.maxMembers,
    canAddTeam: true,
    canGenerateReview: true,
    canSendMentorMessage: true,
    canRecord: limits.maxRecordingHours === Infinity || recordingHoursUsed < limits.maxRecordingHours,
    canScheduleBot: true,
    hasAnalytics: limits.analytics,
    hasSync: limits.rhitmoSync,
    hasMentorChat: true,
    hasHrDashboard: limits.hrDashboard,
    hasHrPreview: limits.isBetaUser || isHrAdmin,
    hasFormalReviews: limits.formalReviews,
    membersRemaining: seatsAvailable,
    teamsRemaining: Infinity,
    reviewsRemaining: Infinity,
    mentorMessagesRemaining: Infinity,
    recordingHoursRemaining:
      limits.maxRecordingHours === Infinity ? Infinity : Math.max(0, limits.maxRecordingHours - recordingHoursUsed),
    botMeetingsRemaining: Infinity,
  };
};
