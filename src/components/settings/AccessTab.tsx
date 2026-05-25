import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Trash2, Shield, UserPlus, Crown, RotateCw, Info } from 'lucide-react';
import { toast } from 'sonner';

interface HRAdminRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  invited_at: string | null;
  last_sign_in_at: string | null;
  status: 'pending' | 'active' | null;
}

export function AccessTab() {
  const { workspaceId, isHRAdmin, isWorkspaceOwner } = useAccount();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

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
        body: { email: email.trim(), name: name.trim() || null, workspace_id: workspaceId, action: 'invite' },
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

  const handleResend = async (adminEmail: string, userId: string) => {
    if (!workspaceId) return;
    setResendingId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('invite-hr-admin', {
        body: { email: adminEmail, workspace_id: workspaceId, action: 'resend' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Novo convite enviado para ${adminEmail}`, {
        description: 'Peça pra abrir direto no app de e-mail (sem prévia/preview) — o link é de uso único.',
      });
      queryClient.invalidateQueries({ queryKey: ['hr-admins', workspaceId] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Falha ao reenviar', { description: message });
    } finally {
      setResendingId(null);
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
              Convite expira em 24h. Se a pessoa já tem conta Rhitmo, é promovida na hora. Se o link travar em branco, reenvie aqui na lista abaixo.
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
                {admins.map((a) => {
                  const isPending = a.status === 'pending';
                  return (
                    <div
                      key={a.user_id}
                      className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3 gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">{a.full_name ?? a.email ?? a.user_id}</p>
                          {isPending ? (
                            <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300">
                              Convite pendente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-emerald-400/50 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300">
                              Ativo
                            </Badge>
                          )}
                        </div>
                        {a.email && <p className="text-xs text-muted-foreground truncate">{a.email}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        {isPending && a.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(a.email!, a.user_id)}
                            disabled={resendingId === a.user_id}
                            className="rounded-xl gap-1.5 text-xs"
                          >
                            {resendingId === a.user_id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCw className="w-3.5 h-3.5" />
                            )}
                            Reenviar
                          </Button>
                        )}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-muted/40 border border-border/40 p-3 flex gap-2.5 text-[11px] text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              <strong className="text-foreground">Link de convite em branco?</strong> O antivírus do e-mail (Gmail/Outlook corporativo) costuma abrir o link em segundo plano e queimar o token de uso único. Use <strong>Reenviar</strong> acima e peça pra abrir direto do app de e-mail no celular. Como alternativa imediata, a pessoa pode usar <strong>"Esqueci minha senha"</strong> em <code className="text-foreground">rhitmo.co/auth</code> com o mesmo e-mail — a conta já existe e cai direto no painel /hr.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
