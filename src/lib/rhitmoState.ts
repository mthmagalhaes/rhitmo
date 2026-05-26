// Estado do Rhitmo de um liderado, derivado da última atividade.
// A: tem pelo menos 1 recap confirmado (cadência saudável)
// B: tem recap em rascunho mas nenhum confirmado (rascunho pendente, CTA)
// C: sem recap nenhum (vazio)
export type RhitmoState = 'A' | 'B' | 'C';

export interface MinimalRecap {
  status: string;
  period_month: string;
}

export function deriveRhitmoState(recaps: MinimalRecap[]): RhitmoState {
  if (!recaps || recaps.length === 0) return 'C';
  const hasConfirmed = recaps.some((r) => r.status === 'confirmed');
  if (hasConfirmed) return 'A';
  return 'B';
}

export const RHITMO_LABEL: Record<RhitmoState, string> = {
  A: 'Confirmado',
  B: 'Rascunho pendente',
  C: 'Sem histórico',
};

export const RHITMO_TOOLTIP: Record<RhitmoState, string> = {
  A: 'Tem pelo menos 1 mês fechado e revisado por você. Cadência viva.',
  B: 'A Rhitmo já preparou um mês, falta sua revisão e confirmação.',
  C: 'Nenhum Acompanhamento Mensal foi gerado ainda para este liderado.',
};

export const RHITMO_CHIP: Record<RhitmoState, string> = {
  A: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  // âmbar com leve pulse para virar CTA real
  B: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 animate-pulse',
  C: 'bg-muted text-muted-foreground border-border',
};
