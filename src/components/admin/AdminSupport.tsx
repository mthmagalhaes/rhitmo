import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Edit, Trash2, Building, User, Loader2, ArrowRightLeft, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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

export const AdminSupport = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialog, setEditDialog] = useState<{ open: boolean; type: 'workspace' | 'member' | null; data: any }>({
    open: false,
    type: null,
    data: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'workspace' | 'member' | null; id: string | null }>({
    open: false,
    type: null,
    id: null,
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all teams for the move member feature
  const { data: allTeams } = useQuery({
    queryKey: ['admin-all-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, workspace_id, workspaces(name, owner_id)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch users for password reset
  const { data: allUsers } = useQuery({
    queryKey: ['admin-users-metadata'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_with_metadata');
      if (error) throw error;
      return data;
    },
  });

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['admin-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return { workspaces: [], members: [] };

      const [workspacesRes, membersRes] = await Promise.all([
        supabase
          .from('workspaces')
          .select('*')
          .ilike('name', `%${searchTerm}%`)
          .limit(10),
        supabase
          .from('team_members')
          .select('*, teams(id, name, workspace_id)')
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(10),
      ]);

      return {
        workspaces: workspacesRes.data || [],
        members: membersRes.data || [],
      };
    },
    enabled: searchTerm.length >= 2,
  });

  const handleEdit = (type: 'workspace' | 'member', data: any) => {
    setEditForm(data);
    setEditDialog({ open: true, type, data });
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      if (editDialog.type === 'workspace') {
        const { error } = await supabase
          .from('workspaces')
          .update({ name: editForm.name })
          .eq('id', editForm.id);
        if (error) throw error;
      } else if (editDialog.type === 'member') {
        const updateData: any = {
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
        };
        
        // If team_id changed, move the member
        if (editForm.team_id && editForm.team_id !== editDialog.data?.team_id) {
          updateData.team_id = editForm.team_id;
        }

        const { error } = await supabase
          .from('team_members')
          .update(updateData)
          .eq('id', editForm.id);
        if (error) throw error;
      }

      toast({
        title: "Alterações salvas",
        description: editDialog.type === 'member' && editForm.team_id !== editDialog.data?.team_id 
          ? "Membro movido para o novo time com sucesso."
          : "Os dados foram atualizados com sucesso.",
      });

      setEditDialog({ open: false, type: null, data: null });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-all-teams'] });
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== 'DELETAR') {
      toast({
        title: "Confirmação incorreta",
        description: "Digite DELETAR para confirmar a exclusão.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (deleteDialog.type === 'workspace') {
        const { error } = await supabase
          .from('workspaces')
          .delete()
          .eq('id', deleteDialog.id);
        if (error) throw error;
      } else if (deleteDialog.type === 'member') {
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('id', deleteDialog.id);
        if (error) throw error;
      }

      toast({
        title: "Deletado com sucesso",
        description: "O registro foi removido permanentemente.",
      });

      setDeleteDialog({ open: false, type: null, id: null });
      setDeleteConfirmation('');
      refetch();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (email: string) => {
    setResettingEmail(email);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Email de reset enviado",
        description: `Link de recuperação enviado para ${email}.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar reset",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResettingEmail(null);
    }
  };

  // Group teams by workspace for better UX
  const teamsByWorkspace = allTeams?.reduce((acc: Record<string, { wsName: string; teams: typeof allTeams }>, team: any) => {
    const wsId = team.workspace_id;
    const wsName = team.workspaces?.name || 'Desconhecido';
    if (!acc[wsId]) {
      acc[wsId] = { wsName, teams: [] };
    }
    acc[wsId].teams.push(team);
    return acc;
  }, {} as Record<string, any>) || {};

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Suporte & Edição</h1>
        <p className="text-muted-foreground">Buscar, editar registros e mover membros entre times</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Busca Universal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar workspaces, membros ou emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {searchResults && searchTerm.length >= 2 && !isLoading && (
            <div className="space-y-4">
              {searchResults.workspaces.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Workspaces ({searchResults.workspaces.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults.workspaces.map((workspace: any) => (
                      <Card key={workspace.id}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div>
                            <p className="font-medium">{workspace.name}</p>
                            <p className="text-sm text-muted-foreground">ID: {workspace.id}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit('workspace', workspace)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteDialog({ open: true, type: 'workspace', id: workspace.id })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.members.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Membros ({searchResults.members.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults.members.map((member: any) => (
                      <Card key={member.id}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="space-y-1">
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email || 'Sem email'}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{member.role}</Badge>
                              {member.teams && (
                                <Badge variant="secondary" className="text-xs">
                                  <ArrowRightLeft className="h-3 w-3 mr-1" />
                                  {(member.teams as any).name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {member.email && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePasswordReset(member.email)}
                                disabled={resettingEmail === member.email}
                                title="Enviar reset de senha"
                              >
                                {resettingEmail === member.email ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <KeyRound className="h-4 w-4 mr-2" />
                                )}
                                Reset Senha
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit('member', member)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteDialog({ open: true, type: 'member', id: member.id })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.workspaces.length === 0 && searchResults.members.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhum resultado encontrado</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Reset Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Reset de Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Busque um membro acima para enviar um link de recuperação de senha, ou use a busca universal para encontrar o usuário desejado.
          </p>
          {allUsers && allUsers.length > 0 && (
            <div className="space-y-2">
              {allUsers.slice(0, 10).map((u: any) => (
                <div key={u.user_id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50">
                  <div>
                    <span className="font-medium text-sm">{u.full_name || 'Sem nome'}</span>
                    <span className="text-muted-foreground text-sm ml-2">{u.email}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePasswordReset(u.email)}
                    disabled={resettingEmail === u.email}
                  >
                    {resettingEmail === u.email ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar {editDialog.type === 'workspace' ? 'Workspace' : 'Membro'}</DialogTitle>
            <DialogDescription>
              {editDialog.type === 'member' 
                ? 'Edite os dados do membro. Para mover para outro time, altere o campo "Time".'
                : 'Faça as alterações necessárias'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editDialog.type === 'workspace' && (
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
            )}

            {editDialog.type === 'member' && (
              <>
                <div>
                  <Label htmlFor="member-name">Nome</Label>
                  <Input
                    id="member-name"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Cargo</Label>
                  <Input
                    id="role"
                    value={editForm.role || ''}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="team" className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    Mover para Time
                  </Label>
                  <Select
                    value={editForm.team_id || ''}
                    onValueChange={(value) => setEditForm({ ...editForm, team_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar time..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(teamsByWorkspace).map(([wsId, wsData]: [string, any]) => (
                        wsData.teams.map((team: any) => (
                          <SelectItem key={team.id} value={team.id}>
                            {wsData.wsName} → {team.name}
                          </SelectItem>
                        ))
                      ))}
                    </SelectContent>
                  </Select>
                  {editForm.team_id && editForm.team_id !== editDialog.data?.team_id && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ O membro será movido para outro time/líder ao salvar.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, type: null, data: null })}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Deletar Permanentemente</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta ação é irreversível. Digite <strong>DELETAR</strong> para confirmar.</p>
              <Input
                placeholder="Digite DELETAR"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmation !== 'DELETAR' || loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
