import { Check, X, FileText, ExternalLink, Hash } from 'lucide-react';
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
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onConvert: (evidence: SlackEvidence) => void;
  busy?: boolean;
}

export function EvidenceCard({ evidence, selected, onSelect, onApprove, onDismiss, onConvert, busy }: Props) {
  const cat = CATEGORY_LABEL[evidence.category] || CATEGORY_LABEL.outro;
  const member = evidence.member;
  const captured = formatDistanceToNow(new Date(evidence.captured_at), { addSuffix: true, locale: ptBR });

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
            {member && <MemberAvatar memberId={member.id} name={member.name} size="sm" />}
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

          {/* Message */}
          <blockquote className="border-l-2 border-primary/20 pl-4 mb-3">
            <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4 whitespace-pre-wrap">
              {evidence.message_text}
            </p>
          </blockquote>

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
              onClick={() => onApprove(evidence.id)}
              className="rounded-xl"
            >
              <Check className="h-4 w-4 mr-1" /> Aprovar
            </Button>
            <Button
              size="sm"
              variant="secondary"
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
