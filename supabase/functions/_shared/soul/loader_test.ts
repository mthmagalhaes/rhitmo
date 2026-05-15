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
