/**
 * Matriz de "próxima ação" do Rhitmo Trimestral.
 *
 * Cada classificação tem 3 opções pré-definidas. As chaves são estáveis
 * (usadas em DB) e as labels são internacionalizadas via i18n
 * (`quarterlyRecap.actions.<key>`).
 *
 * Fonte: canvas anexado pelo time de produto — "Por classificação".
 */
export type RecapClassification =
  | 'precisa_subir'
  | 'dentro_esperado'
  | 'subindo_barra'
  | 'acima_esperado';

export type RecapTurnoverRisk = 'low' | 'medium' | 'high';

export const ACTIONS_BY_CLASSIFICATION: Record<RecapClassification, string[]> = {
  precisa_subir: [
    'improvement_plan_30_60_90',
    'direct_conversation',
    'increase_1on1_frequency',
  ],
  dentro_esperado: [
    'define_new_challenge',
    'public_recognition',
    'growth_conversation',
  ],
  subindo_barra: [
    'high_visibility_project',
    'promotion_path_conversation',
    'stakeholder_exposure',
  ],
  acima_esperado: [
    'anticipate_promotion',
    'protect_from_overload',
    'external_mentorship',
  ],
};

export const ALL_ACTION_KEYS: string[] = Object.values(ACTIONS_BY_CLASSIFICATION).flat();

export const CLASSIFICATIONS: RecapClassification[] = [
  'precisa_subir',
  'dentro_esperado',
  'subindo_barra',
  'acima_esperado',
];

export const TURNOVER_RISKS: RecapTurnoverRisk[] = ['low', 'medium', 'high'];
