// Sprint 13.x — /lider/pulse/:id — detalhe com 3 abas (Launch / Participants / Settings).
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronLeft,
  Loader2,
  Rocket,
  Settings,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useAccount } from '@/contexts/AccountContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PulseWizard } from '@/components/pulse/PulseWizard';
import { usePulse, usePulseChildren } from '@/hooks/usePulses';
import { MemberAvatar } from '@/components/MemberAvatar';

export default function LiderPulseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { workspaceId } = useAccount();
  const { id: userId } = useEffectiveUser();
  const { data: pulse, isLoading } = usePulse(id);
  const { data: children = [] } = usePulseChildren(id);

  const [activeTab, setActiveTab] = useState<'launch' | 'participants' | 'settings'>('launch');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState<'launch' | 'test' | null>(null);

  const audience = useMemo(() => {
    const meta = (pulse?.context_metadata ?? {}) as {
      audience?: 'everyone' | 'specific' | 'groups';
      target_member_ids?: string[];
    };
    return {
      kind: meta.audience ?? 'everyone',
      ids: meta.target_member_ids ?? [],
    };
  }, [pulse]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!pulse) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-muted-foreground mb-4">Pulse não encontrado.</p>
        <Button onClick={() => navigate('/lider/pulse')}>Voltar</Button>
      </div>
    );
  }

  const isDraft = pulse.status === 'draft';

  const handleLaunch = async () => {
    if (!workspaceId || !userId) return;
    setBusy('launch');
    try {
      // Resolve target members
      let targets: string[] = audience.ids;
      if (audience.kind === 'everyone' || targets.length === 0) {
        const client = supabase as unknown as {
          from: (t: string) => {
            select: (s: string) => {
              eq: (col: string, v: string) => {
                eq: (col: string, v: string) => Promise<{
                  data: Array<{ id: string }> | null;
                  error: unknown;
                }>;
              };
            };
          };
        };
        const { data } = await client
          .from('team_members')
          .select('id, teams!inner(workspace_id, leader_user_id)')
          .eq('teams.workspace_id', workspaceId)
          .eq('teams.leader_user_id', userId);
        targets = (data ?? []).map((m) => m.id);
      }

      if (targets.length === 0) {
        toast.error('Sem participantes', { description: 'Adicione participantes antes de lançar.' });
        return;
      }

      // Create child rows (one per participant)
      const rows = targets.map((memberId) => ({
        workspace_id: workspaceId,
        member_id: memberId,
        requested_by: userId,
        type: pulse.type,
        status: 'pending' as const,
        questions: pulse.questions as never,
        name: pulse.name,
        motivation: pulse.motivation,
        anonymity: pulse.anonymity,
        parent_pulse_id: pulse.id,
      }));

      const { error: insErr } = await supabase.from('pulse_surveys').insert(rows as never);
      if (insErr) {
        toast.error('Falha ao lançar', { description: insErr.message });
        return;
      }

      // Mark parent as active
      const { error: updErr } = await supabase
        .from('pulse_surveys')
        .update({ status: 'active', launched_at: new Date().toISOString() })
        .eq('id', pulse.id);
      if (updErr) {
        toast.error('Lançado mas não consegui atualizar o status', { description: updErr.message });
        return;
      }

      toast.success('Pulse lançado!', {
        description: `${rows.length} ${rows.length === 1 ? 'participante receberá' : 'participantes receberão'} via Slack em breve.`,
      });
      queryClient.invalidateQueries({ queryKey: ['leader-pulse', pulse.id] });
      queryClient.invalidateQueries({ queryKey: ['pulse-children', pulse.id] });
      queryClient.invalidateQueries({ queryKey: ['leader-pulses'] });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('pulse_surveys').delete().eq('id', pulse.id);
    if (error) {
      toast.error('Não foi possível excluir', { description: error.message });
      return;
    }
    toast.success('Pulse excluído');
    navigate('/lider/pulse');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/lider/pulse"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Todos os Pulses
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h1 className="font-serif text-lg tracking-tight">{pulse.name}</h1>
        </div>
        <div className="w-32" />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="mx-auto flex w-fit rounded-xl bg-muted/50 mb-6">
          <TabsTrigger value="launch" className="gap-2 rounded-lg"><Rocket className="h-3.5 w-3.5" /> Lançar</TabsTrigger>
          <TabsTrigger value="participants" className="gap-2 rounded-lg"><Users className="h-3.5 w-3.5" /> Participantes</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 rounded-lg"><Settings className="h-3.5 w-3.5" /> Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="launch" className="space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-card to-muted/30 p-5">
            <h3 className="font-medium mb-1">Quer testar primeiro?</h3>
            <p className="text-sm text-muted-foreground mb-3">Envie pra você mesmo no Slack pra preview da experiência.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl" disabled>Testar Pulse</Button>
              <Button variant="ghost" className="rounded-xl text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-10 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-serif mb-2">
              {isDraft ? 'Lance seu Pulse' : 'Pulse em andamento'}
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
              {isDraft
                ? 'Lance agora pra começar a coletar respostas via Slack.'
                : `${children.length} participantes notificados. ${children.filter((c) => c.status === 'completed').length} já responderam.`}
            </p>
            {isDraft && (
              <Button
                onClick={handleLaunch}
                disabled={busy === 'launch'}
                className="rounded-xl gap-2 px-6"
                size="lg"
              >
                {busy === 'launch' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Lançar Pulse
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="participants">
          <ParticipantsTab parentId={pulse.id} children={children} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Nome</p>
              <p className="font-medium">{pulse.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Motivação</p>
              <p className="text-sm">{pulse.motivation}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Tópicos</p>
              <ul className="space-y-1.5">
                {(Array.isArray(pulse.questions) ? (pulse.questions as Array<{ text: string }>) : []).map((q, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>
                    {q.text}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Anonimato</p>
              <Badge variant="secondary">{pulse.anonymity === 'anonymous' ? 'Anônimo' : 'Identificado'}</Badge>
            </div>
            {isDraft && (
              <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(true)}>
                Editar configurações
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <PulseWizard
        open={editOpen}
        onOpenChange={setEditOpen}
        editPulseId={pulse.id}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pulse?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga o pulse e todas as respostas vinculadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ParticipantsTab({
  parentId,
  children,
}: {
  parentId: string;
  children: Array<{ id: string; member_id: string; status: string; completed_at: string | null }>;
}) {
  const memberIds = useMemo(() => children.map((c) => c.member_id), [children]);

  const { data: memberMap = {} } = useQuery({
    queryKey: ['pulse-participants-members', parentId, memberIds.join(',')],
    enabled: memberIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('team_members')
        .select('id, name, role')
        .in('id', memberIds);
      const map: Record<string, { name: string; role: string | null }> = {};
      (data ?? []).forEach((m) => {
        map[m.id] = { name: m.name, role: m.role };
      });
      return map;
    },
  });

  if (children.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">
          Os participantes aparecem aqui após o lançamento do Pulse.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-4 py-2.5">Liderado</th>
            <th className="text-left font-medium px-4 py-2.5">Status</th>
            <th className="text-right font-medium px-4 py-2.5">Respondido em</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {children.map((c) => {
            const m = memberMap[c.member_id];
            return (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <MemberAvatar memberId={c.member_id} memberName={m?.name ?? '—'} size="sm" />
                    <div>
                      <p className="font-medium">{m?.name ?? '—'}</p>
                      {m?.role && <p className="text-xs text-muted-foreground">{m.role}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.status === 'completed' ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 rounded-full">Respondido</Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-full">Pendente</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {c.completed_at ? new Date(c.completed_at).toLocaleDateString('pt-BR') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
