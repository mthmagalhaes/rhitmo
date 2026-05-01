// Sprint 10.3 — Modal do líder para solicitar peer review.
// Cria 1 review-pai (performance_reviews, review_type='peer') + N convites em review_peers.
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Users, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PEER_REVIEW_QUESTIONS } from '@/lib/peerReviewQuestions';

interface RequestPeerReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MemberOption {
  id: string; // team_member id
  name: string;
}
interface PeerCandidate {
  user_id: string; // auth uid (linked_user_id)
  name: string;
  member_id: string;
}

export function RequestPeerReviewModal({ open, onOpenChange }: RequestPeerReviewModalProps) {
  const { workspaceId } = useAccount();
  const { id: userId } = useEffectiveUser();
  const queryClient = useQueryClient();

  const [targetMemberId, setTargetMemberId] = useState<string>('');
  const [selectedPeers, setSelectedPeers] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Liderados diretos do líder atual (alvo da avaliação).
  const { data: targets, isLoading: loadingTargets } = useQuery({
    queryKey: ['peer-review-target-members', workspaceId, userId],
    enabled: open && !!workspaceId && !!userId,
    queryFn: async (): Promise<MemberOption[]> => {
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              eq: (c: string, v: string) => {
                order: (
                  c: string,
                  o: { ascending: boolean },
                ) => Promise<{ data: Array<{ id: string; name: string }> | null; error: unknown }>;
              };
            };
          };
        };
      };
      const { data, error } = await client
        .from('team_members')
        .select('id, name, teams!inner(leader_user_id)')
        .eq('workspace_id', workspaceId!)
        .eq('teams.leader_user_id', userId!)
        .order('name', { ascending: true });

      if (error) {
        console.error('[RequestPeerReviewModal] targets', error);
        return [];
      }
      return (data ?? []).map((r) => ({ id: r.id, name: r.name }));
    },
  });

  // Candidatos a peer: membros do mesmo workspace COM linked_user_id (validate_workspace exige).
  const { data: candidates, isLoading: loadingCandidates } = useQuery({
    queryKey: ['peer-review-candidates', workspaceId, targetMemberId, userId],
    enabled: open && !!workspaceId && !!targetMemberId,
    queryFn: async (): Promise<PeerCandidate[]> => {
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              not: (
                c: string,
                op: string,
                v: unknown,
              ) => {
                neq: (
                  c: string,
                  v: string,
                ) => {
                  order: (
                    c: string,
                    o: { ascending: boolean },
                  ) => Promise<{
                    data: Array<{ id: string; name: string; linked_user_id: string }> | null;
                    error: unknown;
                  }>;
                };
              };
            };
          };
        };
      };
      const { data, error } = await client
        .from('team_members')
        .select('id, name, linked_user_id')
        .eq('workspace_id', workspaceId!)
        .not('linked_user_id', 'is', null)
        .neq('id', targetMemberId)
        .order('name', { ascending: true });

      if (error) {
        console.error('[RequestPeerReviewModal] candidates', error);
        return [];
      }

      return (data ?? [])
        // Excluir o próprio líder (caso ele esteja vinculado como member em outro time).
        .filter((r) => r.linked_user_id !== userId)
        .map((r) => ({ user_id: r.linked_user_id, name: r.name, member_id: r.id }));
    },
  });

  const targetName = useMemo(
    () => targets?.find((t) => t.id === targetMemberId)?.name ?? '',
    [targets, targetMemberId],
  );

  const togglePeer = (uid: string) => {
    setSelectedPeers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const reset = () => {
    setTargetMemberId('');
    setSelectedPeers(new Set());
  };

  const handleSubmit = async () => {
    if (!targetMemberId || selectedPeers.size === 0 || !userId) return;
    setSubmitting(true);

    const dateLabel = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const title = `Avaliação de Pares: ${targetName} — ${dateLabel}`;

    let createdReviewId: string | null = null;

    try {
      // A) Cria review-pai
      const { data: reviewRow, error: reviewErr } = await supabase
        .from('performance_reviews')
        .insert({
          member_id: targetMemberId,
          review_type: 'peer',
          author_user_id: userId,
          title,
          content: '',
          shared_with_member: false,
          period_type: 'manual',
        })
        .select('id')
        .single();

      if (reviewErr || !reviewRow) {
        console.error('[RequestPeerReviewModal] insert review', reviewErr);
        toast.error('Não conseguimos criar a avaliação de pares', {
          description: reviewErr?.message,
        });
        return;
      }
      createdReviewId = reviewRow.id as string;

      // B) Cria N convites em review_peers
      const peerRows = Array.from(selectedPeers).map((peerUid) => ({
        review_id: createdReviewId!,
        peer_user_id: peerUid,
        status: 'pending' as const,
      }));

      const { error: peersErr } = await supabase.from('review_peers').insert(peerRows);

      if (peersErr) {
        console.error('[RequestPeerReviewModal] insert peers', peersErr);
        // Rollback manual: apaga review-pai órfã.
        await supabase.from('performance_reviews').delete().eq('id', createdReviewId);
        toast.error('Não conseguimos enviar os convites', { description: peersErr.message });
        return;
      }

      toast.success('Convites enviados', {
        description: `${peerRows.length} ${peerRows.length === 1 ? 'par receberá' : 'pares receberão'} a solicitação.`,
      });
      queryClient.invalidateQueries({ queryKey: ['pending-peer-reviews'] });
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!targetMemberId && selectedPeers.size > 0 && !submitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!submitting) {
          if (!o) reset();
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="rounded-2xl max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Users className="h-5 w-5 text-primary" />
            Solicitar avaliação de pares
          </DialogTitle>
          <DialogDescription>
            Escolha quem será avaliado e quais colegas você quer ouvir. Cada par recebe um convite
            para responder 3 perguntas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Sprint 10.5 — empty state inline para "sem liderados" (mais visível que dropdown). */}
          {!loadingTargets && (targets ?? []).length === 0 ? (
            <div className="rounded-xl bg-muted/40 p-5 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                Você ainda não tem liderados diretos
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Adicione um liderado ao seu time para começar a coletar feedback de pares.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Liderado a ser avaliado</Label>
              <Select
                value={targetMemberId}
                onValueChange={(v) => {
                  setTargetMemberId(v);
                  setSelectedPeers(new Set());
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue
                    placeholder={loadingTargets ? 'Carregando...' : 'Escolha um liderado'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(targets ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {targetMemberId && (
            <div className="space-y-2">
              <Label>
                Pares avaliadores
                {selectedPeers.size > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({selectedPeers.size} selecionado{selectedPeers.size > 1 ? 's' : ''})
                  </span>
                )}
              </Label>
              {loadingCandidates ? (
                <div className="rounded-xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                  Carregando colegas...
                </div>
              ) : (candidates ?? []).length === 0 ? (
                <div className="rounded-xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                  Não há colegas vinculados disponíveis neste workspace.
                </div>
              ) : (
                <ScrollArea className="h-48 rounded-xl border border-border/60 bg-muted/20 p-2">
                  <div className="space-y-1.5">
                    {(candidates ?? []).map((c) => {
                      const checked = selectedPeers.has(c.user_id);
                      return (
                        <button
                          key={c.user_id}
                          type="button"
                          onClick={() => togglePeer(c.user_id)}
                          className={cn(
                            'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                            checked
                              ? 'bg-primary/10 text-foreground'
                              : 'bg-background hover:bg-muted',
                          )}
                        >
                          <span className="truncate">{c.name}</span>
                          {checked && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
              Perguntas que cada par receberá
            </p>
            <ul className="space-y-1.5">
              {PEER_REVIEW_QUESTIONS.map((q, idx) => (
                <li key={q.id} className="text-sm text-foreground">
                  <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>
                  {q.question}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              `Enviar ${selectedPeers.size > 0 ? `${selectedPeers.size} ` : ''}convite${selectedPeers.size === 1 ? '' : 's'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
