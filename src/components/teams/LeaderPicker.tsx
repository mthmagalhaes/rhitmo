// Sprint Setup — componente compartilhado entre NewTeamDialog e EditTeamDialog
// para definir / trocar o líder de um time. Permite escolher um usuário já
// presente no workspace (owner, HR admins, líderes existentes ou liderados
// vinculados) ou convidar um novo líder via edge function admin-invite-user.
import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, UserPlus, Check, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface LeaderCandidate {
  user_id: string;
  name: string;
  email: string | null;
  origin: 'owner' | 'hr_admin' | 'leader' | 'member' | 'invited';
  pending?: boolean;
}

interface LeaderPickerProps {
  workspaceId: string;
  value: LeaderCandidate | null;
  onChange: (leader: LeaderCandidate | null) => void;
  disabled?: boolean;
}

interface CandidateRow {
  user_id: string;
  name: string;
  email: string | null;
  origin: LeaderCandidate['origin'];
}

export function LeaderPicker({ workspaceId, value, onChange, disabled }: LeaderPickerProps) {
  const [tab, setTab] = useState<'existing' | 'invite'>('existing');
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [query, setQuery] = useState('');

  // invite form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const map = new Map<string, CandidateRow>();

        const [{ data: ws }, { data: teams }, { data: members }] = await Promise.all([
          supabase
            .from('workspaces')
            .select('owner_id, hr_admin_ids')
            .eq('id', workspaceId)
            .maybeSingle(),
          supabase
            .from('teams')
            .select('leader_user_id')
            .eq('workspace_id', workspaceId)
            .not('leader_user_id', 'is', null),
          supabase
            .from('team_members')
            .select('linked_user_id, teams!inner(workspace_id)')
            .eq('teams.workspace_id', workspaceId)
            .not('linked_user_id', 'is', null),
        ]);

        const userIds = new Set<string>();
        const origins = new Map<string, LeaderCandidate['origin']>();

        if (ws?.owner_id) {
          userIds.add(ws.owner_id);
          origins.set(ws.owner_id, 'owner');
        }
        for (const id of (ws?.hr_admin_ids ?? []) as string[]) {
          userIds.add(id);
          if (!origins.has(id)) origins.set(id, 'hr_admin');
        }
        for (const t of teams ?? []) {
          const id = (t as any).leader_user_id as string;
          if (!id) continue;
          userIds.add(id);
          if (!origins.has(id)) origins.set(id, 'leader');
        }
        for (const m of members ?? []) {
          const id = (m as any).linked_user_id as string;
          if (!id) continue;
          userIds.add(id);
          if (!origins.has(id)) origins.set(id, 'member');
        }

        if (userIds.size === 0) {
          if (!cancelled) setCandidates([]);
          return;
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', Array.from(userIds));

        for (const p of profiles ?? []) {
          const id = (p as any).id as string;
          map.set(id, {
            user_id: id,
            name: (p as any).full_name || (p as any).email || 'Sem nome',
            email: (p as any).email ?? null,
            origin: origins.get(id) ?? 'member',
          });
        }

        if (!cancelled) {
          const rows = Array.from(map.values()).sort((a, b) => {
            const order: Record<LeaderCandidate['origin'], number> = {
              owner: 0, hr_admin: 1, leader: 2, member: 3, invited: 4,
            };
            const oa = order[a.origin];
            const ob = order[b.origin];
            if (oa !== ob) return oa - ob;
            return a.name.localeCompare(b.name);
          });
          setCandidates(rows);
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q),
    );
  }, [candidates, query]);

  const handleInvite = async () => {
    const email = newEmail.trim().toLowerCase();
    const name = newName.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('E-mail inválido');
      return;
    }
    if (name.length < 2) {
      toast.error('Informe o nome do líder');
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-invite-user', {
        body: { email, name, role: 'leader', workspace_id: workspaceId },
      });
      if (error) throw error;
      // admin-invite-user provisiona o auth.user, mas a resposta atual não
      // devolve user_id. Buscamos via profiles (criado pelo trigger handle_new_user).
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('email', email)
        .limit(1)
        .maybeSingle();

      if (!profile?.id) {
        throw new Error('Convite enviado, mas não consegui localizar o usuário recém-criado. Atualize e tente vincular como líder existente.');
      }

      onChange({
        user_id: (profile as any).id,
        name: (profile as any).full_name || name,
        email: (profile as any).email || email,
        origin: 'invited',
        pending: true,
      });
      toast.success(`Convite enviado para ${email}. Já vinculei como líder do time.`);
      setNewName('');
      setNewEmail('');
      setTab('existing');
    } catch (err: any) {
      console.error('invite leader error', err);
      toast.error(err?.message ?? 'Erro ao convidar líder');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Líder do time *</Label>

      {value && (
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Check className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{value.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {value.email ?? '—'}
                {value.pending && (
                  <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-700 dark:text-amber-400">
                    Aguardando aceite
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg text-xs"
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            Trocar
          </Button>
        </div>
      )}

      {!value && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'existing' | 'invite')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="existing">
              <Search className="h-3.5 w-3.5 mr-1.5" /> Escolher existente
            </TabsTrigger>
            <TabsTrigger value="invite">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Convidar novo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="mt-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className="pl-9 h-9 rounded-xl"
                disabled={disabled}
              />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border/50 divide-y divide-border/40">
              {loadingList ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando usuários…
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Nenhum usuário encontrado. Use “Convidar novo”.
                </div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.user_id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...c })}
                    className={cn(
                      'w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.email ?? '—'}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wide">
                      {originLabel(c.origin)}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="invite" className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="leader-name" className="text-xs">Nome completo</Label>
              <Input
                id="leader-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Guto Faster"
                disabled={inviting || disabled}
                className="h-9 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leader-email" className="text-xs">E-mail corporativo</Label>
              <Input
                id="leader-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="lider@empresa.com"
                disabled={inviting || disabled}
                className="h-9 rounded-xl"
              />
            </div>
            <Button
              type="button"
              onClick={handleInvite}
              disabled={inviting || disabled}
              className="w-full rounded-xl"
            >
              {inviting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando convite…</>
              ) : (
                <><Mail className="h-4 w-4 mr-2" /> Convidar e vincular como líder</>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              O líder recebe e-mail para criar a conta. O time já fica vinculado a ele desde agora.
            </p>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function originLabel(origin: LeaderCandidate['origin']): string {
  switch (origin) {
    case 'owner': return 'Owner';
    case 'hr_admin': return 'RH';
    case 'leader': return 'Líder';
    case 'member': return 'Liderado';
    case 'invited': return 'Convidado';
  }
}
