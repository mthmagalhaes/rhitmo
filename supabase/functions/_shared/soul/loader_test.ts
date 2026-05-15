// Teste de paridade web↔slack para a constituição da Rhitmo.
// Garante que cada modo carrega o mesmo conjunto de blocos de alma em
// ambos os canais — só a formatação muda.

import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { blocksForMode, composeSystemPrompt, type Mode } from "./loader.ts";

const MODES: Mode[] = [
  "leader-member",
  "leader-self",
  "member-self",
  "pulse-survey",
  "one-on-one-prep",
  "self-review",
];

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

Deno.test("soul: each mode produces non-empty prompts in both channels", async () => {
  for (const mode of MODES) {
    const web = await composeSystemPrompt({ mode, channel: "web", vars: VARS });
    const slack = await composeSystemPrompt({ mode, channel: "slack", vars: VARS });
    assert(web.length > 200, `web prompt for ${mode} is too short`);
    assert(slack.length > 200, `slack prompt for ${mode} is too short`);
  }
});

Deno.test("soul: web and slack share the same base blocks per mode", async () => {
  for (const mode of MODES) {
    const blocks = blocksForMode(mode);
    // Each mode must include identity + guardrails. These are non-negotiable.
    assert(blocks.includes("00-identity.md"), `${mode} missing identity`);
    assert(blocks.includes("01-guardrails.md"), `${mode} missing guardrails`);
  }
});

Deno.test("soul: channel block is appended last and is different web vs slack", async () => {
  const web = await composeSystemPrompt({ mode: "leader-member", channel: "web", vars: VARS });
  const slack = await composeSystemPrompt({ mode: "leader-member", channel: "slack", vars: VARS });

  assert(web.includes("FORMATAÇÃO PARA WEB"), "web channel block missing");
  assert(slack.includes("FORMATAÇÃO PARA SLACK"), "slack channel block missing");
  assert(!web.includes("FORMATAÇÃO PARA SLACK"), "web prompt leaked slack block");
  assert(!slack.includes("FORMATAÇÃO PARA WEB"), "slack prompt leaked web block");
});

Deno.test("soul: identity protocol vars are interpolated", async () => {
  const prompt = await composeSystemPrompt({
    mode: "leader-member",
    channel: "web",
    vars: VARS,
  });
  assert(prompt.includes("Gabriela Souza"), "memberName not interpolated");
  assert(prompt.includes("Matheus"), "managerFirstName not interpolated");
  assert(!prompt.includes("{{memberName}}"), "stale memberName placeholder");
});

Deno.test("soul: appendices are concatenated after the constitution", async () => {
  const prompt = await composeSystemPrompt({
    mode: "leader-member",
    channel: "web",
    vars: VARS,
    appendices: ["## EVIDÊNCIAS\n\n- exemplo de evidência"],
  });
  const idxConstitution = prompt.indexOf("CONSTITUIÇÃO");
  const idxEvidence = prompt.indexOf("EVIDÊNCIAS");
  assert(idxConstitution >= 0 && idxEvidence > idxConstitution, "appendix not after constitution");
});

Deno.test("soul: leader-self does NOT include identity-protocol or drafting", async () => {
  const blocks = blocksForMode("leader-self");
  assertEquals(blocks.includes("06-identity-protocol.md"), false);
  assertEquals(blocks.includes("04-drafting.md"), false);
});

Deno.test("soul: leader-member includes drafting + identity-protocol + analysis-matrix", async () => {
  const blocks = blocksForMode("leader-member");
  assert(blocks.includes("04-drafting.md"));
  assert(blocks.includes("06-identity-protocol.md"));
  assert(blocks.includes("02-analysis-matrix.md"));
});

// --- Sprint atual: paridade ampliada (3 casos novos) ---

Deno.test("soul: member-self on slack contains slack channel block, not web", async () => {
  const slack = await composeSystemPrompt({ mode: "member-self", channel: "slack", vars: VARS });
  assert(slack.includes("MEU RHITMO"), "member-self mode block missing");
  assert(slack.includes("FORMATAÇÃO PARA SLACK"), "slack channel block missing");
  assert(!slack.includes("FORMATAÇÃO PARA WEB"), "web channel leaked into slack");
});

Deno.test("soul: leader-member on slack inherits drafting + citations + identity-protocol with slack format", async () => {
  const slack = await composeSystemPrompt({ mode: "leader-member", channel: "slack", vars: VARS });
  // Conteúdo das almas base presente
  assert(slack.includes("GERADOR DE RASCUNHOS") || slack.includes("RASCUNHO"), "drafting block missing");
  assert(slack.includes("[doc:"), "citations protocol missing");
  assert(slack.includes("PROTOCOLO") || slack.includes("PROTAGONISTA"), "identity-protocol missing");
  // Formato Slack vence (sem H3 markdown como instrução de saída)
  assert(slack.includes("FORMATAÇÃO PARA SLACK"), "slack channel block missing");
});

Deno.test("soul: missing vars keep {{placeholder}} for debugging", async () => {
  const prompt = await composeSystemPrompt({
    mode: "leader-self",
    channel: "web",
    vars: { leaderName: "Matheus", leaderFirstName: "Matheus" }, // omite directReportsList etc.
  });
  assert(prompt.includes("Matheus"), "leaderName not interpolated");
  assert(prompt.includes("{{directReportsList}}"), "missing var should stay visible for debug");
});

// --- Snapshots: drift detection ---
//
// Snapshots vivem em ./__snapshots__/<mode>.<channel>.txt e são gerados via
// `deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-snapshots.ts`.
// Mudança intencional em qualquer .md exige regenerar e revisar o diff.

const SNAPSHOT_CASES: Array<{ mode: Mode; channel: "web" | "slack" }> = [
  { mode: "leader-member", channel: "web" },
  { mode: "leader-member", channel: "slack" },
  { mode: "member-self", channel: "web" },
  { mode: "member-self", channel: "slack" },
];

Deno.test("soul: compiled prompts match committed snapshots", async () => {
  for (const { mode, channel } of SNAPSHOT_CASES) {
    const compiled = await composeSystemPrompt({ mode, channel, vars: VARS });
    const url = new URL(`./__snapshots__/${mode}.${channel}.txt`, import.meta.url);
    let snapshot = "";
    try {
      snapshot = await Deno.readTextFile(url);
    } catch (_e) {
      throw new Error(
        `Missing snapshot ${mode}.${channel}.txt — run regen-snapshots.ts to create it.`,
      );
    }
    assertEquals(
      compiled,
      snapshot,
      `Snapshot drift in ${mode}.${channel}. If intentional, run regen-snapshots.ts.`,
    );
  }
});
