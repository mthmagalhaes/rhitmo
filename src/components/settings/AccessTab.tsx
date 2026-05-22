import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Trash2, Shield, UserPlus, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface HRAdminRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

/**
 * Aba "Acessos" em /lider/configuracoes — visível apenas para Owner ou HR Admin.
 * Permite listar, convidar e remover HR Admins do workspace atual sem precisar
 * passar pelo super admin.
 */
export function AccessTab() {
  const { workspaceId, isHRAdmin, isWorkspaceOwner } = useAccount();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const canManage = isHRAdmin || isWorkspaceOwner;

  const { data: workspace } = useQuery({
    queryKey: ['workspace-meta', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data } = await supabase
        .from('workspaces')
        .select('id, name, owner_id')
        .eq('id', workspaceId)
        .maybeSingle();
      return data;
    },
    enabled: !!workspaceId,
  });

  const { data: ownerInfo } = useQuery({
    queryKey: ['workspace-owner', workspace?.owner_id],
    queryFn: async () => {
      if (!workspace?.owner_id) return null;
      const { data } = await supabase.rpc('get_all_users_with_metadata');
      const list = (data ?? []) as Array<{ user_id: string; email: string; full_name?: string }>;
      return list.find((u) => u.user_id === workspace.owner_id) ?? null;
    },
    enabled: !!workspace?.owner_id,
  });

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['hr-admins', workspaceId],
    queryFn: async (): Promise<HRAdminRow[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase.rpc('list_workspace_hr_admins', {
        _workspace_id: workspaceId,
      });
      if (error) throw error;
      return (data ?? []) as HRAdminRow[];
    },
    enabled: !!workspaceId && canManage,
  });

  const handleInvite = async () => {
    if (!email || !workspaceId) {
      toast.error('Informe um e-mail válido');
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-hr-admin', {
        body: { email: email.trim(), name: name.trim() || null, workspace_id: workspaceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(
        data?.invited
          ? `Convite enviado para ${email} como HR Admin`
          : `${email} promovido(a) a HR Admin`,
      );
      setEmail('');
      setName('');
      queryClient.invalidateQueries({ queryKey: ['hr-admins', workspaceId] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Falha ao convidar', { description: message });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!workspaceId) return;
    setRemovingId(userId);
    try {
      const { error } = await supabase.rpc('manage_hr_admin', {
        _workspace_id: workspaceId,
        _user_id: userId,
        _action: 'remove',
      });
      if (error) throw error;
      toast.success('HR Admin removido');
      queryClient.invalidateQueries({ queryKey: ['hr-admins', workspaceId] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Falha ao remover', { description: message });
    } finally {
      setRemovingId(null);
    }
  };

  if (!canManage) {
    return (
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Apenas Owner ou HR Admin do workspace podem gerenciar acessos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="font-serif tracking-tight flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" /> Dono do workspace
          </CardTitle>
          <CardDescription>
            Quem responde pelo workspace e tem acesso integral. Para transferir, fale com o suporte Rhitmo.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
            <div>
              <p className="font-medium">{ownerInfo?.full_name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{ownerInfo?.email ?? '—'}</p>
            </div>
            <Badge variant="outline" className="text-[10px]">Owner</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="font-serif tracking-tight flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> HR Admins
          </CardTitle>
          <CardDescription>
            HR Admins enxergam o painel /hr completo (analytics, times, frameworks) e podem gerenciar liderados do workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border/50 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <UserPlus className="w-3.5 h-3.5" /> Convidar HR Admin
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  placeholder="rh@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome (opcional)</Label>
                <Input
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            <Button
              onClick={handleInvite}
              disabled={inviting || !email}
              className="rounded-xl gap-2"
              size="sm"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar convite
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Se a pessoa já tem conta Rhitmo, é promovida na hora. Se não, recebe convite por e-mail com acesso ao painel /hr.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              HR Admins ativos ({admins.length})
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : admins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum HR Admin configurado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {admins.map((a) => (
                  <div
                    key={a.user_id}
                    className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{a.full_name ?? a.email ?? a.user_id}</p>
                      {a.email && <p className="text-xs text-muted-foreground truncate">{a.email}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemove(a.user_id)}
                      disabled={removingId === a.user_id}
                    >
                      {removingId === a.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
