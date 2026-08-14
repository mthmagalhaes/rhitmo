import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type NoteTakerProvider = 'granola';

export interface NoteTakerConnection {
  id: string;
  provider: string;
  last_synced_at: string | null;
  last_error: string | null;
  notes_imported: number;
  created_at: string;
}

export interface PendingNote {
  id: string;
  external_note_id: string;
  title: string | null;
  note_created_at: string | null;
  attendees: Array<{ name: string | null; email: string | null }> | null;
}


async function invokeNoteTaker(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('note-taker-connect', { body });
  if (error) {
    let details = error.message;
    try {
      const ctx = (error as unknown as { context?: { text?: () => Promise<string> } }).context;
      const text = await ctx?.text?.();
      if (text) {
        const parsed = JSON.parse(text);
        details = typeof parsed.error === 'string' ? parsed.error : details;
      }
    } catch {
      /* mantém a mensagem original */
    }
    throw new Error(details);
  }
  return data as Record<string, unknown>;
}

/**
 * Conexão pessoal do líder com um note taker (BYOK).
 * A chave nunca é lida pelo cliente — só o status da conexão.
 */
export function useNoteTaker(provider: NoteTakerProvider = 'granola') {
  const qc = useQueryClient();
  const queryKey = ['note-taker-connection', provider];
  const pendingKey = ['note-taker-pending', provider];


  const { data: connection, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<NoteTakerConnection | null> => {
      const { data, error } = await supabase
        .from('leader_note_taker_connections')
        .select('id, provider, last_synced_at, last_error, notes_imported, created_at')
        .eq('provider', provider)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 30_000,
  });

  const connect = useMutation({
    mutationFn: (apiKey: string) =>
      invokeNoteTaker({ action: 'connect', provider, api_key: apiKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: 'Granola conectado', description: 'Vamos importar suas próximas notas automaticamente.' });
    },
    onError: (e: Error) =>
      toast({ title: 'Não foi possível conectar', description: e.message, variant: 'destructive' }),
  });

  const disconnect = useMutation({
    mutationFn: () => invokeNoteTaker({ action: 'disconnect', provider }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: 'Desconectado', description: 'As notas já importadas continuam em Anotações & Evidências.' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao desconectar', description: e.message, variant: 'destructive' }),
  });

  const sync = useMutation({
    mutationFn: () => invokeNoteTaker({ action: 'sync', provider }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: pendingKey });
      qc.invalidateQueries({ queryKey: ['feedbacks'] });
      const imported = Number(data?.imported ?? 0);
      const unmatched = Number(data?.unmatched ?? 0);
      toast({
        title: imported > 0 ? `${imported} nota(s) importada(s)` : 'Tudo em dia',
        description:
          unmatched > 0
            ? `${unmatched} nota(s) aguardando você indicar o liderado.`
            : 'Nenhuma nota nova para importar.',
      });
    },
    onError: (e: Error) =>
      toast({ title: 'Falha na sincronização', description: e.message, variant: 'destructive' }),
  });

  const { data: pending = [] } = useQuery({
    queryKey: pendingKey,
    enabled: !!connection,
    queryFn: async (): Promise<PendingNote[]> => {
      const data = await invokeNoteTaker({ action: 'list_pending', provider });
      return (data?.pending as PendingNote[]) ?? [];
    },
    staleTime: 60_000,
  });

  const assign = useMutation({
    mutationFn: (vars: { noteId: string; memberId: string }) =>
      invokeNoteTaker({ action: 'assign', provider, note_id: vars.noteId, member_id: vars.memberId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pendingKey });
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['feedbacks'] });
      toast({ title: 'Nota atribuída', description: 'Ela já aparece em Anotações & Evidências do liderado.' });
    },
    onError: (e: Error) =>
      toast({ title: 'Não foi possível atribuir', description: e.message, variant: 'destructive' }),
  });

  const dismiss = useMutation({
    mutationFn: (noteId: string) => invokeNoteTaker({ action: 'dismiss', provider, note_id: noteId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: pendingKey }),
    onError: (e: Error) =>
      toast({ title: 'Erro ao descartar', description: e.message, variant: 'destructive' }),
  });

  const authError = /chave|api key|401|403/i.test(connection?.last_error ?? '');

  return {
    connection: connection ?? null,
    isConnected: !!connection,
    isLoading,
    needsReconnect: !!connection && authError,
    pending,
    connect,
    disconnect,
    sync,
    assign,
    dismiss,
  };
}

