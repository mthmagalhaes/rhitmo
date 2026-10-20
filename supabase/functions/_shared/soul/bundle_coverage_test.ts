// Garante que todo .md de modes/ e channels/ está no bundle publicado.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { SOUL_DOCS } from "./docs.generated.ts";

Deno.test("todo .md de modes/ e channels/ está em SOUL_DOCS", () => {
  for (const dir of ["modes", "channels"]) {
    for (const f of Deno.readDirSync(new URL(`./${dir}/`, import.meta.url))) {
      if (!f.name.endsWith(".md")) continue;
      const key = `${dir}/${f.name}`;
      assert(key in SOUL_DOCS, `${key} fora do bundle: adicione em regen-docs.ts e regenere`);
    }
  }
});
