import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';

export type UiVersion = 'v1' | 'v2';

/**
 * Flag de workspace que decide se o usuário vê a interface atual (`v1`)
 * ou o novo shell conector-first (`v2`). Default sempre `v1`: nada muda
 * para quem já usa a plataforma hoje.
 */
export const useUiVersion = () => {
  const { id: effectiveUserId } = useEffectiveUser();

  const { data, isLoading } = useQuery<UiVersion>({
    queryKey: ['ui-version', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('ui_version')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (((data as { ui_version?: string } | null)?.ui_version as UiVersion) ?? 'v1');
    },
    enabled: !!effectiveUserId,
    staleTime: 60 * 1000,
  });

  return {
    uiVersion: data ?? 'v1',
    isV2: data === 'v2',
    isLoading,
  };
};
