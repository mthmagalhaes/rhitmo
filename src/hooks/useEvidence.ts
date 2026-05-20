import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useToast } from '@/hooks/use-toast';

export type EvidenceStatus = 'pending' | 'approved' | 'dismissed' | 'converted_to_feedback';
export type EvidenceCategory = 'entrega' | 'bloqueio' | 'reconhecimento' | 'conflito' | 'outro';

export interface SlackEvidence {
  id: string;
  workspace_id: string;
  manager_id: string;
  member_id: string;
  slack_channel_id: string;
  slack_message_ts: string;
  message_text: string;
  permalink: string | null;
  category: EvidenceCategory;
  relevance_score: number;
  summary: string | null;
  status: EvidenceStatus;
  feedback_id: string | null;
  captured_at: string;
  reviewed_at: string | null;
  created_at: string;
  member?: { id: string; name: string; email: string | null } | null;
}

interface UseEvidenceOptions {
  status?: EvidenceStatus | 'all';
  memberId?: string | 'all';
  category?: EvidenceCategory | 'all';
}

export function useEvidence(opts: UseEvidenceOptions = {}) {
  const { id: effectiveUserId } = useEffectiveUser();
  const { status = 'pending', memberId = 'all', category = 'all' } = opts;

  return useQuery({
    queryKey: ['slack-evidence', effectiveUserId, status, memberId, category],
    enabled: !!effectiveUserId,
    queryFn: async (): Promise<SlackEvidence[]> => {
      let q = supabase
        .from('slack_ambient_evidence')
        .select('*, member:team_members!slack_ambient_evidence_member_id_fkey(id, name, email)')
        .eq('manager_id', effectiveUserId!)
        .order('captured_at', { ascending: false })
        .limit(200);

      if (status !== 'all') q = q.eq('status', status);
      if (memberId !== 'all') q = q.eq('member_id', memberId);
      if (category !== 'all') q = q.eq('category', category);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SlackEvidence[];
    },
  });
}

export function useEvidencePendingCount() {
  const { id: effectiveUserId } = useEffectiveUser();
  return useQuery({
    queryKey: ['slack-evidence-count', effectiveUserId],
    enabled: !!effectiveUserId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('slack_ambient_evidence')
        .select('id', { count: 'exact', head: true })
        .eq('manager_id', effectiveUserId!)
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60_000,
  });
}

export function useEvidenceMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { id: effectiveUserId } = useEffectiveUser();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['slack-evidence'] });
    qc.invalidateQueries({ queryKey: ['slack-evidence-count'] });
  };

  const dismiss = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('slack_ambient_evidence')
        .update({ status: 'dismissed', reviewed_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      invalidate();
      toast({ title: ids.length === 1 ? 'Evidência dispensada' : `${ids.length} dispensadas` });
    },
    onError: (e: Error) => toast({ title: 'Erro ao dispensar', description: e.message, variant: 'destructive' }),
  });

  const convertToFeedback = useMutation({
    mutationFn: async (evidence: SlackEvidence) => {
      if (!user?.id) throw new Error('Sem usuário');
      const managerId = effectiveUserId || user.id;

      // Create feedback
      const { data: fb, error: fbErr } = await supabase
        .from('feedbacks')
        .insert({
          manager_id: managerId,
          member_id: evidence.member_id,
          content: evidence.message_text,
          summary: evidence.summary,
          type: evidence.category === 'bloqueio' || evidence.category === 'conflito' ? 'improvement' : 'positive',
          source: 'slack_ambient',
          tags: ['slack', evidence.category],
          occurred_at: evidence.captured_at,
          visibility: 'private_leader',
          evidence_id: evidence.id,
        })
        .select('id')
        .single();
      if (fbErr) throw fbErr;

      // Mark evidence as converted
      const { error: upErr } = await supabase
        .from('slack_ambient_evidence')
        .update({
          status: 'converted_to_feedback',
          feedback_id: fb.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', evidence.id);
      if (upErr) throw upErr;

      return fb;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['feedbacks'] });
      toast({ title: 'Convertido em nota', description: 'A evidência virou uma nota privada no diário.' });
    },
    onError: (e: Error) => toast({ title: 'Erro ao converter', description: e.message, variant: 'destructive' }),
  });

  const approve = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('slack_ambient_evidence')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['team-timeline'] });
      qc.invalidateQueries({ queryKey: ['context-brief'] });
      toast({
        title: ids.length === 1 ? 'Sinal aprovado' : `${ids.length} sinais aprovados`,
        description: 'Já aparecem no Brief e nas evidências do liderado.',
      });
    },
    onError: (e: Error) => toast({ title: 'Erro ao aprovar', description: e.message, variant: 'destructive' }),
  });

  return { dismiss, convertToFeedback, approve };
}
