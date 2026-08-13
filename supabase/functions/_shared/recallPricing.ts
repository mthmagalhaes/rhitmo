// Custos reais do Recall.ai — calibrados pela fatura V1R4A6KP-0006 (Jul/2026).
// Fonte da verdade para o relatório de custos do admin.

export const RECALL_MACHINE_USD_PER_HOUR = 0.50;
export const RECALL_TRANSCRIPTION_USD_PER_HOUR = 0.15;
/** Storage + playback: ~16% da fatura de julho. Aplicado como uplift sobre o custo direto. */
export const RECALL_STORAGE_UPLIFT = 0.16;
/** Câmbio USD→BRL usado nas estimativas internas. */
export const USD_BRL = 5.80;

export interface RecallCostInput {
  machineMinutes: number;
  transcriptionMinutes: number;
}

export function estimateRecallCostUsd({ machineMinutes, transcriptionMinutes }: RecallCostInput): number {
  const direct =
    (machineMinutes / 60) * RECALL_MACHINE_USD_PER_HOUR +
    (transcriptionMinutes / 60) * RECALL_TRANSCRIPTION_USD_PER_HOUR;
  const withStorage = direct * (1 + RECALL_STORAGE_UPLIFT);
  return Math.round(withStorage * 1_000_000) / 1_000_000;
}

export function usdToBrl(usd: number, fx = USD_BRL): number {
  return Math.round(usd * fx * 10_000) / 10_000;
}
