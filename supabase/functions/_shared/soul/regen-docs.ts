// Regenera `docs.generated.ts` a partir dos .md desta pasta.
// Rode sempre que editar qualquer arquivo da alma:
//
//   deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-docs.ts
//
// O bundle das edge functions publicadas NÃO expõe os .md no filesystem,
// por isso o loader em runtime lê de `SOUL_DOCS` (export deste arquivo).

const FILES = [
  "00-identity.md",
  "01-guardrails.md",
  "02-analysis-matrix.md",
  "03-tone-and-format.md",
  "04-drafting.md",
  "05-citations.md",
  "06-identity-protocol.md",
  "modes/leader-member.md",
  "modes/leader-self.md",
  "modes/member-self.md",
  "modes/one-on-one-prep.md",
  "modes/pulse-survey.md",
  "modes/self-review.md",
  "channels/web.md",
  "channels/slack.md",
];

const BASE = new URL("./", import.meta.url);

function escapeForTemplate(src: string): string {
  return src
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

const parts: string[] = [
  "// AUTO-GENERATED — do not edit by hand.",
  "// Source: supabase/functions/_shared/soul/**/*.md",
  "// Regenerate with: deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-docs.ts",
  "",
  "export const SOUL_DOCS: Record<string, string> = {",
];

for (const f of FILES) {
  const raw = await Deno.readTextFile(new URL(f, BASE));
  parts.push(`  ${JSON.stringify(f)}: \`${escapeForTemplate(raw)}\`,`);
}
parts.push("};", "");

await Deno.writeTextFile(new URL("./docs.generated.ts", BASE), parts.join("\n"));
console.log(`[soul] wrote docs.generated.ts (${FILES.length} files)`);
