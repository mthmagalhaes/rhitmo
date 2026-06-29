// Item do feed cross-member do Diário v2.
// Linha compacta colapsável + menu "⋯" com ações: renomear, editar,
// copiar para outro liderado, copiar texto, abrir nota, excluir.
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronDown,
  Lock,
  Eye,
  ExternalLink,
  Calendar as CalendarIcon,
  Pencil,
  Trash2,
  MoreHorizontal,
  Type,
  Copy,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { MemberAvatar } from '@/components/MemberAvatar';
import { getTagColor, getTagEmoji, getTagLabel, VALID_TAGS } from '@/lib/tagConfig';
import { supabase } from '@/integrations/supabase/client';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import { TranscriptExpandedView } from './TranscriptExpandedView';
import { getDiarySourceMeta, isTranscriptLike } from '@/lib/diarySource';

export interface FeedItem {
  id: string;
  member_id: string;
  member_name: string;
  member_role: string | null;
  member_avatar: string | null;
  title: string | null;
  content: string;
  tags: string[] | null;
  visibility: string | null;
  occurred_at: string;
  created_at: string;
  source?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structured_summary?: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  personal_lens?: any | null;
}

interface DiaryFeedItemProps {
  item: FeedItem;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function DiaryFeedItem({ item }: DiaryFeedItemProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { members } = useLeaderMembers();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);

  const [editTitle, setEditTitle] = useState(item.title || '');
  const [editContent, setEditContent] = useState(item.content || '');
  const [editTags, setEditTags] = useState<string[]>(item.tags || []);
  const [editOccurredAt, setEditOccurredAt] = useState<Date | undefined>(
    new Date(item.occurred_at || item.created_at),
  );
  const [renameValue, setRenameValue] = useState(item.title || '');
  const [cloneTargetId, setCloneTargetId] = useState<string>('');
  const [cloneKeepDate, setCloneKeepDate] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const editorRef = useRef<any>(null);

  const isShared = item.visibility === 'shared';
  const dateIso = item.occurred_at || item.created_at;
  const dateLabel = format(new Date(dateIso), 'dd/MM/yyyy');
  const fullText = stripHtml(item.content || '');
  const isTranscript = isTranscriptLike(item.source, item.content);
  const sourceMeta = getDiarySourceMeta(item.source, item.content);
  // Omitimos o chip "Nota" (caso dominante) para evitar ruído visual.
  const showSourceChip = sourceMeta && sourceMeta.kind !== 'manual';

  const openEdit = () => {
    setEditTitle(item.title || '');
    setEditContent(item.content || '');
    setEditTags(item.tags || []);
    setEditOccurredAt(new Date(item.occurred_at || item.created_at));
    setEditOpen(true);
  };

  const openRename = () => {
    setRenameValue(item.title || '');
    setRenameOpen(true);
  };

  const openClone = () => {
    setCloneTargetId('');
    setCloneKeepDate(true);
    setCloneOpen(true);
  };

  const toggleEditTag = (tag: string) => {
    setEditTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['diario-feedbacks'] });
    queryClient.invalidateQueries({ queryKey: ['team-members'] });
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({
          title: editTitle || null,
          content: editContent,
          tags: editTags,
          occurred_at: editOccurredAt?.toISOString() || new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;
      toast.success('Nota atualizada com sucesso ✏️');
      setEditOpen(false);
      invalidate();
    } catch (err) {
      console.error('[DiaryFeedItem] edit error', err);
      toast.error('Não foi possível salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRename = async () => {
    setIsRenaming(true);
    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({ title: renameValue.trim() || null })
        .eq('id', item.id);
      if (error) throw error;
      toast.success('Título atualizado.');
      setRenameOpen(false);
      invalidate();
    } catch (err) {
      console.error('[DiaryFeedItem] rename error', err);
      toast.error('Não foi possível renomear.');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleCopyText = async () => {
    try {
      const text = [item.title, stripHtml(item.content || '')].filter(Boolean).join('\n\n');
      await navigator.clipboard.writeText(text);
      toast.success('Texto copiado para a área de transferência.');
    } catch {
      toast.error('Não foi possível copiar o texto.');
    }
  };

  const handleClone = async () => {
    if (!cloneTargetId) {
      toast.error('Escolha um liderado de destino.');
      return;
    }
    setIsCloning(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const managerId = userData.user?.id;
      if (!managerId) throw new Error('Sem sessão.');

      const insertPayload = {
        manager_id: managerId,
        member_id: cloneTargetId,
        type: 'feedback',
        title: item.title,
        content: item.content,
        tags: item.tags ?? [],
        visibility: item.visibility ?? 'private',
        occurred_at: cloneKeepDate
          ? item.occurred_at || item.created_at
          : new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('feedbacks')
        .insert([insertPayload])
        .select('id, member_id')
        .single();

      if (error) throw error;

      const target = members.find((m) => m.id === cloneTargetId);
      toast.success(`Nota copiada para ${target?.name ?? 'liderado'}.`, {
        action: data
          ? {
              label: 'Abrir',
              onClick: () =>
                navigate(`/lider/diario?member=${data.member_id}#${data.id}`),
            }
          : undefined,
      });
      setCloneOpen(false);
      invalidate();
    } catch (err) {
      console.error('[DiaryFeedItem] clone error', err);
      toast.error('Não foi possível copiar a nota.');
    } finally {
      setIsCloning(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('feedbacks').delete().eq('id', item.id);
      if (error) throw error;
      toast.success('Anotação excluída.');
      setDeleteOpen(false);
      invalidate();
    } catch (err) {
      console.error('[DiaryFeedItem] delete error', err);
      toast.error('Não foi possível excluir a anotação.');
    } finally {
      setIsDeleting(false);
    }
  };

  const otherMembers = members.filter((m) => m.id !== item.member_id);

  return (
    <div className="rounded-xl border border-border/50 bg-card hover:border-border transition-colors overflow-hidden">
      <div className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/40 transition-colors">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 min-w-0 flex items-center gap-3 text-left"
        >
          {isShared ? (
            <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0 tabular-nums">
            <CalendarIcon className="h-3 w-3" />
            {dateLabel}
          </span>
          <MemberAvatar
            memberId={item.member_id}
            memberName={item.member_name}
            avatarUrl={item.member_avatar}
            size="sm"
            className="h-5 w-5 shrink-0"
          />
          <span className="text-xs text-foreground/80 shrink-0 truncate max-w-[140px]">
            {item.member_name}
          </span>
          <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
            {item.title || 'Sem título'}
          </span>
          {item.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className={cn(
                'hidden md:inline-flex items-center gap-1 text-[11px] rounded-md px-1.5 py-0.5 border shrink-0',
                getTagColor(tag),
              )}
            >
              <span>{getTagEmoji(tag)}</span>
              {getTagLabel(tag)}
            </span>
          ))}
          {item.tags && item.tags.length > 2 && (
            <span className="hidden md:inline text-[11px] text-muted-foreground shrink-0">
              +{item.tags.length - 2}
            </span>
          )}
          {showSourceChip && sourceMeta && (
            <span
              className={cn(
                'hidden md:inline-flex items-center gap-1 text-[11px] rounded-md px-1.5 py-0.5 border shrink-0',
                sourceMeta.badgeClass,
              )}
              aria-label={`Origem: ${sourceMeta.label}`}
              title={`Origem: ${sourceMeta.label}`}
            >
              <sourceMeta.icon className="h-3 w-3" />
              {sourceMeta.label}
            </span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
              aria-label="Ações da anotação"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={openRename}>
              <Type className="h-4 w-4 mr-2" />
              Renomear título
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar nota
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openClone} disabled={otherMembers.length === 0}>
              <Users className="h-4 w-4 mr-2" />
              Copiar para outro liderado
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyText}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar texto
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(`/lider/diario?member=${item.member_id}#${item.id}`)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir nota
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Recolher' : 'Expandir'}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>

      {open && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-2 mt-2.5 mb-2 flex-wrap text-[11px] text-muted-foreground">
            {item.member_role && <span>{item.member_role}</span>}
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(dateIso), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            <div className="flex items-center gap-1 ml-auto flex-wrap md:hidden">
              {item.tags?.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border',
                    getTagColor(tag),
                  )}
                >
                  <span>{getTagEmoji(tag)}</span>
                  {getTagLabel(tag)}
                </span>
              ))}
            </div>
          </div>
          {isTranscript ? (
            <TranscriptExpandedView
              feedbackId={item.id}
              content={item.content || ''}
              structuredSummary={item.structured_summary ?? null}
              personalLens={item.personal_lens ?? null}
              memberName={item.member_name}
              origin={sourceMeta ? { label: sourceMeta.label, badgeClass: sourceMeta.badgeClass } : null}
            />
          ) : fullText ? (
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
              {fullText}
            </p>
          ) : null}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear título</DialogTitle>
            <DialogDescription>
              Ajuste apenas o título desta anotação.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Título da nota"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isRenaming) handleRename();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={isRenaming}>
              {isRenaming ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copiar para outro liderado</DialogTitle>
            <DialogDescription>
              Duplica esta nota mantendo o conteúdo, tags e privacidade. A nota original
              fica intacta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Liderado de destino</Label>
              <Select value={cloneTargetId} onValueChange={setCloneTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um liderado" />
                </SelectTrigger>
                <SelectContent>
                  {otherMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                      {m.role ? ` · ${m.role}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={cloneKeepDate}
                onCheckedChange={(v) => setCloneKeepDate(v === true)}
              />
              <span>Manter a data original do fato ({dateLabel})</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleClone} disabled={isCloning || !cloneTargetId}>
              {isCloning ? 'Copiando...' : 'Duplicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar nota</DialogTitle>
            <DialogDescription>
              Ajuste o título, conteúdo, tags ou data da anotação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Título da nota (opcional)"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Conteúdo</Label>
              <RichTextEditor
                content={editContent}
                onChange={setEditContent}
                placeholder="Escreva sua anotação..."
                minHeight="150px"
                editorRef={editorRef}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {VALID_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={cn(
                      'cursor-pointer text-xs py-0.5 px-2 border transition-all',
                      editTags.includes(tag)
                        ? getTagColor(tag)
                        : 'opacity-40 hover:opacity-70',
                    )}
                    onClick={() => toggleEditTag(tag)}
                  >
                    {getTagEmoji(tag)} {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Data do fato</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !editOccurredAt && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editOccurredAt
                      ? format(editOccurredAt, 'PPP', { locale: ptBR })
                      : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editOccurredAt}
                    onSelect={setEditOccurredAt}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editContent.trim()}>
              {isSaving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta anotação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A nota será removida do histórico e do contexto
              da Rhitmo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
