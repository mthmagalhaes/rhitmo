// supabase/functions/_shared/soul/loader.ts
//
// Compõe system prompts da Rhitmo a partir dos .md desta pasta.
// Web (chat-mentor) e Slack (slack-bot) DEVEM usar este loader.
//
// Regra de ouro: prompt inline em edge function = bug. Toda mudança de
// comportamento começa por um .md em supabase/functions/_shared/soul/.

// Os .md são embutidos no bundle via `docs.generated.ts` (gerado a partir
// dos arquivos editoriais em soul/**/*.md). Isso evita depender de
// Deno.readTextFile em runtime — o filesystem das edge functions publicadas
// não expõe esses .md como arquivos físicos no caminho do módulo.
import { SOUL_DOCS } from "./docs.generated.ts";

/** Lê um .md do bundle (com cache em memória durante a vida do isolate). */
const cache = new Map<string, string>();
function readDoc(relPath: string): string {
  if (cache.has(relPath)) return cache.get(relPath)!;
  const raw = SOUL_DOCS[relPath];
  if (raw === undefined) {
    throw new Error(
      `[soul/loader] Missing doc "${relPath}" in SOUL_DOCS. ` +
        `Regenere supabase/functions/_shared/soul/docs.generated.ts.`,
    );
  }
  // Remove frontmatter (--- ... ---) — só metadados, não vai no prompt.
  const stripped = raw.replace(/^---[\s\S]*?---\s*\n/, "").trim();
  cache.set(relPath, stripped);
  return stripped;
}

export type Channel = "web" | "slack";

export type Mode =
  | "leader-member"
  | "leader-self"
  | "member-self"
  | "pulse-survey"
  | "one-on-one-prep"
  | "self-review";

/** Ordem canônica dos blocos base por modo. NÃO mudar sem atualizar snapshot. */
const MODE_BLOCKS: Record<Mode, string[]> = {
  "leader-member": [
    "00-identity.md",
    "01-guardrails.md",
    "02-analysis-matrix.md",
    "03-tone-and-format.md",
    "04-drafting.md",
    "05-citations.md",
    "06-identity-protocol.md",
    "modes/leader-member.md",
  ],
  "leader-self": [
    "00-identity.md",
    "01-guardrails.md",
    "03-tone-and-format.md",
    "modes/leader-self.md",
  ],
  "member-self": [
    "00-identity.md",
    "01-guardrails.md",
    "03-tone-and-format.md",
    "05-citations.md",
    "modes/member-self.md",
  ],
  "pulse-survey": [
    "00-identity.md",
    "01-guardrails.md",
    "modes/pulse-survey.md",
  ],
  "one-on-one-prep": [
    "00-identity.md",
    "01-guardrails.md",
    "03-tone-and-format.md",
    "05-citations.md",
    "modes/one-on-one-prep.md",
  ],
  "self-review": [
    "00-identity.md",
    "01-guardrails.md",
    "modes/self-review.md",
  ],
};

const CHANNEL_BLOCK: Record<Channel, string> = {
  web: "channels/web.md",
  slack: "channels/slack.md",
};

export interface ComposeOptions {
  mode: Mode;
  channel: Channel;
  /** Substituições simples {{var}} no texto compilado. Valores undefined viram string vazia. */
  vars?: Record<string, string | undefined | null>;
  /** Texto extra apendado ao final (evidências, dados de RAG, contexto temporal). */
  appendices?: string[];
}

/** Substitui {{var}} pelos valores. Mantém a chave se a var não estiver no map (debug). */
function interpolate(text: string, vars: Record<string, string | undefined | null>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return `{{${key}}}`;
    return String(v);
  });
}

/** Compõe o system prompt final. */
export async function composeSystemPrompt(opts: ComposeOptions): Promise<string> {
  const blocks = MODE_BLOCKS[opts.mode];
  if (!blocks) throw new Error(`Unknown mode: ${opts.mode}`);

  const channelBlock = CHANNEL_BLOCK[opts.channel];
  if (!channelBlock) throw new Error(`Unknown channel: ${opts.channel}`);

  const parts: string[] = ["# RHITMO — CONSTITUIÇÃO"];

  for (const b of blocks) parts.push(await readDoc(b));
  parts.push(await readDoc(channelBlock));

  const compiled = parts.join("\n\n---\n\n");
  const interpolated = opts.vars ? interpolate(compiled, opts.vars) : compiled;

  if (opts.appendices && opts.appendices.length) {
    return interpolated + "\n\n---\n\n" + opts.appendices.join("\n\n---\n\n");
  }
  return interpolated;
}

/** Snapshot de quais blocos um modo carrega — usado pelo teste de paridade. */
export function blocksForMode(mode: Mode): string[] {
  return [...MODE_BLOCKS[mode]];
}

/** Permite o teste limpar o cache entre rodadas. */
export function _clearSoulCache() {
  cache.clear();
}
