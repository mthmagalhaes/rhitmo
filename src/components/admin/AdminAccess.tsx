import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Loader2, Trash2, Send, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HrWorkspace {
  id: string;
  name: string;
  hr_admin_ids: string[];
}

export const AdminAccess = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [sending, setSending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Fetch all workspaces (admin has full access)
  const { data: workspaces } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, hr_admin_ids')
        .order('name');
      if (error) throw error;
      return data as HrWorkspace[];
    },
  });

  // Fetch user emails for hr_admin_ids
  const { data: allUsers } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_with_metadata');
      if (error) throw error;
      return data;
    },
  });

  const getUserEmail = (userId: string) => {
    const user = allUsers?.find(u => u.user_id === userId);
    return user?.email || userId.slice(0, 8) + '...';
  };

  const hrWorkspaces = workspaces?.filter(
    w => w.hr_admin_ids && w.hr_admin_ids.length > 0
  ) || [];

  const handleInvite = async () => {
    if (!email || !name || !workspaceId) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-invite-user', {
        body: { email, name, assigned_plan: 'pulse', role: 'hr_admin', workspace_id: workspaceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const wsName = workspaces?.find(w => w.id === workspaceId)?.name || workspaceId;
      toast({ title: `Convite enviado para ${email} como HR Admin do workspace ${wsName}` });
      setEmail('');
      setName('');
      setWorkspaceId('');
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
    } catch (err: any) {
      toast({ title: 'Erro ao convidar', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (wsId: string, userId: string) => {
    setRemovingId(userId);
    try {
      const { error } = await supabase.rpc('manage_hr_admin', {
        _workspace_id: wsId,
        _user_id: userId,
        _action: 'remove',
      });
      if (error) throw error;
      toast({ title: 'HR Admin removido com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-8 bg-slate-900 min-h-screen text-slate-100">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="h-6 w-6 text-violet-400" />
        <h1 className="text-2xl font-bold tracking-tight">Gestão de Acessos</h1>
      </div>

      {/* Seção 1 — Convidar HR Admin */}
      <Card className="bg-slate-800 border-slate-700 mb-8">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">Convidar HR Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Email *</Label>
              <Input
                type="email"
                placeholder="hr@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Nome completo *</Label>
              <Input
                placeholder="Nome do HR Admin"
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Workspace *</Label>
              <Select value={workspaceId} onValueChange={setWorkspaceId}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Selecionar workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces?.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleInvite} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Convite
          </Button>
        </CardContent>
      </Card>

      {/* Seção 2 — HR Admins Ativos */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">HR Admins Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {hrWorkspaces.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-slate-400">
              <UserX className="h-10 w-10 mb-2 opacity-50" />
              <p>Nenhum HR Admin ativo</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Workspace</TableHead>
                  <TableHead className="text-slate-300">HR Admin</TableHead>
                  <TableHead className="text-slate-300 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hrWorkspaces.map(ws =>
                  ws.hr_admin_ids.map(uid => (
                    <TableRow key={`${ws.id}-${uid}`} className="border-slate-700">
                      <TableCell className="text-slate-200">
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          {ws.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-200">{getUserEmail(uid)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-slate-700"
                          onClick={() => handleRemove(ws.id, uid)}
                          disabled={removingId === uid}
                        >
                          {removingId === uid ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
