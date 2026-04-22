// Smart Tags Configuration - Shared between creation and display components
// Tag KEYS stay in PT-BR (persisted in DB). Display labels are i18n-resolved
// via getTagLabel(key, t).
import i18n from '@/i18n';

export const TAG_CONFIG: Record<string, { emoji: string; color: string; i18nKey: string }> = {
  "1:1": {
    emoji: "🎯",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    i18nKey: "tags.1on1",
  },
  "PDI": {
    emoji: "🚀",
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
    i18nKey: "tags.pdi",
  },
  "Feedback Difícil": {
    emoji: "🚨",
    color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    i18nKey: "tags.feedbackHard",
  },
  "Check-in": {
    emoji: "✅",
    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
    i18nKey: "tags.checkin",
  },
  "Reunião Geral": {
    emoji: "📢",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800",
    i18nKey: "tags.generalMeeting",
  },
  "Brainstorming": {
    emoji: "🧠",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    i18nKey: "tags.brainstorming",
  },
  "Oportunidade de Melhoria": {
    emoji: "⚠️",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    i18nKey: "tags.improvement",
  },
  "Destaque Positivo": {
    emoji: "⭐",
    color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    i18nKey: "tags.highlight",
  },
  "Risco": {
    emoji: "🔴",
    color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    i18nKey: "tags.risk",
  },
};

export const VALID_TAGS = Object.keys(TAG_CONFIG);

export const getTagEmoji = (tag: string): string => {
  return TAG_CONFIG[tag]?.emoji || "📝";
};

export const getTagColor = (tag: string): string => {
  return TAG_CONFIG[tag]?.color || "bg-muted text-muted-foreground";
};

/**
 * Resolve the localized display label for a tag key.
 * Falls back to the raw key if i18n key is missing.
 */
export const getTagLabel = (tag: string): string => {
  const cfg = TAG_CONFIG[tag];
  if (!cfg) return tag;
  const translated = i18n.t(cfg.i18nKey);
  // i18next returns the key itself when missing — fallback to PT-BR key
  return translated && translated !== cfg.i18nKey ? translated : tag;
};
