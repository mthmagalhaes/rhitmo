// Card semanal do Slack — alinhado ao padrão do DiaryFeedItem.
// Colapsado: linha compacta com Slack icon, data, avatar, nome, título e badge.
// ⋯ e chevron sempre visíveis (sem opacity-hover).
// Expandido: bullets com subject chips, narrativa, avaliação Rhitmo,
// evidências expansíveis com permalinks (lazy fetch).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Copy,
  CopyPlus,
  Trash2,
  ExternalLink,
  Sparkles,
  Calendar as CalendarIcon,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { SlackIcon } from '@/components/icons/SlackIcon';
import { MemberAvatar } from '@/components/MemberAvatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SlackRollupHighlight {
  bullet: string;
  subject: string;
  evidence_ids: string[];
}

export interface SlackRollupAssessment {
  tone: string;
  summary: string;
}

export interface SlackRollupItem {
  kind: 'slack_rollup';
  id: string;
  member_id: string;
  member_name: string;
  member_avatar: string | null;
  title: string;
  summary: string;
  leader_edited_summary: string | null;
  occurred_at: string;
  highlights: SlackRollupHighlight[];
  ai_assessment: SlackRollupAssessment | null;
  themes: string[];
  top_channels: string[];
  top_collaborators: { name: string; interactions: number }[];
  evidence_count: number;
  window_start: string | null;
  window_end: string | null;
}

interface Props {
  item: SlackRollupItem;
  onCopyToMember?: (payload: { content: string; title: string }) => void;
}

const TONE_STYLES: Record<string, string> = {
  positivo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  construtivo: 'bg-blue-50 text-blue-700 border-blue-200',
  preocupação: 'bg-amber-50 text-amber-800 border-amber-200',
  preocupacao: 'bg-amber-50 text-amber-800 border-amber-200',
  neutro: 'bg-stone-50 text-stone-700 border-stone-200',
};

interface SlackEvidenceLite {
  id: string;
  message_text: string;
  slack_channel_name: string | null;
  permalink: string | null;
  captured_at: string;
}

export function SlackRollupFeedItem({ item, onCopyToMember }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showEvidences, setShowEvidences] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.leader_edited_summary ?? item.summary);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const weekLabel = format(new Date(item.occurred_at), 'dd/MM', { locale: ptBR });
  const dateLabel = format(new Date(item.occurred_at), 'dd/MM/yyyy', { locale: ptBR });
  const firstName = item.member_name.split(' ')[0];
  const displayedSummary = item.leader_edited_summary ?? item.summary;
  const allEvidenceIds = item.highlights.flatMap((h) => h.evidence_ids);
  const hasIdEvidences = allEvidenceIds.length > 0;
  const totalEvidenceCount = hasIdEvidences
    ? allEvidenceIds.length
    : item.evidence_count;
  const canFetchByWindow =
    !hasIdEvidences && !!item.window_start && !!item.window_end && !!item.member_id;
  const hasEvidences = hasIdEvidences || canFetchByWindow;
  const cardTitle = `Semana de ${weekLabel} — ${firstName} no Slack`;

  const { data: evidences, isLoading: loadingEvidences } = useQuery({
    queryKey: [
      'slack-rollup-evidences',
      item.id,
      hasIdEvidences ? allEvidenceIds.join(',') : `window:${item.window_start}:${item.window_end}`,
    ],
    enabled: showEvidences && hasEvidences,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SlackEvidenceLite[]> => {
      if (hasIdEvidences) {
        const { data, error } = await supabase
          .from('slack_ambient_evidence')
          .select('id, message_text, slack_channel_name, permalink, captured_at, category')
          .in('id', allEvidenceIds)
          .limit(20);
        if (error) throw error;
        return (data ?? []) as SlackEvidenceLite[];
      }
      const { data, error } = await supabase
        .from('slack_ambient_evidence')
        .select('id, message_text, slack_channel_name, permalink, captured_at, category')
        .eq('member_id', item.member_id)
        .gte('captured_at', item.window_start!)
        .lte('captured_at', item.window_end!)
        .order('relevance_score', { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as SlackEvidenceLite[];
    },
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      const next = draft.trim();
      const { error } = await supabase
        .from('context_evidence')
        .update({ leader_edited_summary: next || null, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['diario-slack-rollups'] });
      toast({ title: 'Resumo atualizado' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

  const softDelete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('context_evidence')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmDelete(false);
      qc.invalidateQueries({ queryKey: ['diario-slack-rollups'] });
      toast({ title: 'Resumo removido do diário' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' }),
  });

  const buildPlainText = () => {
    const lines = [cardTitle, ''];
    if (item.highlights.length > 0) {
      item.highlights.forEach((h) =>
        lines.push(`• ${h.subject ? `[${h.subject}] ` : ''}${h.bullet}`),
      );
      lines.push('');
    }
    if (displayedSummary) {
      lines.push(displayedSummary);
      lines.push('');
    }
    if (item.ai_assessment?.summary) {
      lines.push(`Avaliação Rhitmo: ${item.ai_assessment.summary}`);
    }
    return lines.join('\n').trim();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText());
      toast({ title: 'Resumo copiado' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const handleCopyToMember = async () => {
    if (!onCopyToMember) return;
    const content = buildPlainText();
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // segue mesmo se clipboard falhar
    }
    onCopyToMember({ content, title: `Resumo Slack — semana de ${weekLabel}` });
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card hover:border-border transition-colors overflow-hidden">
      <div className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/40 transition-colors">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 min-w-0 flex items-center gap-3 text-left"
        >
          <SlackIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
            {cardTitle}
          </span>
          <Badge
            variant="secondary"
            className="hidden md:inline-flex shrink-0 text-[10px] font-medium bg-primary/5 text-primary/80 border-primary/10 px-1.5 py-0 h-4"
          >
            Resumo semanal
          </Badge>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
              aria-label="Ações do resumo"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => {
                setDraft(displayedSummary);
                setEditing(true);
                setOpen(true);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar resumo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyText}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar texto
            </DropdownMenuItem>
            {onCopyToMember && (
              <DropdownMenuItem onClick={handleCopyToMember}>
                <CopyPlus className="h-4 w-4 mr-2" />
                Copiar para outro liderado
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setConfirmDelete(true)}
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
        <div className="px-3.5 pb-3.5 pt-3 border-t border-border/50 bg-muted/20 space-y-3">
          {/* Highlights */}
          {item.highlights.length > 0 && !editing && (
            <ul className="space-y-2">
              {item.highlights.map((h, i) => (
                <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
                  <span className="text-primary/60 mt-1 shrink-0">•</span>
                  <div className="flex-1 min-w-0">
                    {h.subject && (
                      <Badge
                        variant="secondary"
                        className="mr-2 align-middle text-[10px] font-medium bg-primary/5 text-primary/80 border-primary/10 px-1.5 py-0 h-4"
                      >
                        {h.subject}
                      </Badge>
                    )}
                    <span className="text-foreground/90">{h.bullet}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Summary / Editor */}
          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                className="text-sm rounded-xl"
                placeholder="Reescreva o resumo desta semana…"
              />
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveEdit.mutate()}
                  disabled={saveEdit.isPending}
                  className="gap-1.5"
                >
                  {saveEdit.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            item.highlights.length === 0 &&
            displayedSummary && (
              <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                {displayedSummary}
              </p>
            )
          )}

          {/* AI assessment */}
          {!editing && item.ai_assessment?.summary && (
            <div
              className={cn(
                'rounded-xl border px-3 py-2 flex items-start gap-2',
                TONE_STYLES[item.ai_assessment.tone] ?? TONE_STYLES.neutro,
              )}
            >
              <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold mr-1.5">Avaliação Rhitmo:</span>
                {item.ai_assessment.summary}
              </div>
            </div>
          )}

          {/* Evidences */}
          {!editing && hasEvidences && (
            <div>
              <button
                type="button"
                onClick={() => setShowEvidences((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform', showEvidences && 'rotate-180')}
                />
                {showEvidences ? 'Ocultar evidências' : `Ver evidências (${allEvidenceIds.length})`}
              </button>

              {showEvidences && (
                <div className="mt-2 space-y-1.5">
                  {loadingEvidences ? (
                    <div className="text-[11px] text-muted-foreground">Carregando…</div>
                  ) : evidences && evidences.length > 0 ? (
                    evidences.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-lg border border-border/60 bg-card p-2.5 text-xs flex items-start gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          {ev.slack_channel_name && (
                            <span className="font-medium text-primary/80">
                              #{ev.slack_channel_name}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {' '}· {format(new Date(ev.captured_at), 'dd/MM HH:mm', { locale: ptBR })}
                          </span>
                          <p className="mt-1 text-foreground/80 line-clamp-3 leading-relaxed">
                            {ev.message_text}
                          </p>
                        </div>
                        {ev.permalink && (
                          <a
                            href={ev.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Slack
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      Evidências indisponíveis.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este resumo?</AlertDialogTitle>
            <AlertDialogDescription>
              O resumo some do seu Diário. As mensagens originais no Slack não são afetadas,
              e a Rhitmo continua usando os sinais brutos como contexto do Mentor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                softDelete.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {softDelete.isPending ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
