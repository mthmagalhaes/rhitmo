import { assertEquals } from "jsr:@std/assert@1";
import { assessableItems, scaleLevels, type OrgContext } from "./orgContext.ts";

const ctx: OrgContext = {
  versionId: "v1",
  version: 1,
  items: [
    { id: "val1", kind: "value", category_label: null, parent_id: null, title: "Dono do resultado", description: null, examples: null, position: 1 },
    { id: "beh1", kind: "behavior", category_label: null, parent_id: "val1", title: "Entrega o que promete", description: null, examples: null, position: 2 },
    { id: "beh2", kind: "behavior", category_label: null, parent_id: null, title: "Pede ajuda cedo", description: null, examples: null, position: 3 },
    { id: "s1", kind: "scale_level", category_label: null, parent_id: null, title: "Precisa subir", description: null, examples: null, position: 4 },
    { id: "s2", kind: "scale_level", category_label: null, parent_id: null, title: "Acima", description: null, examples: null, position: 5 },
    { id: "c1", kind: "custom", category_label: "Liderança", parent_id: null, title: "Forma pessoas", description: null, examples: null, position: 6 },
  ],
};

Deno.test("guided path: one card per value, loose behavior and extra; linked behaviors stay inside their value", () => {
  const items = assessableItems(ctx);
  assertEquals(items.map((i) => i.id), ["val1", "beh2", "c1"]);
  assertEquals(items[0].behaviors.map((b) => b.id), ["beh1"]);
});

Deno.test("company scale levels come from the published version in order", () => {
  assertEquals(scaleLevels(ctx), ["Precisa subir", "Acima"]);
  assertEquals(scaleLevels(null), []);
});

import { matchValueTitle, sortScaleLevels } from "./orgContext.ts";
Deno.test("comportamento liga ao valor por título tolerante", () => {
  const vals = ["Integridade", "Parceria", "Eficiência"];
  assertEquals(matchValueTitle(vals, "eficiencia"), "Eficiência");
  assertEquals(matchValueTitle(vals, "Valor: Parceria"), "Parceria");
  assertEquals(matchValueTitle(vals, "Tenacidade"), null);
});
Deno.test("régua ordena do mais baixo ao mais alto", () => {
  const r = sortScaleLevels([{ title: "Supera", order: 4 }, { title: "Não atende", order: 1 }, { title: "Atende", order: 3 }, { title: "Parcial", order: 2 }]);
  assertEquals(r.map((x) => x.title), ["Não atende", "Parcial", "Atende", "Supera"]);
});
