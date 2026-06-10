import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2, Search, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserMeta } from '@/hooks/useAdminCompaniesData';


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserMeta[];
}

type StepId = 1 | 2 | 3 | 4 | 5;

interface NewTeam {
  name: string;
  leaderId: string | null;
  leaderInviteEmail: string;
}

const SEGMENTS = ['beta', 'paid', 'trial', 'internal', 'test'] as const;
const PLANS = ['pulse', 'pro', 'business'] as const;

export const NewCompanyWizard = ({ open, onOpenChange, users }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<StepId>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Empresa
  const [name, setName] = useState('');
  const [segment, setSegment] = useState<typeof SEGMENTS[number]>('paid');
  const [clientAccount, setClientAccount] = useState('');
  const [plan, setPlan] = useState<typeof PLANS[number]>('pro');

  // Step 2: Owner
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerInviteEmail, setOwnerInviteEmail] = useState('');
  const [ownerInviteName, setOwnerInviteName] = useState('');

  // Step 3: HR Admins
  const [hrAdminIds, setHrAdminIds] = useState<string[]>([]);
  const [hrInviteEmail, setHrInviteEmail] = useState('');

  // Step 4: Times
  const [teams, setTeams] = useState<NewTeam[]>([
    { name: '', leaderId: null, leaderInviteEmail: '' },
  ]);

  const reset = () => {
    setStep(1);
    setName('');
    setSegment('paid');
    setClientAccount('');
    setPlan('pro');
    setOwnerId(null);
    setOwnerInviteEmail('');
    setOwnerInviteName('');
    setHrAdminIds([]);
    setHrInviteEmail('');
    setTeams([{ name: '', leaderId: null, leaderInviteEmail: '' }]);
  };

  const close = () => {
    if (submitting) return;
    reset();
    onOpenChange(false);
  };

  const canNext = useMemo(() => {
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return !!ownerId || ownerInviteEmail.trim().length > 3;
    if (step === 3) return true;
    if (step === 4) return teams.some((t) => t.name.trim().length > 0);
    return true;
  }, [step, name, ownerId, ownerInviteEmail, teams]);

  // Lightweight user search
  const [ownerSearch, setOwnerSearch] = useState('');
  const ownerMatches = useMemo(
    () =>
      users
        .filter((u) => {
          const q = ownerSearch.toLowerCase();
          return (
            !q ||
            u.email?.toLowerCase().includes(q) ||
            u.full_name?.toLowerCase().includes(q)
          );
        })
        .slice(0, 8),
    [users, ownerSearch],
  );

  // Warning quando o owner selecionado já é dono de outro(s) workspace(s).
  // Não bloqueia — só avisa, porque pode ser intencional (múltiplas empresas).
  const [ownerExistingWorkspaces, setOwnerExistingWorkspaces] = useState<
    { id: string; name: string }[]
  >([]);
  useEffect(() => {
    if (!ownerId) { setOwnerExistingWorkspaces([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('owner_id', ownerId)
        .eq('is_active', true);
      if (!cancelled) setOwnerExistingWorkspaces(data ?? []);
    })();
    return () => { cancelled = true; };
  }, [ownerId]);


  const inviteByEmail = async (email: string, fullName: string | null, role: 'owner' | 'hr_admin' | 'leader', workspace_id?: string) => {
    const { data, error } = await supabase.functions.invoke('admin-invite-user', {
      body: {
        email,
        name: fullName || email.split('@')[0],
        assigned_plan: plan,
        role,
        workspace_id,
        // Wizard cria o workspace real depois — não queremos que o convite
        // de owner/líder dispare auto-provisionamento de "Meu time" órfão.
        skip_auto_provision: true,
        redirect_to: role === 'hr_admin' ? 'https://rhitmo.co/hr' : 'https://rhitmo.co/lider/inicio',
      },
    });
    if (error) throw error;
    return data?.user?.id || data?.user_id || null;
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      // 1. Resolve owner
      let resolvedOwnerId = ownerId;
      if (!resolvedOwnerId) {
        // Invite — needs workspace first; create placeholder owner via invite, then set
        // Strategy: create user via invite first (without workspace_id, super admin allowed)
        const newId = await inviteByEmail(ownerInviteEmail.trim(), ownerInviteName.trim(), 'owner');
        if (!newId) throw new Error('Falha ao convidar owner.');
        resolvedOwnerId = newId;
      }

      // 2. Create workspace
      const { data: ws, error: wsErr } = await supabase
        .from('workspaces')
        .insert({
          name: name.trim(),
          owner_id: resolvedOwnerId!,
          plan_tier: plan,
          customer_segment: segment,
          client_account: clientAccount.trim() || null,
        })
        .select('id')
        .single();
      if (wsErr) throw wsErr;
      const workspaceId = ws.id;

      // 3. HR admins
      for (const hrId of hrAdminIds) {
        await supabase.rpc('manage_hr_admin', {
          _workspace_id: workspaceId,
          _user_id: hrId,
          _action: 'add',
        });
      }
      if (hrInviteEmail.trim()) {
        await inviteByEmail(hrInviteEmail.trim(), null, 'hr_admin', workspaceId);
      }

      // 4. Teams + leaders
      for (const t of teams) {
        const teamName = t.name.trim();
        if (!teamName) continue;
        let leaderId = t.leaderId;
        if (!leaderId && t.leaderInviteEmail.trim()) {
          leaderId = await inviteByEmail(t.leaderInviteEmail.trim(), null, 'leader', workspaceId);
        }
        const { error: teamErr } = await supabase.from('teams').insert({
          name: teamName,
          workspace_id: workspaceId,
          leader_user_id: leaderId,
        });
        if (teamErr) throw teamErr;
      }

      toast({ title: 'Empresa criada', description: name });
      queryClient.invalidateQueries({ queryKey: ['admin-companies-workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies-teams'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies-members'] });
      queryClient.invalidateQueries({ queryKey: ['admin-structure-workspaces'] });
      close();
    } catch (err: any) {
      toast({
        title: 'Erro ao criar empresa',
        description: err?.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const ownerLabel = (id: string) => {
    const u = users.find((x) => x.user_id === id);
    return u?.full_name || u?.email || id.slice(0, 8);
  };

  const progress = (step / 5) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-none w-screen h-screen p-0 rounded-none border-0 flex flex-col">
        <header className="flex items-center px-6 py-4 border-b">
          <h2 className="text-sm font-semibold tracking-tight">Nova empresa</h2>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Passo {step} de 5
            </p>

            {step === 1 && (
              <div className="space-y-6">
                <h1 className="text-2xl font-serif tracking-tight">Como se chama a empresa?</h1>
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex.: Faster"
                      className="rounded-xl mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Cliente (conta comercial)</Label>
                    <Input
                      value={clientAccount}
                      onChange={(e) => setClientAccount(e.target.value)}
                      placeholder="Opcional — nome do contrato/CNPJ"
                      className="rounded-xl mt-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Segmento</Label>
                      <Select value={segment} onValueChange={(v) => setSegment(v as any)}>
                        <SelectTrigger className="rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Plano</Label>
                      <Select value={plan} onValueChange={(v) => setPlan(v as any)}>
                        <SelectTrigger className="rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h1 className="text-2xl font-serif tracking-tight">Quem é o Owner?</h1>
                <div className="space-y-3">
                  <Label>Buscar usuário existente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={ownerSearch}
                      onChange={(e) => setOwnerSearch(e.target.value)}
                      placeholder="Nome ou e-mail"
                      className="rounded-xl pl-9"
                    />
                  </div>
                  <div className="border rounded-xl divide-y max-h-64 overflow-auto">
                    {ownerMatches.map((u) => (
                      <button
                        key={u.user_id}
                        type="button"
                        onClick={() => { setOwnerId(u.user_id); setOwnerInviteEmail(''); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/50 ${
                          ownerId === u.user_id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="font-medium">{u.full_name || u.email}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </button>
                    ))}
                    {ownerMatches.length === 0 && (
                      <div className="px-3 py-4 text-xs text-muted-foreground">Nenhum resultado</div>
                    )}
                  </div>

                  {ownerId && ownerExistingWorkspaces.length > 0 && (
                    <Alert className="rounded-xl border-amber-300 bg-amber-50 text-amber-900">
                      <AlertTriangle className="h-4 w-4 !text-amber-700" />
                      <AlertDescription className="text-xs">
                        Este usuário já é Owner de {ownerExistingWorkspaces.length} workspace
                        {ownerExistingWorkspaces.length > 1 ? 's' : ''} ativo
                        {ownerExistingWorkspaces.length > 1 ? 's' : ''}
                        {ownerExistingWorkspaces.length <= 3 && (
                          <> ({ownerExistingWorkspaces.map((w) => w.name).join(', ')})</>
                        )}
                        . Continuar criará um novo — confirme que é intencional.
                      </AlertDescription>
                    </Alert>
                  )}



                  <div className="text-xs text-muted-foreground pt-4">— ou convidar por e-mail —</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={ownerInviteName}
                      onChange={(e) => { setOwnerInviteName(e.target.value); setOwnerId(null); }}
                      placeholder="Nome completo"
                      className="rounded-xl"
                    />
                    <Input
                      value={ownerInviteEmail}
                      onChange={(e) => { setOwnerInviteEmail(e.target.value); setOwnerId(null); }}
                      placeholder="email@empresa.com"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h1 className="text-2xl font-serif tracking-tight">HR Admins (opcional)</h1>
                <p className="text-sm text-muted-foreground">
                  HR Admins enxergam a empresa inteira. Pode ser o próprio Owner — nesse caso, pule este passo.
                </p>
                <div className="space-y-3">
                  <Label>Adicionar usuário existente</Label>
                  <Select onValueChange={(v) => {
                    if (v && !hrAdminIds.includes(v)) setHrAdminIds([...hrAdminIds, v]);
                  }}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Escolher…" /></SelectTrigger>
                    <SelectContent>
                      {users
                        .filter((u) => !hrAdminIds.includes(u.user_id))
                        .slice(0, 50)
                        .map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name || u.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {hrAdminIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {hrAdminIds.map((id) => (
                        <Badge key={id} variant="secondary" className="rounded-lg gap-1">
                          {ownerLabel(id)}
                          <button
                            type="button"
                            onClick={() => setHrAdminIds(hrAdminIds.filter((x) => x !== id))}
                            className="ml-1 hover:text-destructive"
                          >×</button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-4">— ou convidar por e-mail —</div>
                  <Input
                    value={hrInviteEmail}
                    onChange={(e) => setHrInviteEmail(e.target.value)}
                    placeholder="hr@empresa.com"
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h1 className="text-2xl font-serif tracking-tight">Times e líderes</h1>
                <p className="text-sm text-muted-foreground">
                  Pelo menos um time. Você pode adicionar líderes depois.
                </p>
                <div className="space-y-3">
                  {teams.map((t, idx) => (
                    <div key={idx} className="border rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={t.name}
                          onChange={(e) => {
                            const copy = [...teams];
                            copy[idx] = { ...copy[idx], name: e.target.value };
                            setTeams(copy);
                          }}
                          placeholder="Nome do time"
                          className="rounded-xl flex-1"
                        />
                        {teams.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTeams(teams.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Select
                          value={t.leaderId || ''}
                          onValueChange={(v) => {
                            const copy = [...teams];
                            copy[idx] = { ...copy[idx], leaderId: v || null, leaderInviteEmail: '' };
                            setTeams(copy);
                          }}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Líder (existente)" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.slice(0, 50).map((u) => (
                              <SelectItem key={u.user_id} value={u.user_id}>
                                {u.full_name || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={t.leaderInviteEmail}
                          onChange={(e) => {
                            const copy = [...teams];
                            copy[idx] = { ...copy[idx], leaderInviteEmail: e.target.value, leaderId: null };
                            setTeams(copy);
                          }}
                          placeholder="ou convidar por e-mail"
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setTeams([...teams, { name: '', leaderId: null, leaderInviteEmail: '' }])}
                    className="rounded-xl gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar time
                  </Button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <h1 className="text-2xl font-serif tracking-tight">Revisão</h1>
                <div className="space-y-4 text-sm">
                  <Row label="Empresa" value={name} />
                  <Row label="Segmento · Plano" value={`${segment} · ${plan}`} />
                  {clientAccount && <Row label="Cliente" value={clientAccount} />}
                  <Row
                    label="Owner"
                    value={ownerId ? ownerLabel(ownerId) : `${ownerInviteName || '—'} <${ownerInviteEmail}> (convite)`}
                  />
                  <Row
                    label="HR Admins"
                    value={[
                      ...hrAdminIds.map(ownerLabel),
                      hrInviteEmail && `${hrInviteEmail} (convite)`,
                    ].filter(Boolean).join(', ') || '—'}
                  />
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Times</div>
                    <div className="space-y-1.5">
                      {teams.filter((t) => t.name.trim()).map((t, i) => (
                        <div key={i} className="border rounded-xl px-3 py-2 flex items-center justify-between">
                          <span className="font-medium">{t.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {t.leaderId ? ownerLabel(t.leaderId) : t.leaderInviteEmail ? `${t.leaderInviteEmail} (convite)` : 'sem líder'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="h-1 bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => (step === 1 ? close() : setStep((s) => (s - 1) as StepId))}
              disabled={submitting}
            >
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            {step < 5 ? (
              <Button
                className="rounded-xl"
                disabled={!canNext}
                onClick={() => setStep((s) => (s + 1) as StepId)}
              >
                Próximo
              </Button>
            ) : (
              <Button className="rounded-xl" onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar empresa
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 border-b pb-2">
    <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="text-right">{value}</span>
  </div>
);
