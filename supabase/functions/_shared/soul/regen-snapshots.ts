// Regenera os snapshots dos prompts compilados em ./__snapshots__/.
//
// Use:
//   deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-snapshots.ts
//
// Após qualquer edição intencional em algum .md desta pasta, rode o script,
// revise o diff dos .txt no PR e commit junto com a mudança da alma.

import { composeSystemPrompt, type Mode } from "./loader.ts";

const VARS = {
  memberName: "Gabriela Souza",
  firstName: "Gabriela",
  managerName: "Matheus Magalhães",
  managerFirstName: "Matheus",
  memberRole: "Tech Lead",
  leaderName: "Matheus Magalhães",
  leaderFirstName: "Matheus",
  redirectInstruction: "(redirect placeholder)",
  directReportsList: "- Gabriela Souza (Tech Lead)",
  leaderProfileSection: "(perfil placeholder)",
  teamPatternsSummary: "(padrões placeholder)",
  recentReflections: "(reflexões placeholder)",
};

const CASES: Array<{ mode: Mode; channel: "web" | "slack" }> = [
  { mode: "leader-member", channel: "web" },
  { mode: "leader-member", channel: "slack" },
  { mode: "member-self", channel: "web" },
  { mode: "member-self", channel: "slack" },
];

const dir = new URL("./__snapshots__/", import.meta.url);
try {
  await Deno.mkdir(dir, { recursive: true });
} catch (_e) { /* ok */ }

for (const { mode, channel } of CASES) {
  const compiled = await composeSystemPrompt({ mode, channel, vars: VARS });
  const path = new URL(`./__snapshots__/${mode}.${channel}.txt`, import.meta.url);
  await Deno.writeTextFile(path, compiled);
  console.log(`✓ wrote ${mode}.${channel}.txt (${compiled.length} chars)`);
}

console.log("\nDone. Review the diff and commit the snapshots.");
