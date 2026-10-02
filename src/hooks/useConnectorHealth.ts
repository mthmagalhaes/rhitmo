import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Quantas conexões de note taker precisam de atenção (erro na última sincronização). */
export function useConnectorHealth(enabled = true) {
  const { data = 0 } = useQuery({
    queryKey: ['connector-health'],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('leader_note_taker_connections')
        .select('id', { count: 'exact', head: true })
        .not('last_error', 'is', null);
      if (error) return 0;
      return count ?? 0;
    },
  });
  return { needsAttention: data };
}
