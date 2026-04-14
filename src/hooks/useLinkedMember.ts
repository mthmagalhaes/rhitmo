import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface LinkedMemberData {
  id: string;
  name: string;
  email: string | null;
  role: string;
  avatar: string | null;
  skills_data: {
    onboarding_completed?: boolean;
    role_tenure?: string;
    responsibilities?: string[];
    aspirations?: string;
    interests?: string[];
    completed_at?: string;
    ai_analysis?: {
      alignment_score: number;
      analysis_summary: string;
      key_gaps: string[];
      suggested_focus: string[];
      analyzed_at?: string;
    };
  } | null;
  work_style_data?: Record<string, unknown> | null;
  chronotype?: string | null;
  feedback_style?: string | null;
  recognition_style?: string | null;
  motivators?: unknown[] | null;
  user_manual?: Record<string, unknown> | null;
  updated_at?: string;
}

export function useLinkedMember() {
  const { user, loading: authLoading } = useAuth();

  const { data: linkedMember, isLoading: queryLoading } = useQuery({
    queryKey: ['linked-member', user?.id],
    queryFn: async (): Promise<LinkedMemberData | null> => {
      if (!user) return null;

      // CRITICAL: Wait for session before RLS-dependent queries
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session — will retry');
      }

      // LEADER GUARD: owners/leaders are never linked members
      const [ownerCheck, leaderCheck] = await Promise.all([
        supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('teams')
          .select('id')
          .eq('leader_user_id', user.id)
          .limit(1)
          .maybeSingle(),
      ]);

      if (ownerCheck.data || leaderCheck.data) {
        return null;
      }
      
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, role, avatar, skills_data, work_style_data, chronotype, feedback_style, recognition_style, motivators, user_manual, updated_at')
        .eq('linked_user_id', user.id)
        .eq('invite_status', 'accepted')
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching linked member:', error);
        return null;
      }
      
      return data as LinkedMemberData | null;
    },
    enabled: !!user && !authLoading,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const needsOnboarding = linkedMember && 
    !linkedMember.skills_data?.onboarding_completed;

  return {
    linkedMember,
    isLinkedMember: !!linkedMember,
    needsOnboarding: !!needsOnboarding,
    isLoading: authLoading || queryLoading,
  };
}
