import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface MemberPrompt {
  id: string;
  member_id: string;
  linked_user_id: string | null;
  prompt_key: string;
  prompt_text: string;
  week_starting: string;
  response: string | null;
  shared_with_leader: boolean;
  answered_at: string | null;
  created_at: string;
}

function getWeekStarting(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function useWeeklyReflection(memberId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const weekStarting = getWeekStarting();

  const query = useQuery({
    queryKey: ['weekly-reflection', memberId, weekStarting],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase
        .from('member_prompts')
        .select('*')
        .eq('member_id', memberId)
        .eq('week_starting', weekStarting)
        .maybeSingle();
      if (error) {
        console.warn('[useWeeklyReflection] error', error.message);
        return null;
      }
      return data as unknown as MemberPrompt | null;
    },
    enabled: !!memberId && !!user,
    staleTime: 60_000,
  });

  const submit = async (
    promptId: string,
    response: string,
    shareWithLeader: boolean,
  ) => {
    const { error } = await supabase
      .from('member_prompts')
      .update({
        response: response.trim() || null,
        shared_with_leader: shareWithLeader,
        answered_at: new Date().toISOString(),
      })
      .eq('id', promptId);

    if (error) {
      toast.error('Não foi possível salvar sua reflexão');
      return false;
    }
    queryClient.invalidateQueries({ queryKey: ['weekly-reflection', memberId, weekStarting] });
    toast.success('Reflexão salva');
    return true;
  };

  return { prompt: query.data, isLoading: query.isLoading, submit };
}
