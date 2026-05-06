// Frontend mirror of supabase/functions/_shared/rhy-voice.ts.
// Renders network signals as human, Rhy-style sentences.
// This file lives in @/lib so React components can render copy without
// calling an edge function for every chip.

import type { PulseSignal, SignalType, SignalSeverity } from '@/hooks/useTeamPulse';

const firstName = (full: string | null) => (full ?? 'Esta pessoa').split(/\s+/)[0];

function pct(n: unknown): string {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return '';
  return `${Math.round(Math.abs(v) * 100)}%`;
}

export function signalToRhyText(s: PulseSignal): string {
  const name = firstName(s.member_name);
  const p = s.payload ?? {};

  switch (s.signal_type) {
    case 'isolate':
      return `Reparei que a ${name} andou bem mais quieta nos canais nas últimas semanas. Pode ser só foco em algo isolado, mas se fizer sentido, talvez valha um café com ela.`;
    case 'pattern_drop': {
      const delta = pct((p as { delta_pct?: number }).delta_pct);
      return `Coisa rápida: a troca da ${name} com o time esfriou ${delta ? `cerca de ${delta} ` : ''}comparado ao mês anterior. Pode ser ciclo natural, mas quis te avisar.`;
    }
    case 'pattern_spike':
      return `${name} tem aparecido bem mais nas conversas do time ultimamente. Bom sinal, talvez valha reconhecer na próxima 1:1.`;
    case 'super_connector':
      return `A ${name} virou um ponto de referência no time, muita gente troca com ela. Vale ficar de olho na carga e no que ela precisa pra continuar nesse ritmo.`;
    default:
      return `${name}: notei algo no padrão, vale conversar.`;
  }
}

export function signalAccent(type: SignalType, severity: SignalSeverity): string {
  if (severity === 'attention') return 'bg-rose-500';
  if (severity === 'watch') return 'bg-amber-500';
  if (type === 'super_connector' || type === 'pattern_spike') return 'bg-emerald-500';
  return 'bg-muted-foreground';
}

export function signalLabel(type: SignalType): string {
  switch (type) {
    case 'isolate':
      return 'Mais quieto';
    case 'super_connector':
      return 'Muito procurado';
    case 'pattern_drop':
      return 'Troca esfriou';
    case 'pattern_spike':
      return 'Subiu bem';
  }
}
