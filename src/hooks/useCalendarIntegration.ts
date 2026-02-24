import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UpcomingMeeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  meet_link: string | null;
  member_id: string;
  member_name: string;
  member_role: string;
}

export const useCalendarIntegration = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: connectionData, isLoading: checkingConnection } = useQuery({
    queryKey: ['calendar-connected', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as unknown as { from: (table: string) => { select: (cols: string) => { maybeSingle: () => Promise<{ data: { id: string; calendar_email: string } | null }> } } })
        .from('google_calendar_tokens')
        .select('id, calendar_email')
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const isConnected = !!connectionData;

  const { data: upcomingMeetings = [], isLoading: loadingMeetings, refetch: refetchMeetings } = useQuery({
    queryKey: ['upcoming-meetings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-calendar-events');
      if (error) throw error;
      return (data?.meetings || []) as UpcomingMeeting[];
    },
    enabled: !!user && isConnected,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const connectCalendar = async () => {
    const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
      body: { action: 'authorize' },
    });
    if (error || !data?.authUrl) {
      toast({
        title: 'Erro ao conectar',
        description: 'Não foi possível iniciar a conexão com o Google Calendar.',
        variant: 'destructive',
      });
      return;
    }
    window.location.href = data.authUrl;
  };

  const disconnectCalendar = async () => {
    const { error } = await supabase.functions.invoke('google-calendar-oauth', {
      body: { action: 'disconnect' },
    });
    if (error) {
      toast({
        title: 'Erro ao desconectar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['calendar-connected'] });
    queryClient.invalidateQueries({ queryKey: ['upcoming-meetings'] });
    toast({ title: 'Google Calendar desconectado' });
  };

  return {
    isConnected,
    checkingConnection,
    connectionData,
    upcomingMeetings,
    loadingMeetings,
    refetchMeetings,
    connectCalendar,
    disconnectCalendar,
  };
};
