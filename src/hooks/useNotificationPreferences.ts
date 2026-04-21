import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';

export type NotificationType =
  | 'weekly_summary'
  | 'pdi_milestone'
  | 'self_reflection'
  | 'hr_alerts'
  | 'member_request_1on1'
  | 'ai_pattern';

export type NotificationChannel = 'off' | 'in_app' | 'email' | 'slack';

interface PrefRow {
  notification_type: NotificationType;
  channel: NotificationChannel;
}

const DEFAULT_CHANNELS: Record<NotificationType, NotificationChannel> = {
  weekly_summary: 'email',
  pdi_milestone: 'in_app',
  self_reflection: 'in_app',
  hr_alerts: 'email',
  member_request_1on1: 'in_app',
  ai_pattern: 'in_app',
};

export function useNotificationPreferences() {
  const { id: userId } = useEffectiveUser();
  const queryClient = useQueryClient();

  const { data: prefs = [], isLoading } = useQuery({
    queryKey: ['notification-prefs', userId],
    enabled: !!userId,
    queryFn: async (): Promise<PrefRow[]> => {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('notification_type, channel')
        .eq('user_id', userId!);
      if (error) throw error;
      return (data || []) as PrefRow[];
    },
  });

  const get = (type: NotificationType): NotificationChannel => {
    const row = prefs.find((p) => p.notification_type === type);
    return (row?.channel as NotificationChannel) ?? DEFAULT_CHANNELS[type];
  };

  const setMutation = useMutation({
    mutationFn: async ({ type, channel }: { type: NotificationType; channel: NotificationChannel }) => {
      if (!userId) throw new Error('No user');
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert(
          { user_id: userId, notification_type: type, channel },
          { onConflict: 'user_id,notification_type' },
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-prefs', userId] }),
  });

  return {
    prefs,
    isLoading,
    get,
    set: (type: NotificationType, channel: NotificationChannel) =>
      setMutation.mutateAsync({ type, channel }),
    isSaving: setMutation.isPending,
  };
}
