// Helper para classificar a origem de um item do Diário (feedbacks.source)
// e renderizar um chip visual consistente, do mesmo tamanho dos chips de tag.
import { Bot, FileText, Upload, PenLine, type LucideIcon } from 'lucide-react';
import { SlackIcon } from '@/components/icons/SlackIcon';

export type DiarySourceKind =
  | 'recall_bot'
  | 'upload'
  | 'transcription_upload'
  | 'slack'
  | 'manual';

export interface DiarySourceMeta {
  kind: DiarySourceKind;
  label: string;
  icon: LucideIcon | typeof SlackIcon;
  /** Tailwind classes para o chip (badge soft, semantic-friendly). */
  badgeClass: string;
}

const SPEAKER_REGEX = /\*\*[^*\n]{1,80}:\*\*/;
const LONG_THRESHOLD = 1500;

/**
 * Detecta se um feedback se comporta como transcrição (formato falado /
 * conteúdo longo) e portanto merece a visão rica com TL;DR + chat.
 */
export function isTranscriptLike(
  source: string | null | undefined,
  content: string | null | undefined,
): boolean {
  if (source === 'recall_bot') return true;
  if (source === 'transcription') {
    const body = content ?? '';
    return body.length > LONG_THRESHOLD || SPEAKER_REGEX.test(body);
  }
  return false;
}

export function getDiarySourceMeta(
  source: string | null | undefined,
  content: string | null | undefined,
): DiarySourceMeta | null {
  if (source === 'recall_bot') {
    return {
      kind: 'recall_bot',
      label: 'Bot',
      icon: Bot,
      badgeClass:
        'bg-indigo-50 text-indigo-800 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-900',
    };
  }
  if (source === 'transcription') {
    const long = isTranscriptLike(source, content);
    return long
      ? {
          kind: 'transcription_upload',
          label: 'Transcrição',
          icon: FileText,
          badgeClass:
            'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
        }
      : {
          kind: 'upload',
          label: 'Upload',
          icon: Upload,
          badgeClass:
            'bg-sky-50 text-sky-800 border-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900',
        };
  }
  if (source === 'slack' || source === 'slack_activity_rollup') {
    return {
      kind: 'slack',
      label: 'Slack',
      icon: SlackIcon,
      badgeClass:
        'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
    };
  }
  // Sem source → nota manual. Devolvemos meta para o filtro, mas o feed
  // omite o chip (manual é o caso dominante; evitar ruído).
  return {
    kind: 'manual',
    label: 'Nota',
    icon: PenLine,
    badgeClass: 'bg-muted text-foreground/70 border-border',
  };
}
