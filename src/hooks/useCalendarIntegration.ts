import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
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

interface RecallBot {
  id: string;
  meeting_id: string | null;
  status: string;
  scheduled_at: string | null;
}

export const useCalendarIntegration = () => {
  const { id: effectiveUserId } = useEffectiveUser();
  const user = effectiveUserId ? { id: effectiveUserId } : null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: connectionData, isLoading: checkingConnection } = useQuery({
    queryKey: ['calendar-connected', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as unknown as { from: (table: string) => { select: (cols: string) => { maybeSingle: () => Promise<{ data: { id: string; calendar_email: string; auto_transcribe: boolean } | null }> } } })
        .from('google_calendar_tokens')
        .select('id, calendar_email, auto_transcribe')
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const isConnected = !!connectionData;
  const autoTranscribe = connectionData?.auto_transcribe ?? false;

  const { data: calendarData, isLoading: loadingMeetings, isFetching: isSyncing, isError: isSyncError, error: syncError, refetch: refetchMeetings } = useQuery({
    queryKey: ['calendar-upcoming-meetings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-calendar-events');
      if (error) {
        // Extract readable message from FunctionsHttpError
        let msg = 'Falha ao sincronizar calendário';
        try {
          if (typeof (error as any).context?.json === 'function') {
            const body = await (error as any).context.json();
            msg = body?.error || body?.message || msg;
          } else if (error.message) {
            msg = error.message;
          }
        } catch {}
        throw new Error(msg);
      }
      return {
        meetings: (data?.meetings || []) as UpcomingMeeting[],
        debug: data?.debug as { events_found: number; matched: number; no_attendees: number; no_match: number; team_members_loaded: number } | undefined,
      };
    },
    enabled: !!user && isConnected,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const upcomingMeetings = calendarData?.meetings ?? [];
  const syncDebug = calendarData?.debug;

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
    queryClient.invalidateQueries({ queryKey: ['calendar-upcoming-meetings'] });
    toast({ title: 'Google Calendar desconectado' });
  };

  // Toggle auto-transcribe
  const toggleAutoTranscribe = useMutation({
    mutationFn: async (enabled: boolean) => {
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny
        .from('google_calendar_tokens')
        .update({ auto_transcribe: enabled, updated_at: new Date().toISOString() })
        .eq('user_id', user!.id);
      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connected'] });
      if (enabled) {
        queryClient.invalidateQueries({ queryKey: ['calendar-upcoming-meetings'] });
      }
      toast({
        title: enabled ? 'Transcrição automática ativada' : 'Transcrição automática desativada',
        description: enabled ? 'Todas as reuniões com link serão transcritas automaticamente.' : 'Você pode ativar novamente a qualquer momento.',
      });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível alterar a configuração.', variant: 'destructive' });
    },
  });

  // Fetch recall bot statuses for upcoming meetings
  const { data: recallBots = [] } = useQuery({
    queryKey: ['recall-bots', user?.id],
    queryFn: async () => {
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from('recall_bots')
        .select('id, meeting_id, status, scheduled_at')
        .eq('user_id', user!.id)
        .neq('status', 'error');
      if (error) return [];
      return (data || []) as RecallBot[];
    },
    enabled: !!user && isConnected,
    staleTime: 30 * 1000,
  });

  const scheduleBot = useMutation({
    mutationFn: async (params: { meeting_id: string; meeting_url: string; member_id: string; start_time: string }) => {
      const { data, error } = await supabase.functions.invoke('schedule-recall-bot', {
        body: params,
      });
      if (error) throw error;
      if (data?.error?.includes('limit')) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recall-bots'] });
      toast({ title: 'Bot agendado', description: 'O Rhitmo entrará na reunião automaticamente para transcrever.' });
    },
    onError: (error: any) => {
      let msg = 'Erro ao agendar bot de transcrição.';
      try {
        const raw = error?.context ? error.context : error;
        if (typeof raw?.json === 'function') {
          raw.json().then((body: any) => {
            const detail = body?.error || body?.details || JSON.stringify(body);
            toast({ title: 'Erro', description: detail, variant: 'destructive' });
          });
          return;
        }
        if (error?.message?.includes('409')) msg = 'Bot já agendado para esta reunião.';
        else if (error?.message) msg = error.message;
      } catch {}
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  const getBotStatus = (meetingId: string): RecallBot | undefined => {
    return recallBots.find(b => b.meeting_id === meetingId);
  };

  return {
    isConnected,
    checkingConnection,
    connectionData,
    autoTranscribe,
    upcomingMeetings,
    syncDebug,
    loadingMeetings,
    isSyncing,
    isSyncError,
    syncError,
    refetchMeetings,
    connectCalendar,
    disconnectCalendar,
    toggleAutoTranscribe,
    scheduleBot,
    getBotStatus,
    recallBots,
  };
};
