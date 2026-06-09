import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  MessageSquare,
  Target,
  Settings,
  Sparkles,
  Calendar,
  Mail,
  Briefcase,
  Loader2,
  UserX,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { EditMemberDialog } from '@/components/EditMemberDialog';

interface MemberProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  workspaceId: string;
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );
}

function renderJsonValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') {
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  }
  return String(val);
}

export function MemberProfileSheet({
  open,
  onOpenChange,
  memberId,
  workspaceId,
}: MemberProfileSheetProps) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [acting, setActing] = useState(false);

  const { data: profile, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['hr-member-profile', workspaceId, memberId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_member_profile', {
        _workspace_id: workspaceId,
        _member_id: memberId,
      });
      if (error) throw error;
      const row = (data as any)?.[0] || null;
      if (!row) {
        console.warn('[MemberProfileSheet] get_hr_member_profile retornou null', { workspaceId, memberId });
      }
      return row;
    },
    enabled: open && !!memberId && !!workspaceId,
    retry: 2,
    retryDelay: 400,
  });

  const { data: activity } = useQuery({
    queryKey: ['hr-member-activity', workspaceId, memberId],
    enabled: open && !!memberId && !!workspaceId && !!profile,
    queryFn: async () => {
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const [fb30, fb90] = await Promise.all([
        supabase.from('feedbacks').select('id', { count: 'exact', head: true }).eq('member_id', memberId).gte('occurred_at', since30),
        supabase.from('feedbacks').select('id', { count: 'exact', head: true }).eq('member_id', memberId).gte('occurred_at', since90),
      ]);
      return {
        feedbacks_30d: fb30.count ?? 0,
        feedbacks_90d: fb90.count ?? 0,
      };
    },
  });

  const skillsData = profile?.skills_data;
  const skillsList = Array.isArray(skillsData) ? skillsData : [];
  const invitePending = profile?.invite_status && profile.invite_status !== 'accepted' && !profile.linked_user_id;

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['hr-member-profile', workspaceId, memberId] });
    qc.invalidateQueries({ queryKey: ['hr-members', workspaceId] });
    qc.invalidateQueries({ queryKey: ['hr-leaders', workspaceId] });
  };

  const handleResendInvite = async () => {
    if (!profile?.member_email) {
      toast.error('Sem e-mail cadastrado para reenviar.');
      return;
    }
    setActing(true);
    try {
      const { error } = await supabase.functions.invoke('admin-invite-user', {
        body: {
          email: profile.member_email,
          name: profile.member_name,
          workspace_id: workspaceId,
        },
      });
      if (error) throw error;
      toast.success(`Convite reenviado para ${profile.member_email}`);
      refreshAll();
    } catch (err) {
      toast.error(`Falha ao reenviar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    setActing(true);
    try {
      // Limpa dependências antes do team_members (RLS já libera HR Admin)
      await supabase.from('feedbacks').delete().eq('member_id', memberId);
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);
      if (error) throw error;
      toast.success(`${profile?.member_name ?? 'Liderado'} removido.`);
      refreshAll();
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(`Falha ao remover: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActing(false);
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !profile ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-6">
            <UserX className="h-10 w-10 opacity-40" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Perfil não encontrado</p>
              <p className="text-xs">Pode ser uma falha temporária de cache ou de permissão.</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 pb-4">
              <SheetHeader className="flex-row items-start gap-4 space-y-0">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-primary">
                    {profile.member_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-lg tracking-tight truncate">
                    {profile.member_name}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-muted-foreground truncate">
                    {profile.member_role || 'Cargo não definido'}
                  </SheetDescription>
                  {invitePending && (
                    <Badge
                      variant="outline"
                      className="mt-2 gap-1 bg-amber-50 text-amber-700 border-amber-200 text-[11px]"
                    >
                      <Clock className="h-3 w-3" />
                      Aguardando aceite
                    </Badge>
                  )}
                </div>

                {/* Admin actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-xl shrink-0" disabled={acting}>
                      {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar liderado
                    </DropdownMenuItem>
                    {invitePending && (
                      <DropdownMenuItem onClick={handleResendInvite} disabled={acting}>
                        <Send className="h-4 w-4 mr-2" />
                        Reenviar convite
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setConfirmDelete(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover liderado
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SheetHeader>

              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{profile.member_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>
                    Time: {profile.team_name || '—'} · Líder: {profile.leader_name || 'Não atribuído'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Membro desde{' '}
                    {format(new Date(profile.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Metadata Cards */}
            <div className="grid grid-cols-2 gap-3 px-6 py-4">
              <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Feedbacks
                    </span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{profile.feedback_count}</p>
                  {profile.last_feedback_date ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Último: {format(new Date(profile.last_feedback_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Nenhum registrado</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Atividade recente
                    </span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{activity?.feedbacks_30d ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    feedbacks nos últimos 30d · {activity?.feedbacks_90d ?? 0} em 90d
                  </p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="sync" className="flex-1 flex flex-col">
              <TabsList className="mx-6 mt-4 w-auto">
                <TabsTrigger value="sync" className="gap-1.5 text-xs">
                  <Settings className="h-3.5 w-3.5" />
                  Rhitmo Sync
                </TabsTrigger>
                <TabsTrigger value="skills" className="gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Skills
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sync" className="flex-1 px-6 pb-6">
                {!profile.work_style_data && !profile.chronotype && !profile.feedback_style ? (
                  <EmptyTab message="Rhitmo Sync não preenchido ainda" />
                ) : (
                  <div className="space-y-3 mt-3">
                    {profile.chronotype && <InfoCard title="Cronotipo" value={profile.chronotype} />}
                    {profile.feedback_style && <InfoCard title="Estilo de Feedback" value={profile.feedback_style} />}
                    {profile.recognition_style && <InfoCard title="Estilo de Reconhecimento" value={profile.recognition_style} />}
                    {profile.motivators && <InfoCard title="Motivadores" value={renderJsonValue(profile.motivators)} />}
                    {profile.user_manual && <InfoCard title="Manual de Instruções" value={renderJsonValue(profile.user_manual)} />}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="skills" className="flex-1 px-6 pb-6">
                {skillsList.length === 0 ? (
                  <EmptyTab message="Mapa de habilidades não definido ainda" />
                ) : (
                  <div className="space-y-3 mt-3">
                    {skillsList.map((skill: any, i: number) => (
                      <Card key={i} className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium">{skill.name || skill.skill}</p>
                          {skill.description && (
                            <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>

    {profile && (
      <EditMemberDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        member={{
          id: profile.member_id,
          name: profile.member_name,
          role: profile.member_role || '',
          teamId: profile.team_id,
        }}
        workspaceId={workspaceId}
        onSuccess={refreshAll}
      />
    )}

    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {profile?.member_name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é irreversível. Todos os feedbacks e dados deste liderado serão excluídos. O usuário continua existindo na plataforma, mas perde o vínculo com o time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={acting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={acting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Sim, remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border">
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <p className="text-sm">{value}</p>
      </CardContent>
    </Card>
  );
}
