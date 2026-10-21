import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { buildSignalsBlock } from "./signals.ts";
Deno.test("sem cartões aceitos, prompt não muda", () => {
  assertEquals(buildSignalsBlock([]), "");
  assertEquals(buildSignalsBlock([{ kind: "delivery", title: "X", suggested_text: "y", status: "pending" }]), "");
});
Deno.test("cartões omitidos ficam fora", () => {
  const out = buildSignalsBlock([
    { kind: "delivery", title: "Entregou POC", suggested_text: "a [doc:1]", status: "accepted" },
    { kind: "unblock", title: "Omitido", suggested_text: "b", status: "skipped" },
    { kind: "network", title: "Rede", suggested_text: "c", final_text: "editado", status: "edited" },
  ]);
  assertStringIncludes(out, "[Entrega] Entregou POC: a [doc:1]");
  assertStringIncludes(out, "[Rede] Rede: editado");
  assertEquals(out.includes("Omitido"), false);
});
