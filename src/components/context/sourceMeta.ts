// Sprint 8.2 — Mapping of context_evidence.source_table → human label / icon / color.
// Used by CitationChip and EvidenceDrawer.
import {
  FileText,
  Mic,
  MessageSquare,
  Sparkles,
  HeartHandshake,
  Target,
  ClipboardCheck,
  BellRing,
  type LucideIcon,
} from 'lucide-react';

export interface SourceMeta {
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for badge background + text. Uses semantic tokens / soft palette. */
  badgeClass: string;
}

const DEFAULT_META: SourceMeta = {
  label: 'Evidência',
  icon: FileText,
  badgeClass: 'bg-muted text-foreground/70',
};

const MAP: Record<string, SourceMeta> = {
  feedbacks: {
    label: 'Diário',
    icon: FileText,
    badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  },
  meeting_transcripts: {
    label: 'Recall.ai',
    icon: Mic,
    badgeClass: 'bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200',
  },
  slack_ambient_evidence: {
    label: 'Slack',
    icon: MessageSquare,
    badgeClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  },
  kudos: {
    label: 'Kudo',
    icon: HeartHandshake,
    badgeClass: 'bg-pink-50 text-pink-800 dark:bg-pink-950/40 dark:text-pink-200',
  },
  member_prompts: {
    label: 'Pulse',
    icon: Sparkles,
    badgeClass: 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
  },
  pulse_surveys: {
    label: 'Pulse Survey',
    icon: Sparkles,
    badgeClass: 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200',
  },
  goals: {
    label: 'Meta',
    icon: Target,
    badgeClass: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200',
  },
  performance_reviews: {
    label: 'Avaliação',
    icon: ClipboardCheck,
    badgeClass: 'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200',
  },
  leader_nudges: {
    label: 'Nudge',
    icon: BellRing,
    badgeClass: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200',
  },
};

export function getSourceMeta(sourceTable: string | null | undefined): SourceMeta {
  if (!sourceTable) return DEFAULT_META;
  return MAP[sourceTable] ?? DEFAULT_META;
}
