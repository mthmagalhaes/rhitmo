// Helper para classificar a origem de um item do Diário (feedbacks.source)
// e renderizar um chip visual consistente, do mesmo tamanho dos chips de tag.
//
// REGRA DO SISTEMA: a verdade canônica vive no Postgres
// (função `detect_feedback_source` + trigger `feedbacks_auto_source_trg`),
// que já reclassifica transcrições importadas (Tactiq, Granola, Fireflies, etc.)
// gravadas historicamente como `source='manual'`. Este helper espelha a mesma
// heurística no cliente para casos legados ainda em cache e para resiliência
// caso o trigger seja desativado em ambiente de dev.
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

// Padrões heurísticos — espelham `public.detect_feedback_source` no DB.
const BOLD_SPEAKER_REGEX = /\*\*[^*\n:]{1,80}:\*\*/g;
const TIMESTAMPED_SPEAKER_REGEX = /^>\s?\d{1,2}:\d{2}\s+\S/gm;
const TACTIQ_HEADER_REGEX = /Meeting started:/i;
const TACTIQ_BODY_REGEX = /Participants:|tactiq\.io|fireflies|granola/i;
const GENERIC_SPEAKER_REGEX = /(^|\n)[A-ZÀ-Ý][\wÀ-ÿ '.\-]{1,60}:\s/;
const LONG_THRESHOLD = 1500;
const MIN_SPEAKER_HITS = 4;

function countMatches(text: string, regex: RegExp): number {
  // regex precisa ter flag /g
  return (text.match(regex) ?? []).length;
}

/**
 * Retorna o source **efetivo** de um feedback, promovendo `manual`/null para
 * `transcription` quando o conteúdo é claramente uma transcrição importada.
 * Sources já confiáveis (`recall_bot`, `slack`, `slack_ambient`, `transcription`,
 * `magic_paste`) são preservados.
 */
export function detectEffectiveSource(
  source: string | null | undefined,
  content: string | null | undefined,
): string {
  const body = content ?? '';
  const current = source ?? '';
  if (current && current !== 'manual') return current;
  if (!body) return current || 'manual';

  if (TACTIQ_HEADER_REGEX.test(body) && TACTIQ_BODY_REGEX.test(body)) {
    return 'transcription';
  }
  if (countMatches(body, TIMESTAMPED_SPEAKER_REGEX) >= MIN_SPEAKER_HITS) {
    return 'transcription';
  }
  if (countMatches(body, BOLD_SPEAKER_REGEX) >= MIN_SPEAKER_HITS) {
    return 'transcription';
  }
  if (body.length > LONG_THRESHOLD && GENERIC_SPEAKER_REGEX.test(body)) {
    return 'transcription';
  }
  return current || 'manual';
}

/**
 * Detecta se um feedback se comporta como transcrição (formato falado /
 * conteúdo longo) e portanto merece a visão rica com TL;DR + chat.
 */
export function isTranscriptLike(
  source: string | null | undefined,
  content: string | null | undefined,
): boolean {
  const effective = detectEffectiveSource(source, content);
  return effective === 'recall_bot' || effective === 'transcription';
}

export function getDiarySourceMeta(
  source: string | null | undefined,
  content: string | null | undefined,
): DiarySourceMeta | null {
  const effective = detectEffectiveSource(source, content);

  if (effective === 'recall_bot') {
    return {
      kind: 'recall_bot',
      label: 'Bot',
      icon: Bot,
      badgeClass:
        'bg-indigo-50 text-indigo-800 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-900',
    };
  }
  if (effective === 'transcription') {
    // Distingue upload curto (anotação textual longa porém estruturada) de
    // transcrição falada de fato.
    const body = content ?? '';
    const speakerHeavy =
      countMatches(body, TIMESTAMPED_SPEAKER_REGEX) >= MIN_SPEAKER_HITS ||
      countMatches(body, BOLD_SPEAKER_REGEX) >= MIN_SPEAKER_HITS ||
      TACTIQ_HEADER_REGEX.test(body);
    return speakerHeavy
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
  if (effective === 'slack' || effective === 'slack_activity_rollup' || effective === 'slack_ambient') {
    return {
      kind: 'slack',
      label: 'Slack',
      icon: SlackIcon,
      badgeClass:
        'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
    };
  }
  // Nota manual real (curta, sem padrão de fala).
  return {
    kind: 'manual',
    label: 'Nota',
    icon: PenLine,
    badgeClass: 'bg-muted text-foreground/70 border-border',
  };
}
