import { ptBR, enUS, es } from 'date-fns/locale';
import i18n from '@/i18n';

export const getDateLocale = (lang?: string) => {
  const l = lang || i18n.language;
  if (l.startsWith('en')) return enUS;
  if (l.startsWith('es')) return es;
  return ptBR;
};

/**
 * Resolve a BCP-47 locale tag from the i18n language code.
 * Used by Intl.DateTimeFormat (which doesn't accept date-fns Locale objects).
 */
function resolveIntlLocale(lang?: string): string {
  const l = (lang || i18n.language || 'pt-BR').toLowerCase();
  if (l.startsWith('en')) return 'en-US';
  if (l.startsWith('es')) return 'es-ES';
  return 'pt-BR';
}

/**
 * Format a `period_month` string (YYYY-MM-DD — always the 1st of the month,
 * stored in UTC by the backend) as "March 2026" / "março 2026", locked to
 * UTC so it never shifts to the previous month in browsers west of UTC
 * (Brasília, US, etc).
 *
 * Why not date-fns `format`? `format()` always renders in the local browser
 * timezone, so `new Date('2026-03-01T00:00:00Z')` in BRT (UTC-3) becomes
 * `2026-02-28 21:00` and is formatted as "fevereiro 2026" — the bug we fix.
 */
function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

export function formatPeriodMonth(periodMonth: string, lang?: string): string {
  const [y, m] = periodMonth.slice(0, 10).split('-').map(Number);
  if (!y || !m) return periodMonth;
  const raw = new Intl.DateTimeFormat(resolveIntlLocale(lang), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)));
  // Capitalize ONLY the first letter — never use CSS `capitalize`, which would
  // also uppercase connector words ("Março **D**e 2026" 🤮).
  return capitalizeFirst(raw);
}

/**
 * Format the current-month label ("Abril de 2026") with the same
 * first-letter-only capitalization rule as `formatPeriodMonth`.
 */
export function formatMonthYearLabel(date: Date, lang?: string): string {
  const raw = new Intl.DateTimeFormat(resolveIntlLocale(lang), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
  return capitalizeFirst(raw);
}

/**
 * Format an evidence date (`YYYY-MM-DD` or full ISO) as `dd/MM`, locked to
 * UTC so a date stored as `2026-03-01` doesn't display as `28/02` in BRT.
 *
 * For date-only strings we anchor at noon UTC to dodge any extreme-timezone
 * day rollover; for full ISO strings we trust the source instant.
 */
export function formatEvidenceDate(iso: string, lang?: string): string {
  if (!iso) return '';
  const d = iso.length <= 10 ? new Date(iso + 'T12:00:00Z') : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(resolveIntlLocale(lang), {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(d);
}
