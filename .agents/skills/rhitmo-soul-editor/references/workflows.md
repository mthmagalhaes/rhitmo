# Workflows

## 1. Editar bloco existente (caso mais comum)

Ex.: ajustar tom em `03-tone-and-format.md` ou endurecer guardrail em `01-guardrails.md`.

1. Edita o `.md`.
2. Roda o checklist do SKILL.md (regen-docs → regen-snapshots → revisar diff → loader_test).
3. Lê o diff de `__snapshots__/*.txt` — confirme que web e slack mudaram do jeito esperado e que **nenhum bloco que você não tocou apareceu no diff**.
4. Commit: `.md` + `docs.generated.ts` + snapshots.

Não tocar `loader.ts` nem `regen-docs.ts FILES`.

## 2. Adicionar novo modo

Ex.: criar `modes/peer-review-self.md`.

1. Cria `supabase/functions/_shared/soul/modes/X.md` com frontmatter:
   ```yaml
   ---
   id: peer-review-self
   applies_to: [peer-review]
   extends: [memory]   # opcional — só se precisar de 07-memory/08-disc
   version: 1
   ---
   ```
2. Em `loader.ts`:
   - Adiciona `"X"` no type `Mode`.
   - Adiciona entrada em `MODE_BLOCKS` com a ordem canônica de blocos base + `"modes/X.md"` no final.
3. Em `regen-docs.ts`: adiciona `"modes/X.md"` no array `FILES` **na ordem alfabética dentro da seção**.
4. (Opcional) Em `regen-snapshots.ts`: adiciona `{ mode: "X", channel: "web" }` e `{ mode: "X", channel: "slack" }` em `CASES` se for um modo crítico que merece snapshot.
5. Roda o checklist.
6. No consumer (edge function) que vai usar o novo modo: chama `composeSystemPrompt({ mode: "X", channel, vars, appendices })`.

## 3. Adicionar novo canal

Ex.: `channels/email.md`.

1. Cria `channels/X.md` (regras de formatação do canal).
2. Em `loader.ts`: adiciona `"X"` no type `Channel` e entrada `X: "channels/X.md"` em `CHANNEL_BLOCK`.
3. Em `regen-docs.ts`: adiciona `"channels/X.md"` no array `FILES`.
4. Roda o checklist.

## 4. Migrar edge function com prompt inline

Alvo: as 6 pendentes (`generate-brief`, `generate-formal-review`, `meu-rhitmo`, `self-reflection`, `slack-rhitmo-orchestrator`, `briefGenerator.ts`).

1. Identifica qual `mode` da alma faz sentido. Se nenhum encaixa, **crie um modo novo** (workflow 2) — não force um existente.
2. Extrai vars dinâmicas do prompt inline → mapeia para `{{var}}` no `.md`.
3. Extrai dados de RAG / evidências → passa via `appendices: string[]`.
4. Substitui o bloco de prompt inline por:
   ```ts
   import { composeSystemPrompt } from "../_shared/soul/loader.ts";
   const systemPrompt = await composeSystemPrompt({
     mode: "leader-self",
     channel: "web",
     vars: { firstName, managerName, ... },
     appendices: [ragContext, temporalContext],
   });
   ```
5. Remove import de `_shared/rhitmo-constitution.ts` se houver (DEPRECATED).
6. Testa: roda a edge function localmente e compara a saída antes/depois para um caso real.
7. Atualiza `mem://ai/soul-centralizada-md` removendo a function da lista "A migrar".

## Hotfix urgente em produção

Se precisar mudar comportamento da Rhitmo agora:
1. Edita o `.md` certo.
2. **Sempre** roda regen-docs antes do deploy — sem isso o bundle vai velho.
3. Pode pular `regen-snapshots` se for emergência, mas abre PR de follow-up no mesmo dia regenerando + revisando snapshot.
