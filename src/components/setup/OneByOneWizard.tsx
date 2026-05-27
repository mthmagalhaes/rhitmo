// Wizard de cadastro 1-a-1 de uma unidade da empresa: Time → Líder → Liderados.
// Reusa o edge function `bulk-onboard` (modo silencioso) — o mesmo já cuida de
// criar usuários sem email, criar/atualizar times com leader_user_id e vincular
// liderados, evitando o trigger `liderado-precisa-leader`.
// Convites são disparados depois manualmente em "Disparar convites" no card
// do workspace em /admin (mesma UX do bulk).
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, ArrowRight, Check, Plus, Trash2, Users, UserCog, UserPlus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LeaderPicker, type LeaderCandidate } from '@/components/teams/LeaderPicker';
import { safeFunctionInvoke } from '@/lib/supabaseSafe';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
}

interface MemberDraft {
  id: string; // local id
  mode: 'existing' | 'invite';
  user_id?: string;
  email: string;
  name: string;
}

type Step = 1 | 2 | 3 | 'submitting' | 'done';

interface TeamRow { id: string; name: string }

interface CandidateRow { user_id: string; name: string; email: string | null }

export function OneByOneWizard({ open, onOpenChange, workspaceId, workspaceName }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(1);

  // Step 1 — time
  const [teamMode, setTeamMode] = useState<'existing' | 'new'>('new');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');

  // Step 2 — líder
  const [leader, setLeader] = useState<LeaderCandidate | null>(null);

  // Step 3 — liderados
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [submitResult, setSubmitResult] = useState<{ ok: number; errors: number; messages: string[] } | null>(null);

  const reset = () => {
    setStep(1);
    setTeamMode('new');
    setSelectedTeamId(null);
    setNewTeamName('');
    setLeader(null);
    setMembers([]);
    setSubmitResult(null);
  };

  useEffect(() => { if (open) reset(); }, [open]);

  const { data: teams = [] } = useQuery<TeamRow[]>({
    queryKey: ['setup-teams', workspaceId],
    queryFn: async () => {
      const { data } = await supabase.from('teams').select('id, name').eq('workspace_id', workspaceId).order('name');
      return (data ?? []) as TeamRow[];
    },
    enabled: open && !!workspaceId,
  });

  const selectedTeamName = useMemo(() => {
    if (teamMode === 'new') return newTeamName.trim();
    return teams.find(t => t.id === selectedTeamId)?.name ?? '';
  }, [teamMode, newTeamName, selectedTeamId, teams]);

  const canAdvanceStep1 = teamMode === 'new' ? newTeamName.trim().length >= 2 : !!selectedTeamId;
  const canAdvanceStep2 = !!leader;

  const handleSubmit = async () => {
    if (!leader || !selectedTeamName) return;
    setStep('submitting');

    // Build bulk-onboard payload: 1 leader row + N member rows.
    const rows: Array<{ email: string; name: string; role: 'leader' | 'member'; workspace: string; team: string; leader_email?: string }> = [];
    if (leader.email) {
      rows.push({
        email: leader.email,
        name: leader.name,
        role: 'leader',
        workspace: workspaceName,
        team: selectedTeamName,
      });
    }
    members.forEach(m => {
      if (!m.email) return;
      rows.push({
        email: m.email,
        name: m.name || m.email.split('@')[0],
        role: 'member',
        workspace: workspaceName,
        team: selectedTeamName,
        leader_email: leader.email ?? undefined,
      });
    });

    try {
      const data = await safeFunctionInvoke<{ results: Array<{ email: string; status: string; message: string }>; summary: { ok: number; errors: number; skipped: number } }>(
        'bulk-onboard',
        { users: rows },
      );

      const okCount = (data.results || []).filter(r => r.status === 'ok' || r.status === 'skipped').length;
      const errorCount = (data.results || []).filter(r => r.status === 'error').length;
      const errorMessages = (data.results || []).filter(r => r.status === 'error').map(r => `${r.email}: ${r.message}`);

      setSubmitResult({ ok: okCount, errors: errorCount, messages: errorMessages });
      setStep('done');
      qc.invalidateQueries({ queryKey: ['setup-teams', workspaceId] });
      qc.invalidateQueries({ queryKey: ['setup-stats', workspaceId] });
      qc.invalidateQueries({ queryKey: ['admin-structure-teams'] });
      qc.invalidateQueries({ queryKey: ['admin-structure-members'] });
      qc.invalidateQueries({ queryKey: ['leader-members'] });
      if (errorCount === 0) {
        toast.success(`Time "${selectedTeamName}" cadastrado!`);
      } else {
        toast.warning(`${okCount} ok, ${errorCount} com erro`);
      }
    } catch (err: any) {
      setStep(3);
      toast.error(err?.message || 'Falha ao salvar — tente novamente');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Cadastro 1 a 1 — {workspaceName}
          </DialogTitle>
          <DialogDescription>
            Time → Líder → Liderados. Os convites são salvos em modo silencioso; você dispara os e-mails depois em "Disparar convites".
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        {step !== 'submitting' && step !== 'done' && (
          <div className="flex items-center gap-2 px-1 py-2 text-xs">
            {[
              { n: 1 as Step, label: 'Time', Icon: Users },
              { n: 2 as Step, label: 'Líder', Icon: UserCog },
              { n: 3 as Step, label: 'Liderados', Icon: UserPlus },
            ].map(({ n, label, Icon }, i) => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-lg',
                  step === n ? 'bg-primary/10 text-primary font-semibold' :
                  (typeof step === 'number' && step > n) ? 'text-foreground' : 'text-muted-foreground',
                )}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </div>
                {i < 2 && <div className="flex-1 h-px bg-border" />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Time */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button type="button" variant={teamMode === 'new' ? 'default' : 'outline'} size="sm" onClick={() => setTeamMode('new')} className="rounded-xl">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo time
              </Button>
              <Button type="button" variant={teamMode === 'existing' ? 'default' : 'outline'} size="sm" onClick={() => setTeamMode('existing')} className="rounded-xl" disabled={teams.length === 0}>
                Usar existente ({teams.length})
              </Button>
            </div>

            {teamMode === 'new' ? (
              <div className="space-y-1.5">
                <Label htmlFor="team-name" className="text-xs">Nome do time</Label>
                <Input id="team-name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Ex: Produto, Engenharia, Comercial" className="h-9 rounded-xl" autoFocus />
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-xl border divide-y">
                {teams.map(t => (
                  <button key={t.id} type="button" onClick={() => setSelectedTeamId(t.id)} className={cn('w-full text-left px-3 py-2 text-sm hover:bg-muted/40 flex items-center justify-between', selectedTeamId === t.id && 'bg-primary/5')}>
                    <span>{t.name}</span>
                    {selectedTeamId === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Líder */}
        {step === 2 && (
          <div className="py-2">
            <div className="mb-3 text-xs text-muted-foreground">
              Time: <span className="font-medium text-foreground">{selectedTeamName}</span>
            </div>
            <LeaderPicker workspaceId={workspaceId} value={leader} onChange={setLeader} />
          </div>
        )}

        {/* Step 3: Liderados */}
        {step === 3 && (
          <div className="space-y-3 py-2">
            <div className="text-xs text-muted-foreground">
              Time: <span className="font-medium text-foreground">{selectedTeamName}</span> · Líder: <span className="font-medium text-foreground">{leader?.name}</span>
            </div>

            <div className="space-y-2">
              {members.map((m, idx) => (
                <div key={m.id} className="rounded-xl border p-2.5 flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input value={m.name} onChange={(e) => setMembers(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} placeholder="Nome completo" className="h-8 rounded-lg text-sm" />
                    <Input value={m.email} onChange={(e) => setMembers(prev => prev.map((x, i) => i === idx ? { ...x, email: e.target.value.toLowerCase().trim() } : x))} placeholder="email@empresa.com" type="email" className="h-8 rounded-lg text-sm" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setMembers(prev => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" className="w-full rounded-xl border-dashed" onClick={() => setMembers(prev => [...prev, { id: crypto.randomUUID(), mode: 'invite', email: '', name: '' }])}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar liderado
              </Button>
            </div>

            {members.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Você pode cadastrar o time só com o líder e adicionar liderados depois.
              </p>
            )}
          </div>
        )}

        {/* Submitting */}
        {step === 'submitting' && (
          <div className="py-10 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Salvando time, líder e liderados…</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && submitResult && (
          <div className="space-y-3 py-2">
            <div className={cn('rounded-xl p-3 text-sm', submitResult.errors === 0 ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-amber-500/10')}>
              <div className="font-semibold">
                {submitResult.errors === 0 ? `Time "${selectedTeamName}" pronto.` : `${submitResult.ok} ok, ${submitResult.errors} com erro`}
              </div>
              <div className="text-xs mt-1 opacity-80">
                Para disparar os e-mails de convite, vá em <Badge variant="outline" className="text-[10px]">Admin → Workspaces</Badge> e clique em "Disparar convites" no card do workspace.
              </div>
            </div>
            {submitResult.messages.length > 0 && (
              <div className="rounded-xl border p-2 max-h-32 overflow-y-auto text-xs space-y-1">
                {submitResult.messages.map((m, i) => <div key={i} className="text-destructive">{m}</div>)}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose} className="rounded-xl">Cancelar</Button>
              <Button onClick={() => setStep(2)} disabled={!canAdvanceStep1} className="rounded-xl">
                Próximo <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Voltar
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canAdvanceStep2} className="rounded-xl">
                Próximo <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Voltar
              </Button>
              <Button onClick={handleSubmit} className="rounded-xl">
                <Check className="h-3.5 w-3.5 mr-1.5" /> Confirmar cadastro
              </Button>
            </>
          )}
          {step === 'done' && (
            <>
              <Button variant="outline" onClick={() => { reset(); }} className="rounded-xl">Cadastrar outro time</Button>
              <Button onClick={handleClose} className="rounded-xl">Concluir</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
