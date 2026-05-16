// Estado do Rhitmo de um liderado, derivado da última atividade.
// A: tem pelo menos 1 recap confirmado (cadência saudável)
// B: tem recap em rascunho mas nenhum confirmado (em construção)
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
  B: 'Em construção',
  C: 'Sem Rhitmo',
};

export const RHITMO_CHIP: Record<RhitmoState, string> = {
  A: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  B: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  C: 'bg-muted text-muted-foreground border-border',
};
