import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

const SLACK_CLIENT_ID = '590136271282.10821512589809';

export const useSlackConnection = () => {
  const { id: effectiveUserId } = useEffectiveUser();

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

  return {
    isConnected: !!slackIntegration,
    slackUserId: slackIntegration?.slack_user_id ?? null,
    isLoading,
    connectSlack,
  };
};
