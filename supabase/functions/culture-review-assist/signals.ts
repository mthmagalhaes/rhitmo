// Bloco de sinais aceitos usado na montagem do Rascunho Geral.
// deno-lint-ignore-file no-explicit-any
const SIGNAL_LABEL: Record<string, string> = { delivery: "Entrega", unblock: "Bloqueio", recognition: "Reconhecimento", network: "Rede" };
/** Sem cartões aceitos = string vazia (prompt idêntico ao anterior). */
export function buildSignalsBlock(cards: any[]): string {
  const used = cards.filter((c) => (c.status === "accepted" || c.status === "edited") && (c.final_text || c.suggested_text));
  if (!used.length) return "";
  return `\n\nSINAIS ACEITOS PELO LÍDER (Slack e rede):\n${used.map((c) => `- [${SIGNAL_LABEL[c.kind] ?? c.kind}] ${c.title}: ${(c.final_text || c.suggested_text).trim()}`).join("\n")}`;
}
