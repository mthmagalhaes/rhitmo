// Onda 4.5 — Tabela de preços por 1M tokens (USD). Estimativas para
// observabilidade interna. NÃO é fonte da verdade — a fatura real vem
// do gateway/Lovable. Atualize conforme provider mudar tabela pública.

export interface PriceEntry {
  in: number; // USD per 1M input tokens
  out: number; // USD per 1M output tokens
}

const PRICES: Record<string, PriceEntry> = {
  // Google Gemini
  "google/gemini-2.5-pro": { in: 1.25, out: 10.0 },
  "google/gemini-2.5-flash": { in: 0.30, out: 2.50 },
  "google/gemini-2.5-flash-lite": { in: 0.10, out: 0.40 },
  "google/gemini-3.1-pro-preview": { in: 1.25, out: 10.0 },
  "google/gemini-3-flash-preview": { in: 0.30, out: 2.50 },
  // OpenAI GPT-5 family
  "openai/gpt-5": { in: 1.25, out: 10.0 },
  "openai/gpt-5-mini": { in: 0.25, out: 2.0 },
  "openai/gpt-5-nano": { in: 0.05, out: 0.40 },
  "openai/gpt-5.2": { in: 1.50, out: 12.0 },
};

export function estimateCostUsd(model: string, tokensIn = 0, tokensOut = 0): number | null {
  const p = PRICES[model];
  if (!p) return null;
  const cost = (tokensIn / 1_000_000) * p.in + (tokensOut / 1_000_000) * p.out;
  // Round to 6 decimals (sub-cent precision)
  return Math.round(cost * 1_000_000) / 1_000_000;
}
