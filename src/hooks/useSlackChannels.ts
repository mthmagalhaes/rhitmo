import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  num_members: number;
  topic: string;
  is_excluded: boolean;
}

interface ChannelsResponse {
  channels: SlackChannel[];
  settings: {
    autojoin_public_channels: boolean;
    ambient_mode_enabled: boolean;
  };
}

export function useSlackChannels() {
  return useQuery<ChannelsResponse>({
    queryKey: ['slack-channels'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('slack-list-channels', {
        body: { action: 'list' },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

export function useSlackChannelMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { id: effectiveUserId } = useEffectiveUser();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['slack-channels'] });

  // Adiciona/remove canal do excluded_channel_ids
  const toggleExclude = useMutation({
    mutationFn: async ({ channelId, exclude }: { channelId: string; exclude: boolean }) => {
      // Buscar workspace + settings atuais
      const { data: ws } = await supabase
        .from('workspaces')
        .select('id')
        .or(`owner_id.eq.${effectiveUserId},hr_admin_ids.cs.{${effectiveUserId}}`)
        .limit(1)
        .maybeSingle();
      if (!ws) throw new Error('Workspace não encontrado');

      const { data: current } = await supabase
        .from('workspace_slack_settings')
        .select('excluded_channel_ids')
        .eq('workspace_id', ws.id)
        .maybeSingle();

      const currentList = new Set<string>(current?.excluded_channel_ids ?? []);
      if (exclude) currentList.add(channelId);
      else currentList.delete(channelId);

      const { error } = await supabase
        .from('workspace_slack_settings')
        .upsert(
          {
            workspace_id: ws.id,
            excluded_channel_ids: Array.from(currentList),
          },
          { onConflict: 'workspace_id' },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidate();
      toast({
        title: vars.exclude ? 'Canal pausado' : 'Canal reativado',
        description: vars.exclude
          ? 'Rhitmo deixará de capturar evidências deste canal.'
          : 'Rhitmo voltará a capturar evidências deste canal.',
      });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao atualizar canal', description: e.message, variant: 'destructive' }),
  });

  const updateSetting = (field: 'autojoin_public_channels' | 'ambient_mode_enabled') =>
    useMutation({
      mutationFn: async (enabled: boolean) => {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id')
          .or(`owner_id.eq.${effectiveUserId},hr_admin_ids.cs.{${effectiveUserId}}`)
          .limit(1)
          .maybeSingle();
        if (!ws) throw new Error('Workspace não encontrado');

        const { error } = await supabase
          .from('workspace_slack_settings')
          .upsert(
            { workspace_id: ws.id, [field]: enabled },
            { onConflict: 'workspace_id' },
          );
        if (error) throw error;
      },
      onSuccess: () => {
        invalidate();
        toast({ title: 'Configuração atualizada' });
      },
      onError: (e: Error) =>
        toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' }),
    });

  const updateAutojoin = updateSetting('autojoin_public_channels');
  const updateAmbientEnabled = updateSetting('ambient_mode_enabled');

  // Convidar bot a um canal público
  const joinChannel = useMutation({
    mutationFn: async (channelId: string) => {
      const { data, error } = await supabase.functions.invoke('slack-list-channels', {
        body: { action: 'join', channel_id: channelId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Falha ao entrar no canal');
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Adicionado ao canal', description: 'Rhitmo agora monitora este canal.' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao adicionar ao canal', description: e.message, variant: 'destructive' }),
  });

  const leaveChannel = useMutation({
    mutationFn: async (channelId: string) => {
      const { data, error } = await supabase.functions.invoke('slack-list-channels', {
        body: { action: 'leave', channel_id: channelId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Falha ao sair do canal');
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Removido do canal' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao sair do canal', description: e.message, variant: 'destructive' }),
  });

  return { toggleExclude, updateAutojoin, joinChannel, leaveChannel };
}
