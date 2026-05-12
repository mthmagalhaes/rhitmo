import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { toast } from '@/hooks/use-toast';

const SLACK_CLIENT_ID = import.meta.env.VITE_SLACK_CLIENT_ID ?? '590136271282.10821512589809';

export const useSlackConnection = () => {
  const { id: effectiveUserId } = useEffectiveUser();
  const qc = useQueryClient();

  const { data: slackIntegration, isLoading } = useQuery({
    queryKey: ['slack-connection', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      const { data } = await supabase
        .from('slack_integrations')
        .select('*')
        .eq('user_id', effectiveUserId)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!effectiveUserId,
    staleTime: 60 * 1000,
  });

  const connectSlack = () => {
    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-oauth-callback`;
    const url = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=commands,chat:write&user_scope=&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = url;
  };

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveUserId) throw new Error('No user');
      const { error } = await supabase
        .from('slack_integrations')
        .delete()
        .eq('user_id', effectiveUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slack-connection', effectiveUserId] });
      toast({ title: 'Slack desconectado', description: 'Sua conta foi desvinculada.' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao desconectar', description: err?.message ?? 'Tente novamente.', variant: 'destructive' });
    },
  });

  return {
    isConnected: !!slackIntegration,
    slackUserId: slackIntegration?.slack_user_id ?? null,
    isLoading,
    connectSlack,
    disconnectSlack: () => disconnectMutation.mutate(),
    isDisconnecting: disconnectMutation.isPending,
  };
};
