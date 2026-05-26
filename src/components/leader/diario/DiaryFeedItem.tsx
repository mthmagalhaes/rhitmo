// Item do feed cross-member do Diário v2.
// Linha compacta colapsável: ícone privacidade + data + avatar/nome + título + tags + chevron.
// Snippet completo aparece só ao expandir. Editar/Excluir inline + "Abrir nota" deep link.
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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editTitle, setEditTitle] = useState(item.title || '');
  const [editContent, setEditContent] = useState(item.content || '');
  const [editTags, setEditTags] = useState<string[]>(item.tags || []);
  const [editOccurredAt, setEditOccurredAt] = useState<Date | undefined>(
    new Date(item.occurred_at || item.created_at),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const editorRef = useRef<any>(null);

  const isShared = item.visibility === 'shared';
  const dateIso = item.occurred_at || item.created_at;
  const dateLabel = format(new Date(dateIso), 'dd/MM/yyyy');
  const fullText = stripHtml(item.content || '');

  const openEdit = () => {
    setEditTitle(item.title || '');
    setEditContent(item.content || '');
    setEditTags(item.tags || []);
    setEditOccurredAt(new Date(item.occurred_at || item.created_at));
    setEditOpen(true);
  };

  const toggleEditTag = (tag: string) => {
    setEditTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
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
      queryClient.invalidateQueries({ queryKey: ['diario-feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    } catch (err) {
      console.error('[DiaryFeedItem] edit error', err);
      toast.error('Não foi possível salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('feedbacks').delete().eq('id', item.id);
      if (error) throw error;
      toast.success('Anotação excluída.');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['diario-feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    } catch (err) {
      console.error('[DiaryFeedItem] delete error', err);
      toast.error('Não foi possível excluir a anotação.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card hover:border-border transition-colors overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/40 transition-colors"
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
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

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
          {fullText && (
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
              {fullText}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1.5 rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit();
                }}
                aria-label="Editar anotação"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1.5 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteOpen(true);
                }}
                aria-label="Excluir anotação"
              >
                <Trash2 className="h-3 w-3" />
                Excluir
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/lider/diario?member=${item.member_id}#${item.id}`);
              }}
            >
              <ExternalLink className="h-3 w-3" />
              Abrir nota
            </Button>
          </div>
        </div>
      )}

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
