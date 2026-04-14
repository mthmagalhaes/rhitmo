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
import { ShieldCheck, Loader2, Trash2, Send, UserX, FileDown } from 'lucide-react';
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
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const { data: workspaces } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase.from('workspaces').select('id, name, hr_admin_ids').order('name');
      if (error) throw error;
      return data as HrWorkspace[];
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_with_metadata');
      if (error) throw error;
      return data;
    },
  });

  const getUserEmail = (userId: string) => allUsers?.find(u => u.user_id === userId)?.email || userId.slice(0, 8) + '...';

  const hrWorkspaces = workspaces?.filter(w => w.hr_admin_ids && w.hr_admin_ids.length > 0) || [];

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
      toast({ title: `Convite enviado para ${email} como HR Admin` });
      setEmail(''); setName(''); setWorkspaceId('');
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (wsId: string, userId: string) => {
    setRemovingId(userId);
    try {
      const { error } = await supabase.rpc('manage_hr_admin', { _workspace_id: wsId, _user_id: userId, _action: 'remove' });
      if (error) throw error;
      toast({ title: 'HR Admin removido' });
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setRemovingId(null);
    }
  };

  // Export logic
  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    return [headers.join(','), ...data.map(row =>
      headers.map(h => { const v = row[h]; if (v == null) return ''; const s = String(v); return s.includes(',') ? `"${s}"` : s; }).join(',')
    )].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (table: string) => {
    setExportLoading(table);
    try {
      const { data, error } = await supabase.from(table as any).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "Sem dados", description: "Tabela vazia.", variant: "destructive" });
        return;
      }
      downloadCSV(convertToCSV(data), table);
      toast({ title: "Export realizado", description: `${data.length} registros exportados.` });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setExportLoading(null);
    }
  };

  const exportTables = [
    { key: 'workspaces', label: 'Workspaces' },
    { key: 'team_members', label: 'Membros' },
    { key: 'feedbacks', label: 'Feedbacks' },
    { key: 'performance_reviews', label: 'Avaliações' },
    { key: 'teams', label: 'Times' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Acessos & Export</h1>
          <p className="text-muted-foreground">Gestão de HR Admins e exportação de dados</p>
        </div>
      </div>

      {/* Invite HR Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Convidar HR Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="hr@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input placeholder="Nome do HR Admin" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Workspace *</Label>
              <Select value={workspaceId} onValueChange={setWorkspaceId}>
                <SelectTrigger><SelectValue placeholder="Selecionar workspace" /></SelectTrigger>
                <SelectContent>
                  {workspaces?.map(w => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
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

      {/* Active HR Admins */}
      <Card>
        <CardHeader><CardTitle className="text-lg">HR Admins Ativos</CardTitle></CardHeader>
        <CardContent>
          {hrWorkspaces.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <UserX className="h-10 w-10 mb-2 opacity-50" />
              <p>Nenhum HR Admin ativo</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>HR Admin</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hrWorkspaces.map(ws =>
                  ws.hr_admin_ids.map(uid => (
                    <TableRow key={`${ws.id}-${uid}`}>
                      <TableCell><Badge variant="outline">{ws.name}</Badge></TableCell>
                      <TableCell>{getUserEmail(uid)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemove(ws.id, uid)} disabled={removingId === uid}>
                          {removingId === uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

      {/* Data Export */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileDown className="h-5 w-5" /> Data Export</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            {exportTables.map(t => (
              <Button key={t.key} variant="outline" className="gap-2 justify-start" onClick={() => handleExport(t.key)} disabled={exportLoading === t.key}>
                {exportLoading === t.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
