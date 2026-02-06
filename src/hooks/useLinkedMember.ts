import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface LinkedMemberData {
  id: string;
  name: string;
  email: string | null;
  role: string;
  skills_data: {
    onboarding_completed?: boolean;
    role_tenure?: string;
    responsibilities?: string[];
    aspirations?: string;
    interests?: string[];
    completed_at?: string;
  } | null;
}

export function useLinkedMember() {
  const { user, loading: authLoading } = useAuth();

  const { data: linkedMember, isLoading: queryLoading } = useQuery({
    queryKey: ['linked-member', user?.id],
    queryFn: async (): Promise<LinkedMemberData | null> => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, role, skills_data')
        .eq('linked_user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching linked member:', error);
        return null;
      }
      
      return data as LinkedMemberData | null;
    },
    enabled: !!user,
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
