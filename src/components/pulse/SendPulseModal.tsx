// Sprint 9.2 — Modal do líder para disparar um Pulse Survey.
// RLS de INSERT em pulse_surveys garante que apenas líderes do membro consigam criar.
// Sprint 10.5 — guard !submitting + reset on open para UX limpa.
// Sprint 10.6 — empty state inline (em vez de escondido dentro do Select).
import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles, Users } from 'lucide-react';
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
import {
  PULSE_TEMPLATES,
  PULSE_TYPE_ORDER,
  type PulseType,
} from '@/lib/pulseTemplates';

interface SendPulseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MemberOption {
  id: string;
  name: string;
}

export function SendPulseModal({ open, onOpenChange }: SendPulseModalProps) {
  const { workspaceId } = useAccount();
  const { id: userId } = useEffectiveUser();
  const queryClient = useQueryClient();

  const [memberId, setMemberId] = useState<string>('');
  const [pulseType, setPulseType] = useState<PulseType>('blockers');
  const [submitting, setSubmitting] = useState(false);

  // Sprint 10.5 — reset state every time the modal opens (evita seleção residual).
  useEffect(() => {
    if (open) {
      setMemberId('');
      setPulseType('blockers');
      setSubmitting(false);
    }
  }, [open]);

  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['send-pulse-members', workspaceId, userId],
    enabled: open && !!workspaceId && !!userId,
    queryFn: async (): Promise<MemberOption[]> => {
      // Busca liderados diretos do líder atual (via teams.leader_user_id).
      // Cast para evitar inferência profunda do supabase-js no join.
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, v: string) => {
              eq: (col: string, v: string) => {
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
        console.error('[SendPulseModal] members query', error);
        return [];
      }
      return (data ?? []).map((r) => ({ id: r.id, name: r.name }));
    },
  });

  const template = useMemo(() => PULSE_TEMPLATES[pulseType], [pulseType]);

  const handleSubmit = async () => {
    if (!memberId || !workspaceId || !userId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('pulse_surveys').insert({
        workspace_id: workspaceId,
        member_id: memberId,
        requested_by: userId,
        type: pulseType,
        // jsonb: o cliente serializa o objeto para JSON.
        questions: template.questions as unknown as never,
        status: 'pending',
      });

      if (error) {
        console.error('[SendPulseModal] insert', error);
        toast.error('Não conseguimos enviar o Pulse', { description: error.message });
        return;
      }

      toast.success('Pulse enviado', {
        description: `${template.label} aguardando resposta do liderado.`,
      });
      queryClient.invalidateQueries({ queryKey: ['pending-pulse-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['team-timeline'] });

      // Reset
      setMemberId('');
      setPulseType('blockers');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!memberId && !!pulseType && !submitting;

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Sparkles className="h-5 w-5 text-primary" />
            Enviar Pulse
          </DialogTitle>
          <DialogDescription>
            Faça uma pergunta rápida e estruturada ao seu liderado. A resposta aparece no seu feed
            de Contexto automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Liderado</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue
                  placeholder={loadingMembers ? 'Carregando...' : 'Escolha um liderado'}
                />
              </SelectTrigger>
              <SelectContent>
                {(members ?? []).length === 0 && !loadingMembers ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Você ainda não tem liderados diretos.
                  </div>
                ) : (
                  (members ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Pulse</Label>
            <Select value={pulseType} onValueChange={(v) => setPulseType(v as PulseType)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PULSE_TYPE_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PULSE_TEMPLATES[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{template.description}</p>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
              Perguntas que serão enviadas
            </p>
            <ul className="space-y-1.5">
              {template.questions.map((q, idx) => (
                <li key={q.id} className="text-sm text-foreground">
                  <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>
                  {q.text}
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
              'Enviar Pulse'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
