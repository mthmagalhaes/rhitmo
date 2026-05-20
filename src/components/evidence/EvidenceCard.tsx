import { X, FileText, ExternalLink, Hash, Sparkles, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MemberAvatar } from '@/components/MemberAvatar';
import type { SlackEvidence, EvidenceCategory } from '@/hooks/useEvidence';

const CATEGORY_LABEL: Record<EvidenceCategory, { label: string; emoji: string; tone: string }> = {
  entrega: { label: 'Entrega', emoji: '🚀', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  reconhecimento: { label: 'Reconhecimento', emoji: '🎉', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  bloqueio: { label: 'Bloqueio', emoji: '⚠️', tone: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  conflito: { label: 'Conflito', emoji: '🔥', tone: 'bg-red-500/10 text-red-700 dark:text-red-300' },
  outro: { label: 'Outro', emoji: '💬', tone: 'bg-muted text-muted-foreground' },
};

interface Props {
  evidence: SlackEvidence;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onDismiss: (id: string) => void;
  onConvert: (evidence: SlackEvidence) => void;
  busy?: boolean;
}

export function EvidenceCard({ evidence, selected, onSelect, onDismiss, onConvert, busy }: Props) {
  const cat = CATEGORY_LABEL[evidence.category] || CATEGORY_LABEL.outro;
  const member = evidence.member;
  const captured = formatDistanceToNow(new Date(evidence.captured_at), { addSuffix: true, locale: ptBR });
  const exec = evidence.executive_summary || evidence.summary;
  const quote = evidence.key_quote || evidence.message_text;
  const participants = (evidence.participants ?? []).filter((p) => p.member_id !== evidence.member_id);

  return (
    <div
      className={`group rounded-2xl border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${
        selected ? 'border-primary ring-1 ring-primary/30' : 'border-border/60'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="pt-1">
          <Checkbox
            checked={selected}
            onCheckedChange={(c) => onSelect(evidence.id, c === true)}
            aria-label="Selecionar evidência"
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {member && <MemberAvatar memberId={member.id} memberName={member.name} size="sm" />}
            <span className="font-semibold text-sm tracking-tight">{member?.name || 'Liderado'}</span>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              {evidence.slack_channel_id.slice(0, 8)}
            </span>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-xs text-muted-foreground">{captured}</span>
            <Badge variant="secondary" className={`ml-auto text-[10px] font-semibold ${cat.tone}`}>
              {cat.emoji} {cat.label}
            </Badge>
          </div>

          {/* Thread topic */}
          {evidence.thread_topic && (
            <p className="font-serif text-base font-semibold text-foreground mb-2 leading-snug">
              {evidence.thread_topic}
            </p>
          )}

          {/* Executive summary */}
          {exec && (
            <div className="flex gap-2 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground/90 leading-relaxed">{exec}</p>
            </div>
          )}

          {/* Key quote */}
          {quote && (
            <blockquote className="border-l-2 border-primary/30 pl-3 mb-3">
              <p className="text-sm italic text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                "{quote}"
              </p>
            </blockquote>
          )}

          {/* Theme tags */}
          {evidence.theme_tags && evidence.theme_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {evidence.theme_tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Participants */}
          {participants.length > 0 && (
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>Também na thread:</span>
              <div className="flex -space-x-1.5">
                {participants.slice(0, 5).map((p) => (
                  <MemberAvatar key={p.member_id} memberId={p.member_id} memberName={p.name || ''} size="xs" />
                ))}
              </div>
              {participants.length > 5 && <span>+{participants.length - 5}</span>}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
            <span>Relevância: {Math.round(evidence.relevance_score * 100)}%</span>
            {evidence.permalink && (
              <a
                href={evidence.permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Ver no Slack <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="default"
              disabled={busy}
              onClick={() => onConvert(evidence)}
              className="rounded-xl"
            >
              <FileText className="h-4 w-4 mr-1" /> Virar nota
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onDismiss(evidence.id)}
              className="rounded-xl text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" /> Dispensar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
