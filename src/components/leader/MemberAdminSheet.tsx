// Sprint 19 — Drawer administrativo do liderado.
// Substitui o clique antigo que levava para /member/:id (página operacional legada).
// Aqui só vivem dados administrativos (identidade, time, vínculo, status).
// Histórico operacional fica nas páginas dedicadas: /lider/diario, /lider/1on1s,
// /lider/avaliacoes, /lider/mentor — acessíveis via "Abrir em…" no rodapé.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MemberAvatar } from '@/components/MemberAvatar';
import { EditMemberDialog } from '@/components/EditMemberDialog';
import { InviteMemberDialog } from '@/components/InviteMemberDialog';
import { RelationshipSignalsCard } from '@/components/leader/RelationshipSignalsCard';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { invalidateLeaderPeople } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { differenceInHours } from 'date-fns';

import {
  Mail,
  Briefcase,
  Pencil,
  Send,
  CheckCircle2,
  Archive,
  ArchiveRestore,
  BookOpen,
  Target,
  Sparkles,
  ClipboardList,
  ArrowRight,
  Music,
  Copy,
  Loader2,
  Clock,
  Trash2,
} from 'lucide-react';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

interface Team {
  id: string;
  name: string;
}

interface MemberAdminSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: LeaderMemberRow | null;
  teams: Team[];
  workspaceId: string | null;
  onChanged?: () => void;
}

function StatusBadge({ member }: { member: LeaderMemberRow }) {
  if (member.archived_at) {
    return (
      <Badge variant="outline" className="text-[11px] h-5">
        Arquivado
      </Badge>
    );
  }
  if (member.linked_user_id) {
    return (
      <Badge className="text-[11px] h-5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Vinculado
      </Badge>
    );
  }
  if (member.invite_status === 'pending') {
    return (
      <Badge variant="outline" className="text-[11px] h-5 border-amber-500/40 text-amber-700 dark:text-amber-400">
        Convite pendente
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px] h-5">
      Não convidado
    </Badge>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right text-foreground/90 truncate">{value}</span>
    </div>
  );
}

function SyncRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-right text-foreground/90 capitalize">{value}</span>
    </div>
  );
}

export function MemberAdminSheet({
  open,
  onOpenChange,
  member,
  teams,
  workspaceId,
  onChanged,
}: MemberAdminSheetProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [resendingSync, setResendingSync] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const { data: syncData } = useQuery({
    queryKey: ['member-sync', member?.id],
    queryFn: async () => {
      if (!member?.id) return null;
      const { data, error } = await supabase
        .from('team_members')
        .select('work_style_data, chronotype, feedback_style, recognition_style, motivators, user_manual')
        .eq('id', member.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!member?.id,
    staleTime: 30_000,
  });

  if (!member) return null;

  const teamName = member.team_id ? teams.find((t) => t.id === member.team_id)?.name ?? '—' : '—';
  const isArchived = !!member.archived_at;

  const refresh = () => {
    invalidateLeaderPeople(qc);
    onChanged?.();
  };

  const hoursSinceArchived = member.archived_at
    ? differenceInHours(new Date(), new Date(member.archived_at))
    : 0;
  const canHardDelete = isArchived && hoursSinceArchived >= 24;

  const handleHardDelete = async () => {
    if (deleteConfirm.trim() !== member.name.trim()) {
      toast.error('Digite o nome do liderado exatamente como aparece para confirmar.');
      return;
    }
    setActing(true);
    try {
      const { error } = await supabase.rpc('delete_archived_member', { p_member_id: member.id });
      if (error) throw error;
      toast.success(`${member.name} foi excluído definitivamente.`);
      setDeleteOpen(false);
      setDeleteConfirm('');
      onOpenChange(false);
      invalidateLeaderPeople(qc);
      onChanged?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('archive_cooldown_active')) {
        toast.error('Aguarde 24h após arquivar para excluir definitivamente.');
      } else if (msg.includes('forbidden')) {
        toast.error('Você não tem permissão para excluir este liderado.');
      } else if (msg.includes('member_not_archived')) {
        toast.error('Só é possível excluir liderados arquivados.');
      } else {
        toast.error(`Falha: ${msg}`);
      }
    } finally {
      setActing(false);
    }
  };

  const handleArchiveToggle = async () => {
    setActing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const patch = isArchived
        ? { archived_at: null, archived_by: null }
        : { archived_at: new Date().toISOString(), archived_by: user?.id ?? null };
      const { error } = await supabase.from('team_members').update(patch).eq('id', member.id);
      if (error) throw error;
      toast.success(isArchived ? 'Liderado restaurado.' : 'Liderado arquivado.');
      refresh();
      if (!isArchived) onOpenChange(false);
    } catch (err) {
      toast.error(`Falha: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActing(false);
    }
  };

  const syncUrl = `${window.location.origin}/sync/${member.id}`;
  const hasSync = !!(syncData?.work_style_data || syncData?.chronotype || syncData?.feedback_style || syncData?.recognition_style);
  const syncCompletedAt = (syncData?.work_style_data as { completed_at?: string } | null)?.completed_at;

  const handleCopySyncLink = async () => {
    try {
      await navigator.clipboard.writeText(syncUrl);
      toast.success('Link copiado.');
    } catch {
      toast.error('Falha ao copiar link.');
    }
  };

  const handleResendSync = async () => {
    if (!member.email) {
      toast.error('Esse liderado não tem e-mail cadastrado.');
      return;
    }
    setResendingSync(true);
    try {
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'sync-invite',
          recipientEmail: member.email,
          idempotencyKey: `sync-invite-resend-${member.id}-${Date.now()}`,
          templateData: { memberName: member.name, syncUrl },
        },
      });
      if (error) throw error;
      toast.success(`Pesquisa enviada para ${member.email}`);
    } catch (err) {
      toast.error(`Falha: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setResendingSync(false);
    }
  };

  const goTo = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const shortcuts: Array<{ icon: typeof BookOpen; label: string; path: string }> = [
    { icon: BookOpen, label: 'Diário de bordo', path: `/lider/diario?member=${member.id}` },
    // Objetivos oculto enquanto a feature está pausada.
    // { icon: Target, label: 'Objetivos', path: `/lider/objetivos?member=${member.id}` },
    { icon: ClipboardList, label: 'Avaliações', path: `/lider/avaliacoes?member=${member.id}` },
    { icon: Sparkles, label: 'Rhitmo (chat)', path: `/lider/mentor?member=${member.id}` },
  ];


  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto p-0">
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-6 pb-4">
              <SheetHeader className="flex-row items-center gap-4 space-y-0">
                <MemberAvatar
                  memberId={member.id}
                  memberName={member.name}
                  avatarUrl={member.avatar}
                  size="md"
                  className="h-14 w-14 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <SheetTitle className="font-serif text-lg tracking-tight truncate text-left">
                    {member.name}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-muted-foreground truncate text-left">
                    {member.role || 'Cargo não definido'}
                  </SheetDescription>
                  <div className="mt-2">
                    <StatusBadge member={member} />
                  </div>
                </div>
              </SheetHeader>
            </div>

            <Separator />

            {/* Identidade */}
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Identidade
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5"
                  onClick={() => setEditOpen(true)}
                  disabled={!workspaceId}
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </Button>
              </div>
              <div className="space-y-2">
                <Row label="Nome" value={member.name} />
                <Row label="Cargo" value={member.role || '—'} />
                <Row label="Time" value={teamName} />
                <Row
                  label="Email"
                  value={
                    member.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {member.email}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Vínculo */}
            <div className="p-6 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vínculo no Rhitmo
              </h3>

              {member.linked_user_id ? (
                <p className="text-sm text-muted-foreground">
                  Conta ativa. O liderado já acessa a plataforma com{' '}
                  <span className="text-foreground">{member.email}</span>.
                </p>
              ) : member.invite_status === 'pending' ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Convite enviado, aguardando o liderado aceitar.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-2"
                    onClick={() => setInviteOpen(true)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Reenviar convite / copiar link
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Ainda sem convite. Convide para que o liderado tenha acesso ao próprio portal.
                  </p>
                  <Button
                    size="sm"
                    className="rounded-xl gap-2"
                    onClick={() => setInviteOpen(true)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Convidar para o Rhitmo
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Rhitmo Sync */}
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5" />
                  Rhitmo Sync
                </h3>
                {hasSync ? (
                  <Badge className="text-[11px] h-5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                    Preenchido
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] h-5 border-amber-500/40 text-amber-700 dark:text-amber-400">
                    Pendente
                  </Badge>
                )}
              </div>

              {hasSync ? (
                <div className="space-y-3">
                  {syncCompletedAt && (
                    <p className="text-xs text-muted-foreground">
                      Preenchido em {format(new Date(syncCompletedAt), "dd/MM/yyyy", { locale: ptBR })}.
                    </p>
                  )}
                  <div className="space-y-2">
                    {syncData?.chronotype && <SyncRow label="Cronotipo" value={String(syncData.chronotype)} />}
                    {syncData?.feedback_style && <SyncRow label="Feedback" value={String(syncData.feedback_style)} />}
                    {syncData?.recognition_style && <SyncRow label="Reconhecimento" value={String(syncData.recognition_style)} />}
                    {Array.isArray(syncData?.motivators) && (syncData.motivators as string[]).length > 0 && (
                      <SyncRow label="Motivadores" value={(syncData.motivators as string[]).join(', ')} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Reenviar a pesquisa substitui o perfil atual em todo o Rhitmo (chat, briefs, avaliações).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2"
                      onClick={handleResendSync}
                      disabled={resendingSync || !member.email}
                    >
                      {resendingSync ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Reenviar pesquisa
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-xl gap-2" onClick={handleCopySyncLink}>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar link
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Aguardando preenchimento.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="rounded-xl gap-2"
                      onClick={handleResendSync}
                      disabled={resendingSync || !member.email}
                    >
                      {resendingSync ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Enviar pesquisa
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-xl gap-2" onClick={handleCopySyncLink}>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar link
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Sinais da relação (Camada de Ambiente) */}
            <div className="p-6">
              <RelationshipSignalsCard memberId={member.id} memberName={member.name} />
            </div>

            <Separator />
            <div className="p-6 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Abrir em…
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {shortcuts.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.path}
                      type="button"
                      onClick={() => goTo(s.path)}
                      className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        <span className="text-foreground/90">{s.label}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Ações */}
            <div className="p-6 pb-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Ações
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-2 w-full justify-start"
                onClick={handleArchiveToggle}
                disabled={acting}
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    Restaurar liderado
                  </>
                ) : (
                  <>
                    <Archive className="h-3.5 w-3.5" />
                    Arquivar liderado
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Arquivar preserva o histórico de feedbacks e 1:1s, mas remove o liderado das listas ativas.
              </p>

              {isArchived && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-2 w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
                    onClick={() => setDeleteOpen(true)}
                    disabled={!canHardDelete || acting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir definitivamente
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {canHardDelete
                      ? 'Remove o liderado e todos os feedbacks, 1:1s e avaliações vinculados. Esta ação não pode ser desfeita.'
                      : `Disponível ${24 - hoursSinceArchived}h após arquivar — janela de segurança para evitar exclusão por engano.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeleteConfirm(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {member.name} definitivamente?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Esta ação remove o liderado e <strong>todo o histórico vinculado</strong>: feedbacks,
                1:1s, avaliações, objetivos e contexto. Não pode ser desfeita.
              </span>
              <span className="block">
                Se o liderado tinha conta de login no Rhitmo, a conta dele permanece — só o vínculo
                com o seu time é apagado.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="confirm-delete" className="text-xs">
              Para confirmar, digite o nome <strong>{member.name}</strong>:
            </Label>
            <Input
              id="confirm-delete"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={member.name}
              className="rounded-xl"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleHardDelete(); }}
              disabled={acting || deleteConfirm.trim() !== member.name.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sub-diálogos reusados */}
      {workspaceId && (
        <EditMemberDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          member={{
            id: member.id,
            name: member.name,
            role: member.role || '',
            teamId: member.team_id || '',
          }}
          workspaceId={workspaceId}
          onSuccess={refresh}
        />
      )}

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        member={{
          id: member.id,
          name: member.name,
          email: member.email,
          invite_status: member.invite_status,
          invite_token: member.invite_token,
        }}
        onSuccess={refresh}
      />
    </>
  );
}
