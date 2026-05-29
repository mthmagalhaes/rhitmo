// Card semanal de atividade no Slack — agora é uma ANOTAÇÃO completa,
// editável pelo líder, com bullets+assuntos, avaliação da IA, evidências
// expansíveis (com permalinks) e menu de ações (editar, copiar texto,
// copiar pra outro liderado, excluir). Remove a necessidade da aba
// "Sinais do Slack": tudo que o líder precisa está aqui.
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
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.leader_edited_summary ?? item.summary);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const weekLabel = format(new Date(item.occurred_at), 'dd/MM', { locale: ptBR });
  const firstName = item.member_name.split(' ')[0];
  const displayedSummary = item.leader_edited_summary ?? item.summary;
  const allEvidenceIds = item.highlights.flatMap((h) => h.evidence_ids);
  const hasEvidences = allEvidenceIds.length > 0;

  // Lazy fetch das evidências apenas quando o usuário expande
  const { data: evidences, isLoading: loadingEvidences } = useQuery({
    queryKey: ['slack-rollup-evidences', item.id, allEvidenceIds.join(',')],
    enabled: expanded && hasEvidences,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SlackEvidenceLite[]> => {
      const { data, error } = await supabase
        .from('slack_ambient_evidence')
        .select('id, message_text, slack_channel_name, permalink, captured_at')
        .in('id', allEvidenceIds)
        .limit(20);
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
    const lines = [`Semana de ${weekLabel} — ${firstName} no Slack`, ''];
    if (item.highlights.length > 0) {
      item.highlights.forEach((h) => lines.push(`• ${h.subject ? `[${h.subject}] ` : ''}${h.bullet}`));
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
      // segue mesmo se clipboard falhar — o conteúdo já vai pré-preenchido no dialog
    }
    onCopyToMember({
      content,
      title: `Resumo Slack — semana de ${weekLabel}`,
    });
  };

  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
      {/* Header */}
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <SlackIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-foreground tracking-tight truncate">
              Semana de {weekLabel} — {firstName} no Slack
            </h4>
            <p className="text-xs text-muted-foreground">
              Resumo automático · {item.member_name} · {format(new Date(item.occurred_at), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => { setDraft(displayedSummary); setEditing(true); }}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Editar resumo
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleCopyText}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copiar texto
            </DropdownMenuItem>
            {onCopyToMember && (
              <DropdownMenuItem onSelect={handleCopyToMember}>
                <CopyPlus className="h-3.5 w-3.5 mr-2" />
                Copiar para outro liderado
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setConfirmDelete(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Highlights */}
      {item.highlights.length > 0 && !editing && (
        <ul className="space-y-2.5 pl-[44px] mb-3">
          {item.highlights.map((h, i) => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-2">
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
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Summary / Editor */}
      {editing ? (
        <div className="pl-[44px] space-y-2">
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
          <p className="pl-[44px] text-sm text-muted-foreground leading-relaxed">
            {displayedSummary}
          </p>
        )
      )}

      {/* AI assessment */}
      {!editing && item.ai_assessment?.summary && (
        <div
          className={cn(
            'mt-3 ml-[44px] rounded-xl border px-3 py-2 flex items-start gap-2',
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

      {/* Expandable evidences */}
      {!editing && hasEvidences && (
        <div className="mt-3 pl-[44px]">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
            {expanded ? 'Ocultar evidências' : `Ver evidências (${allEvidenceIds.length})`}
          </button>

          {expanded && (
            <div className="mt-2 space-y-1.5">
              {loadingEvidences ? (
                <div className="text-[11px] text-muted-foreground">Carregando…</div>
              ) : evidences && evidences.length > 0 ? (
                evidences.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs flex items-start gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      {ev.slack_channel_name && (
                        <span className="font-medium text-primary/80">#{ev.slack_channel_name}</span>
                      )}
                      <span className="text-muted-foreground"> · {format(new Date(ev.captured_at), 'dd/MM HH:mm', { locale: ptBR })}</span>
                      <p className="mt-1 text-foreground/80 line-clamp-3 leading-relaxed">{ev.message_text}</p>
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
                <div className="text-[11px] text-muted-foreground">Evidências indisponíveis.</div>
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
              O resumo some do seu Diário. As mensagens originais no Slack não são afetadas, e a Rhitmo continua usando os sinais brutos como contexto do Mentor.
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
