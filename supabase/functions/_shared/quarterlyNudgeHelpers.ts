// Sprint 17 — Helpers shared across the anniversary nudge cron and Slack handlers.
//
// Period suggestion: when the leader hasn't run a Trimestral yet, we suggest the
// last 90 days ending today. When there IS a previous confirmed recap, we suggest
// the window from `previous.period_end` → today (capped at 120 days to avoid
// absurd ranges if the leader skipped many cycles).

export interface SuggestedPeriod {
  period_start: string; // YYYY-MM-DD
  period_end: string;   // YYYY-MM-DD
  period_label: string;
  days_covered: number;
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export function suggestPeriod(
  memberCreatedAt: string,
  lastConfirmedPeriodEnd: string | null,
): SuggestedPeriod {
  const today = new Date();
  const end = today;
  let start: Date;
  if (lastConfirmedPeriodEnd) {
    const last = new Date(lastConfirmedPeriodEnd + 'T00:00:00Z');
    const diffDays = Math.round((end.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 120) start = addDays(end, -90);
    else start = last;
  } else {
    // First-ever: anchor to membership start, capped at 90 days
    const created = new Date(memberCreatedAt);
    const diffDays = Math.round((end.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    start = diffDays > 90 ? addDays(end, -90) : created;
  }
  const period_start = toDateOnly(start);
  const period_end = toDateOnly(end);
  const days_covered = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const fmt = (s: string) =>
    new Date(s + 'T00:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const period_label = `Últimos ${days_covered} dias (${fmt(period_start)} – ${fmt(period_end)})`;
  return { period_start, period_end, period_label, days_covered };
}

export function buildAnniversaryDmBlocks(
  memberName: string,
  memberId: string,
  daysSinceCreation: number,
  daysSinceLastQuarterly: number | null,
  suggested: SuggestedPeriod,
): unknown[] {
  const intro =
    daysSinceLastQuarterly === null
      ? `Já se passaram *${daysSinceCreation} dias* desde que *${memberName}* entrou no seu time e ainda não temos um *Rhitmo Trimestral* dele(a).`
      : `Já se passaram *${daysSinceLastQuarterly} dias* desde o último *Rhitmo Trimestral* de *${memberName}*.`;
  const buttonValue = JSON.stringify({
    member_id: memberId,
    period_start: suggested.period_start,
    period_end: suggested.period_end,
    period_label: suggested.period_label,
  });
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🌀 ${intro}\n\nQuer que eu gere agora cobrindo *${suggested.period_label}*? É só responder *sim* aqui mesmo ou clicar abaixo.`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          style: 'primary',
          text: { type: 'plain_text', text: '✨ Gerar agora' },
          action_id: 'generate_quarterly_confirm',
          value: buttonValue,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Mais tarde' },
          action_id: 'generate_quarterly_dismiss',
          value: memberId,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Abrir no Rhitmo' },
          url: `https://rhitmo.co/lider/avaliacoes?member=${memberId}&suggest=quarterly&start=${suggested.period_start}&end=${suggested.period_end}`,
          action_id: 'open_quarterly_in_app',
        },
      ],
    },
  ];
}

// Compact summary for posting back to Slack after generation.
export function buildQuarterlyResultBlocks(
  memberName: string,
  recapId: string,
  highlights: Array<{ title: string; detail: string }>,
  classification: string | null,
  turnoverRisk: string | null,
): unknown[] {
  const top = (highlights ?? []).slice(0, 3);
  const bullets = top.length
    ? top.map((h) => `• *${h.title}* — ${h.detail}`).join('\n')
    : '_(sem destaques estruturados — abra no app para revisar)_';
  const meta: string[] = [];
  if (classification) meta.push(`📊 ${classification}`);
  if (turnoverRisk) meta.push(`⚠️ risco ${turnoverRisk}`);
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✅ *Rhitmo Trimestral de ${memberName}* gerado.\n\n${bullets}`,
      },
    },
    ...(meta.length
      ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: meta.join('   ·   ') }] }]
      : []),
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          style: 'primary',
          text: { type: 'plain_text', text: '🚀 Calibrar no Rhitmo' },
          url: `https://rhitmo.co/lider/avaliacoes?recap=${recapId}`,
          action_id: 'open_recap_in_app',
        },
      ],
    },
  ];
}
