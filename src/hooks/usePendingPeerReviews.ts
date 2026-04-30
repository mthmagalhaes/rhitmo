// Sprint 10.3 — Lista convites de peer review pendentes para o usuário atual.
// RLS já filtra por peer_user_id = auth.uid().
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PendingPeerReview {
  id: string;
  review_id: string;
  invited_at: string;
  reviewed_member_name: string;
  review_title: string;
}

export function usePendingPeerReviews() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['pending-peer-reviews', userId],
    enabled: !!userId,
    queryFn: async (): Promise<PendingPeerReview[]> => {
      // Cast para evitar inferência profunda do supabase-js no join aninhado.
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              c: string,
              v: string,
            ) => {
              eq: (
                c: string,
                v: string,
              ) => {
                order: (
                  c: string,
                  o: { ascending: boolean },
                ) => Promise<{
                  data:
                    | Array<{
                        id: string;
                        review_id: string;
                        invited_at: string;
                        performance_reviews: {
                          title: string | null;
                          team_members: { name: string | null } | null;
                        } | null;
                      }>
                    | null;
                  error: unknown;
                }>;
              };
            };
          };
        };
      };

      const { data, error } = await client
        .from('review_peers')
        .select(
          'id, review_id, invited_at, performance_reviews:review_id(title, team_members:member_id(name))',
        )
        .eq('peer_user_id', userId!)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (error) {
        console.error('[usePendingPeerReviews]', error);
        return [];
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        review_id: row.review_id,
        invited_at: row.invited_at,
        reviewed_member_name:
          row.performance_reviews?.team_members?.name ?? 'Colega',
        review_title: row.performance_reviews?.title ?? 'Avaliação de pares',
      }));
    },
    staleTime: 30_000,
  });
}
