import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { capture } from '@/lib/productAnalytics';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { noteTakerProvider, type NoteTakerProviderId } from '@/lib/noteTakerProviders';

export type NoteTakerProvider = NoteTakerProviderId;

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
  suggested_member_id?: string | null;
}

export interface RecentNote extends PendingNote {
  status: 'pending' | 'imported' | 'dismissed' | string;
  member_id: string | null;
  feedback_id?: string | null;
  auto_assigned?: boolean;
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
  const navigate = useNavigate();
  const providerLabel = noteTakerProvider(provider).label;
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
      capture('connector_connected', { provider });
      toast({ title: `${providerLabel} conectado`, description: 'Vamos importar suas próximas notas automaticamente.' });
    },
    onError: (e: Error) =>
      toast({ title: 'Não foi possível conectar', description: e.message, variant: 'destructive' }),
  });

  const disconnect = useMutation({
    mutationFn: () => invokeNoteTaker({ action: 'disconnect', provider }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      capture('connector_disconnected', { provider });
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
          imported > 0
            ? unmatched > 0
              ? `Abrindo Anotações & Evidências. ${unmatched} nota(s) ainda aguardam você indicar o liderado.`
              : 'Abrindo Anotações & Evidências para você ver o que entrou.'
            : unmatched > 0
              ? `${unmatched} nota(s) aguardando você indicar o liderado.`
              : 'Nenhuma nota nova para importar.',
      });
      // Valor visível na hora: leva o líder direto ao que acabou de entrar.
      if (imported > 0) navigate('/lider/diario?source=note_taker&period=30d');
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

  const recentKey = ['note-taker-recent', provider];

  // ── Atualização otimista: a tela responde no clique; o servidor confirma depois.
  type Snap = { recent?: RecentNote[]; pending?: PendingNote[] };
  const snapshot = async (): Promise<Snap> => {
    await Promise.all([
      qc.cancelQueries({ queryKey: recentKey }),
      qc.cancelQueries({ queryKey: pendingKey }),
    ]);
    return {
      recent: qc.getQueryData<RecentNote[]>(recentKey),
      pending: qc.getQueryData<PendingNote[]>(pendingKey),
    };
  };
  const patchNote = (noteId: string, patch: Partial<RecentNote>) => {
    qc.setQueryData<RecentNote[]>(recentKey, (old) =>
      old?.map((n) => (n.id === noteId ? { ...n, ...patch } : n)),
    );
    if (patch.status && patch.status !== 'pending') {
      qc.setQueryData<PendingNote[]>(pendingKey, (old) => old?.filter((n) => n.id !== noteId));
    }
  };
  const rollback = (snap?: Snap) => {
    if (!snap) return;
    qc.setQueryData(recentKey, snap.recent);
    qc.setQueryData(pendingKey, snap.pending);
  };
  // Marca como velho sem refazer a chamada ao note taker a cada clique.
  const settleQuiet = () => {
    qc.invalidateQueries({ queryKey: recentKey, refetchType: 'none' });
    qc.invalidateQueries({ queryKey: pendingKey, refetchType: 'none' });
  };

  const assign = useMutation({
    mutationFn: (vars: { noteId: string; memberId: string }) =>
      invokeNoteTaker({ action: 'assign', provider, note_id: vars.noteId, member_id: vars.memberId }),
    onMutate: async (vars) => {
      const snap = await snapshot();
      patchNote(vars.noteId, { status: 'imported', member_id: vars.memberId });
      return snap;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['feedbacks'] });
      qc.invalidateQueries({ queryKey: ['diario-feedbacks'] });
      toast({ title: 'Nota atribuída', description: 'Ela já aparece em Anotações & Evidências do liderado.' });
    },
    onError: (e: Error, _v, snap) => {
      rollback(snap);
      toast({ title: 'Não foi possível atribuir', description: e.message, variant: 'destructive' });
    },
    onSettled: settleQuiet,
  });

  const dismissMutation = useMutation({
    mutationFn: (noteId: string) => invokeNoteTaker({ action: 'dismiss', provider, note_id: noteId }),
    onError: (e: Error, noteId) => {
      patchNote(noteId, { status: 'pending' });
      qc.invalidateQueries({ queryKey: pendingKey });
      toast({ title: 'Erro ao descartar', description: e.message, variant: 'destructive' });
    },
    onSettled: settleQuiet,
  });

  // Descarte com "Desfazer": some na hora, o servidor só é chamado após 5s.
  const dismiss = {
    isPending: dismissMutation.isPending,
    mutate: (noteId: string) => {
      const prevRecent = qc.getQueryData<RecentNote[]>(recentKey);
      const prevPending = qc.getQueryData<PendingNote[]>(pendingKey);
      patchNote(noteId, { status: 'dismissed' });
      let undone = false;
      const timer = window.setTimeout(() => {
        if (!undone) dismissMutation.mutate(noteId);
      }, 5000);
      sonnerToast('Nota descartada', {
        duration: 5000,
        action: {
          label: 'Desfazer',
          onClick: () => {
            undone = true;
            window.clearTimeout(timer);
            qc.setQueryData(recentKey, prevRecent);
            qc.setQueryData(pendingKey, prevPending);
          },
        },
      });
    },
  };

  const refreshAfterFix = () => {
    qc.invalidateQueries({ queryKey: ['feedbacks'] });
    qc.invalidateQueries({ queryKey: ['diario-feedbacks'] });
  };

  const reassign = useMutation({
    mutationFn: (vars: { noteId: string; memberId: string }) =>
      invokeNoteTaker({ action: 'reassign', provider, note_id: vars.noteId, member_id: vars.memberId }),
    onMutate: async (vars) => {
      const snap = await snapshot();
      patchNote(vars.noteId, { member_id: vars.memberId, auto_assigned: false });
      return snap;
    },
    onSuccess: () => {
      refreshAfterFix();
      toast({ title: 'Nota movida', description: 'Agora ela conta como evidência do liderado certo.' });
    },
    onError: (e: Error, _v, snap) => {
      rollback(snap);
      toast({ title: 'Não foi possível mover', description: e.message, variant: 'destructive' });
    },
    onSettled: settleQuiet,
  });

  const remove = useMutation({
    mutationFn: (noteId: string) => invokeNoteTaker({ action: 'remove', provider, note_id: noteId }),
    onMutate: async (noteId) => {
      const snap = await snapshot();
      patchNote(noteId, { status: 'dismissed' });
      return snap;
    },
    onSuccess: () => {
      refreshAfterFix();
      toast({ title: 'Nota retirada da Rhitmo', description: 'Ela continua no seu note taker.' });
    },
    onError: (e: Error, _v, snap) => {
      rollback(snap);
      toast({ title: 'Não foi possível retirar', description: e.message, variant: 'destructive' });
    },
    onSettled: settleQuiet,
  });

  const useRecent = (enabled: boolean) =>
    useQuery({
      queryKey: recentKey,
      enabled: enabled && !!connection,
      queryFn: async (): Promise<RecentNote[]> => {
        const data = await invokeNoteTaker({ action: 'list_recent', provider });
        return (data?.notes as RecentNote[]) ?? [];
      },
      staleTime: 0,
      refetchOnMount: 'always',
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
    reassign,
    remove,
    useRecent,
  };
}


/**
 * Existe alguma conexão de note taker (qualquer provedor) para o líder atual?
 * Usado no checklist de primeiro acesso.
 */
export function useAnyNoteTakerConnection() {
  const { data, isLoading } = useQuery({
    queryKey: ['note-taker-connection', 'any'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leader_note_taker_connections')
        .select('provider')
        .limit(1);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const provider = (data?.[0]?.provider as NoteTakerProvider | undefined) ?? null;
  return {
    isConnected: !!provider,
    provider,
    label: provider ? noteTakerProvider(provider).label : null,
    isLoading,
  };
}
