import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, Power, PowerOff, Trash2, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useImpersonation } from '@/hooks/useImpersonation';

export const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { startImpersonation } = useImpersonation();

  // Users with metadata query
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-metadata'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_with_metadata');
      if (error) throw error;
      return data;
    },
  });

  // Workspaces query
  const { data: workspaces, refetch: refetchWorkspaces } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Map workspace status by owner
  const workspaceStatusByOwner = useMemo(() => {
    const statusMap: Record<string, { is_active: boolean; workspace_id: string }> = {};
    workspaces?.forEach((ws) => {
      statusMap[ws.owner_id] = { is_active: ws.is_active, workspace_id: ws.id };
    });
    return statusMap;
  }, [workspaces]);

  const toggleWorkspaceStatus = async (workspaceId: string, currentStatus: boolean) => {
    setTogglingId(workspaceId);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ is_active: !currentStatus })
        .eq('id', workspaceId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Workspace Suspenso" : "Workspace Ativado",
        description: currentStatus 
          ? "O acesso foi bloqueado."
          : "O acesso foi restaurado.",
      });

      refetchWorkspaces();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId }
      });

      if (error) throw error;

      toast({
        title: "Usuário excluído",
        description: "O usuário e todos os dados foram removidos permanentemente.",
      });

      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['admin-users-metadata'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getAvatarUrl = (userId: string) => {
    const colors = '7C3AED,10B981,F59E0B,3B82F6,EC4899';
    return `https://source.boringavatars.com/beam/40/${userId}?colors=${colors}&square`;
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Lista de Usuários</h1>
        <p className="text-muted-foreground">Gerencie todos os usuários do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários Cadastrados
          </CardTitle>
          <CardDescription>
            {users?.length || 0} usuários no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user: any) => {
                  const wsInfo = workspaceStatusByOwner[user.user_id];
                  
                  return (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={getAvatarUrl(user.user_id)} alt={user.full_name || user.email} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.full_name || <span className="text-muted-foreground italic">Sem nome</span>}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.job_title || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {user.phone || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {wsInfo ? (
                          <Badge variant={wsInfo.is_active ? "default" : "destructive"}>
                            {wsInfo.is_active ? "Ativo" : "Suspenso"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Sem workspace</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startImpersonation(user.user_id, user.email)}
                            title="Impersonar usuário"
                          >
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                          {wsInfo && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleWorkspaceStatus(wsInfo.workspace_id, wsInfo.is_active)}
                              disabled={togglingId === wsInfo.workspace_id}
                              title={wsInfo.is_active ? "Suspender" : "Ativar"}
                            >
                              {togglingId === wsInfo.workspace_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : wsInfo.is_active ? (
                                <PowerOff className="h-4 w-4 text-destructive" />
                              ) : (
                                <Power className="h-4 w-4 text-primary" />
                              )}
                            </Button>
                          )}
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                disabled={deletingId === user.user_id}
                                title="Excluir usuário"
                              >
                                {deletingId === user.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir usuário permanentemente?</AlertDialogTitle>
                                <AlertDialogDescription className="space-y-2">
                                  <p>Esta ação não pode ser desfeita. Isso irá:</p>
                                  <ul className="list-disc list-inside text-sm space-y-1">
                                    <li>Deletar a conta do usuário</li>
                                    <li>Remover todos os workspaces, times e membros</li>
                                    <li>Excluir todos os feedbacks e avaliações</li>
                                  </ul>
                                  <p className="font-medium pt-2">
                                    Usuário: {user.full_name || user.email}
                                  </p>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteUser(user.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirmar Exclusão
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
