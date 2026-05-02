// Sprint 13.x — Pulse Setup Wizard (5 passos, full-screen).
// Estilo inspirado nas telas do Windmill: header simples, conteúdo centralizado
// max-w-3xl, barra de progresso fina no rodapé, navegação Previous/Next fixa.
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Lightbulb,
  Loader2,
  Plus,
  Users,
  EyeOff,
  X,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { useAccount } from '@/contexts/AccountContext';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PULSE_IDEAS, findPulseIdea } from '@/lib/pulseIdeas';

interface PulseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (pulseId: string) => void;
  /** Se passado, edita rascunho existente. */
  editPulseId?: string;
}

type Audience = 'everyone' | 'groups' | 'specific';
type Anonymity = 'named' | 'anonymous';

interface MemberOpt {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  text: string;
}

const STEPS = [
  'Pulse Motivation',
  'Discussion Guide',
  'Select Participants',
  'Pulse Anonymity',
  'Review Pulse',
];

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function PulseWizard({ open, onOpenChange, onCreated, editPulseId }: PulseWizardProps) {
  const { workspaceId } = useAccount();
  const { id: userId } = useEffectiveUser();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [motivation, setMotivation] = useState('');
  const [topics, setTopics] = useState<Topic[]>([{ id: newId(), text: '' }]);
  const [audience, setAudience] = useState<Audience>('everyone');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [anonymity, setAnonymity] = useState<Anonymity>('named');
  const [name, setName] = useState('');
  const [pulseType] = useState<'priorities'>('priorities');

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSubmitting(false);
    if (!editPulseId) {
      setMotivation('');
      setTopics([{ id: newId(), text: '' }]);
      setAudience('everyone');
      setSelectedMemberIds([]);
      setAnonymity('named');
      setName('');
    }
  }, [open, editPulseId]);

  // Load draft if editing
  useEffect(() => {
    if (!open || !editPulseId) return;
    (async () => {
      const { data } = await supabase
        .from('pulse_surveys')
        .select('name, motivation, anonymity, questions')
        .eq('id', editPulseId)
        .maybeSingle();
      if (data) {
        setName(data.name ?? '');
        setMotivation(data.motivation ?? '');
        setAnonymity(((data.anonymity as Anonymity) ?? 'named'));
        const qs = Array.isArray(data.questions)
          ? (data.questions as Array<{ id?: string; text: string }>)
          : [];
        setTopics(
          qs.length > 0
            ? qs.map((q) => ({ id: q.id ?? newId(), text: q.text }))
            : [{ id: newId(), text: '' }],
        );
      }
    })();
  }, [open, editPulseId]);

  // Members of the leader
  const { data: members = [] } = useQuery({
    queryKey: ['wizard-members', workspaceId, userId],
    enabled: open && !!workspaceId && !!userId,
    queryFn: async (): Promise<MemberOpt[]> => {
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, v: string) => {
              eq: (col: string, v: string) => {
                order: (
                  c: string,
                  o: { ascending: boolean },
                ) => Promise<{
                  data: Array<{ id: string; name: string }> | null;
                  error: unknown;
                }>;
              };
            };
          };
        };
      };
      const { data, error } = await client
        .from('team_members')
        .select('id, name, teams!inner(workspace_id, leader_user_id)')
        .eq('teams.workspace_id', workspaceId!)
        .eq('teams.leader_user_id', userId!)
        .order('name', { ascending: true });
      if (error) {
        console.error('[PulseWizard.members]', error);
        return [];
      }
      return (data ?? []).map((r) => ({ id: r.id, name: r.name }));
    },
  });

  const targetMemberIds = useMemo(() => {
    if (audience === 'everyone') return members.map((m) => m.id);
    if (audience === 'specific') return selectedMemberIds;
    return [];
  }, [audience, members, selectedMemberIds]);

  const participantsCount = targetMemberIds.length;
  const anonymityAvailable = participantsCount >= 3;

  // Apply idea preset
  const applyIdea = (key: string) => {
    const idea = findPulseIdea(key);
    if (!idea) return;
    setMotivation(idea.motivation);
    setTopics(idea.topics.map((t) => ({ id: newId(), text: t })));
    if (!name) setName(idea.label);
  };

  // Topic mgmt
  const addTopic = () => setTopics((t) => [...t, { id: newId(), text: '' }]);
  const removeTopic = (id: string) =>
    setTopics((t) => (t.length === 1 ? t : t.filter((x) => x.id !== id)));
  const updateTopic = (id: string, text: string) =>
    setTopics((t) => t.map((x) => (x.id === id ? { ...x, text } : x)));

  // DnD for topics (Step 2)
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setTopics((items) => {
      const oldIdx = items.findIndex((t) => t.id === active.id);
      const newIdx = items.findIndex((t) => t.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return items;
      return arrayMove(items, oldIdx, newIdx);
    });
  };

  // Validation
  const canNext = useMemo(() => {
    if (step === 0) return motivation.trim().length > 0;
    if (step === 1) return topics.some((t) => t.text.trim().length > 0);
    if (step === 2) {
      if (audience === 'everyone') return members.length > 0;
      if (audience === 'specific') return selectedMemberIds.length > 0;
      return false;
    }
    if (step === 3) return anonymity === 'named' || anonymityAvailable;
    if (step === 4) return name.trim().length > 0;
    return false;
  }, [step, motivation, topics, audience, members.length, selectedMemberIds.length, anonymity, anonymityAvailable, name]);

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleSubmit();
  };
  const handlePrev = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    if (!workspaceId || !userId) return;
    setSubmitting(true);
    try {
      const cleanTopics = topics.filter((t) => t.text.trim().length > 0);
      const questionsPayload = cleanTopics.map((t) => ({ id: t.id, text: t.text.trim() }));

      // Para parent draft: member_id é o próprio líder (placeholder).
      // A trigger validate_workspace foi atualizada para skipar drafts sem parent.
      // Precisamos de UM member_id válido (NOT NULL): pegamos um liderado qualquer
      // do workspace, ou o primeiro selecionado.
      const placeholderMemberId =
        targetMemberIds[0] ?? members[0]?.id ?? null;

      if (!placeholderMemberId) {
        toast.error('Você precisa ter pelo menos um liderado para criar um Pulse.');
        return;
      }

      if (editPulseId) {
        const { error } = await supabase
          .from('pulse_surveys')
          .update({
            name: name.trim(),
            motivation: motivation.trim(),
            anonymity,
            questions: questionsPayload as unknown as never,
          })
          .eq('id', editPulseId);
        if (error) {
          toast.error('Não foi possível salvar', { description: error.message });
          return;
        }
        toast.success('Pulse atualizado');
        queryClient.invalidateQueries({ queryKey: ['leader-pulses'] });
        queryClient.invalidateQueries({ queryKey: ['leader-pulse', editPulseId] });
        onOpenChange(false);
        onCreated?.(editPulseId);
        return;
      }

      const { data, error } = await supabase
        .from('pulse_surveys')
        .insert({
          workspace_id: workspaceId,
          member_id: placeholderMemberId,
          requested_by: userId,
          type: pulseType,
          status: 'draft',
          name: name.trim(),
          motivation: motivation.trim(),
          anonymity,
          questions: questionsPayload as unknown as never,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[PulseWizard.insert]', error);
        toast.error('Não foi possível criar o Pulse', { description: error.message });
        return;
      }

      // Persistimos o público escolhido em metadata pra usar na hora do Launch
      await supabase
        .from('pulse_surveys')
        .update({
          context_metadata: {
            audience,
            target_member_ids: targetMemberIds,
          } as unknown as never,
        })
        .eq('id', data.id);

      toast.success('Pulse criado como rascunho');
      queryClient.invalidateQueries({ queryKey: ['leader-pulses'] });
      onOpenChange(false);
      onCreated?.(data.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-none w-screen h-screen p-0 rounded-none border-0 flex flex-col">
        {/* Header — close (X) is provided by DialogContent itself */}
        <div className="flex items-center px-6 py-4 border-b">
          <h2 className="text-base font-semibold tracking-tight">Pulse Setup</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">
              Step {step + 1} of {STEPS.length}
            </p>
            <h3 className="text-2xl font-serif tracking-tight mb-8">{STEPS[step]}</h3>

            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <Label className="mb-2 block">O que você quer aprender com o seu time?</Label>
                  <Textarea
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Descreva a informação que você quer coletar e o contexto útil para a Rhitmo conduzir a conversa."
                    rows={6}
                    className="rounded-xl resize-none"
                  />
                </div>
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Ideias
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PULSE_IDEAS.map((idea) => (
                      <button
                        key={idea.key}
                        type="button"
                        onClick={() => applyIdea(idea.key)}
                        className="px-3 py-1.5 rounded-xl border bg-card hover:bg-accent text-sm transition"
                      >
                        {idea.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Guia de Discussão</p>
                  <p className="text-sm text-muted-foreground">
                    Estes tópicos vão guiar a conversa da Rhitmo com seu time. Ela vai trazer cada um durante o chat com o liderado.
                  </p>
                </div>
                <div className="space-y-2">
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={topics.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {topics.map((t) => (
                        <SortableTopic
                          key={t.id}
                          topic={t}
                          disabledRemove={topics.length === 1}
                          onChange={(text) => updateTopic(t.id, text)}
                          onRemove={() => removeTopic(t.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTopic}
                    className="w-full rounded-xl gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar tópico
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setAudience('everyone')}
                  className={cn(
                    'w-full text-left rounded-xl border bg-card px-4 py-4 transition',
                    audience === 'everyone' && 'ring-2 ring-primary',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border mt-0.5',
                        audience === 'everyone' && 'bg-primary border-primary',
                      )}
                    />
                    <div>
                      <p className="font-medium">Todos os meus liderados</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Envia para todos os membros que reportam pra você ({members.length})
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled
                  className="w-full text-left rounded-xl border bg-card px-4 py-4 opacity-50 cursor-not-allowed"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-4 w-4 rounded-full border mt-0.5" />
                    <div>
                      <p className="font-medium">Grupos</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Em breve. Selecione a partir de grupos salvos.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAudience('specific')}
                  className={cn(
                    'w-full text-left rounded-xl border bg-card px-4 py-4 transition',
                    audience === 'specific' && 'ring-2 ring-primary',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border mt-0.5',
                        audience === 'specific' && 'bg-primary border-primary',
                      )}
                    />
                    <div className="flex-1">
                      <p className="font-medium">Pessoas específicas</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Escolha individualmente quem deve responder.
                      </p>
                    </div>
                  </div>
                </button>

                {audience === 'specific' && (
                  <div className="ml-7 mt-2 rounded-xl border bg-muted/30 p-3 max-h-72 overflow-y-auto">
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        Você ainda não tem liderados.
                      </p>
                    ) : (
                      members.map((m) => {
                        const checked = selectedMemberIds.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-accent"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setSelectedMemberIds((prev) =>
                                  e.target.checked
                                    ? [...prev, m.id]
                                    : prev.filter((id) => id !== m.id),
                                )
                              }
                              className="h-4 w-4 rounded border-muted-foreground/30"
                            />
                            <span className="text-sm">{m.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAnonymity('named')}
                  className={cn(
                    'text-left rounded-xl border bg-card p-5 transition',
                    anonymity === 'named' && 'ring-2 ring-primary',
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Identificado (Recomendado)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cada resposta inclui o nome do autor, então você sabe quem disse o que e pode dar follow-up se precisar.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => anonymityAvailable && setAnonymity('anonymous')}
                  disabled={!anonymityAvailable}
                  className={cn(
                    'text-left rounded-xl border bg-card p-5 transition',
                    anonymity === 'anonymous' && 'ring-2 ring-primary',
                    !anonymityAvailable && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <EyeOff className="h-4 w-4" />
                    <span className="font-medium">Anônimo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {anonymityAvailable
                      ? 'Respostas totalmente desidentificadas. Para proteger o anonimato, exige no mínimo 3 participantes.'
                      : 'Volte e adicione mais participantes (mín. 3) para habilitar esta opção.'}
                  </p>
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="rounded-xl border bg-card p-5 flex gap-3">
                  <div className="h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs">i</span>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Revise os detalhes do Pulse</p>
                    <p className="text-sm text-muted-foreground">
                      Nenhuma mensagem será enviada agora. Você pode testar primeiro e depois lançar quando estiver pronto.
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="mb-1 block">Nome</Label>
                  <p className="text-xs text-muted-foreground mb-2">Usado apenas para organização interna</p>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Insights de eficiência de tarefas"
                    className="rounded-xl"
                  />
                </div>

                <div className="rounded-xl bg-muted/30 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Participantes</span><Badge variant="secondary">{participantsCount}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tópicos</span><Badge variant="secondary">{topics.filter((t) => t.text.trim()).length}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Anonimato</span><Badge variant="secondary">{anonymity === 'named' ? 'Identificado' : 'Anônimo'}</Badge></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress + footer */}
        <div className="border-t">
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={step === 0 || submitting}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canNext || submitting}
              className="gap-2 rounded-xl"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step === STEPS.length - 1 ? (
                editPulseId ? 'Salvar Pulse' : 'Criar Pulse'
              ) : (
                <>
                  Próximo <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SortableTopic({
  topic,
  disabledRemove,
  onChange,
  onRemove,
}: {
  topic: Topic;
  disabledRemove: boolean;
  onChange: (text: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: topic.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground/40 hover:text-muted-foreground shrink-0"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={topic.text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite uma pergunta ou tópico..."
        className="border-0 shadow-none focus-visible:ring-0 px-0"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="rounded-full h-7 w-7 shrink-0"
        disabled={disabledRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
