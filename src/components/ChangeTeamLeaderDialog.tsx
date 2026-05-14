// Sprint 19 — Trocar líder de um time. Lista líderes elegíveis: workspace owner
// + qualquer usuário que já lidera algum time do workspace + liderados que
// aceitaram convite (linked_user_id != null) e podem virar líder.
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: { id: string; name: string; leader_user_id: string | null } | null;
  workspaceId: string;
  onSuccess: () => void;
}

interface LeaderOption {
  user_id: string;
  name: string;
}

export const ChangeTeamLeaderDialog = ({
  open, onOpenChange, team, workspaceId, onSuccess,
}: Props) => {
  const [selected, setSelected] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && team) setSelected(team.leader_user_id ?? '');
  }, [open, team]);

  const { data: options = [], isLoading } = useQuery<LeaderOption[]>({
    queryKey: ['eligible-team-leaders', workspaceId],
    enabled: open && !!workspaceId,
    queryFn: async () => {
      // Workspace owner
      const { data: ws } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .maybeSingle();

      // Distinct existing leaders of any team in this workspace
      const { data: teams } = await supabase
        .from('teams')
        .select('leader_user_id')
        .eq('workspace_id', workspaceId);

      // Linked members (already accepted invite) — they can be promoted
      const { data: linked } = await supabase
        .from('team_members')
        .select('linked_user_id, name, teams!inner(workspace_id)')
        .eq('teams.workspace_id', workspaceId)
        .not('linked_user_id', 'is', null);

      const userIds = new Set<string>();
      if (ws?.owner_id) userIds.add(ws.owner_id);
      teams?.forEach((t: { leader_user_id: string | null }) => {
        if (t.leader_user_id) userIds.add(t.leader_user_id);
      });
      linked?.forEach((m: { linked_user_id: string | null }) => {
        if (m.linked_user_id) userIds.add(m.linked_user_id);
      });

      // Resolve names via team_members.name (linked_user_id match)
      const ids = Array.from(userIds);
      if (ids.length === 0) return [];
      const { data: named } = await supabase
        .from('team_members')
        .select('linked_user_id, name')
        .in('linked_user_id', ids);

      const nameByUid = new Map<string, string>();
      named?.forEach((r: { linked_user_id: string | null; name: string }) => {
        if (r.linked_user_id && !nameByUid.has(r.linked_user_id)) {
          nameByUid.set(r.linked_user_id, r.name);
        }
      });

      return ids
        .map((uid) => ({ user_id: uid, name: nameByUid.get(uid) ?? uid.slice(0, 8) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },
  });

  const currentLabel = useMemo(() => {
    if (!team?.leader_user_id) return 'Sem líder atribuído';
    const o = options.find((x) => x.user_id === team.leader_user_id);
    return o?.name ?? team.leader_user_id.slice(0, 8);
  }, [team, options]);

  const handleSave = async () => {
    if (!team) return;
    setSaving(true);
    try {
      const newLeader = selected || null;
      const { error } = await supabase
        .from('teams')
        .update({ leader_user_id: newLeader })
        .eq('id', team.id);
      if (error) throw error;
      toast({ title: 'Líder atualizado', description: `Time "${team.name}" agora tem novo líder.` });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao trocar líder', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Trocar líder do time</DialogTitle>
          <DialogDescription>
            Time <strong>{team?.name}</strong> · Líder atual: {currentLabel}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="leader-select">Novo líder</Label>
          <Select value={selected} onValueChange={setSelected} disabled={isLoading}>
            <SelectTrigger id="leader-select" className="rounded-xl">
              <SelectValue placeholder={isLoading ? 'Carregando…' : 'Selecione um líder'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.user_id} value={o.user_id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            A lista mostra o dono do workspace, líderes atuais e liderados que já aceitaram o convite.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !selected || selected === team?.leader_user_id} className="rounded-xl gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
