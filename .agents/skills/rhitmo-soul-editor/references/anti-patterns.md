# Anti-Patterns

## 1. Editar `.md` e esquecer `regen-docs.ts`
**Sintoma:** mudança não aparece em produção; loader_test passa local mas Slack/web continuam com texto antigo.
**Causa:** runtime das edge functions publicadas não lê `.md` do filesystem — lê de `docs.generated.ts` (bundle estático).
**Fix:** SEMPRE rodar `deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-docs.ts` após editar qualquer `.md`. Commitar `docs.generated.ts` junto.

## 2. Adicionar modo no `loader.ts` mas não em `regen-docs.ts FILES`
**Sintoma:** erro em runtime `[soul/loader] Missing doc "modes/X.md" in SOUL_DOCS`.
**Causa:** `FILES` no `regen-docs.ts` é a lista explícita do que vira bundle. Faltou registrar.
**Fix:** Adicionar `"modes/X.md"` em `FILES` e rodar `regen-docs.ts`.

## 3. Mudar snapshot sem revisar diff
**Sintoma:** drift silencioso entre web e Slack; comportamento muda em canal não esperado.
**Causa:** snapshot regenerado sem leitura humana do diff.
**Fix:** sempre `git diff supabase/functions/_shared/soul/__snapshots__/` antes de commitar. Se um bloco que você não tocou aparece no diff, investigue antes de aceitar.

## 4. Recriar prompt inline em nova edge function
**Sintoma:** comportamento da Rhitmo diverge entre features; bug de tom/guardrail em uma rota mas não em outra.
**Causa:** copiou prompt de outra function em vez de usar `composeSystemPrompt`.
**Fix:** SEMPRE usar `composeSystemPrompt({mode, channel, vars, appendices})`. Se nenhum modo encaixa, crie um (workflow 2). Functions a migrar: `generate-brief`, `generate-formal-review`, `meu-rhitmo`, `self-reflection`, `slack-rhitmo-orchestrator`, `briefGenerator.ts`.

## 5. Importar `_shared/rhitmo-constitution.ts` em código novo
**DEPRECATED.** Usar `composeSystemPrompt` direto.

## 6. Adicionar `extends: [memory]` em modo legado sem regenerar snapshot
**Sintoma:** snapshots `leader-member.{web,slack}.txt` ou `member-self.{web,slack}.txt` ficam dessincados; testes de paridade quebram.
**Causa:** modos legados foram congelados sem 07/08 propositalmente.
**Fix:** se realmente precisar adicionar memória/DISC a um modo legado, atualize `MODE_BLOCKS` E rode `regen-snapshots.ts` E revise o diff completo dos 4 snapshots.

## 7. Colocar dado dinâmico (RAG, evidência, lista de feedbacks) dentro de um `.md`
**Sintoma:** prompt inflado, repetido, sem cache; vars `{{...}}` espalhadas no meio de conteúdo editorial.
**Fix:** dado dinâmico vai em `appendices: string[]` do `composeSystemPrompt`. `.md` é só conteúdo editorial estável.

## 8. Silenciar `{{placeholder}}` não substituído
**Sintoma:** prompt vai em produção com `{{firstName}}` literal.
**Causa:** loader **propositalmente** deixa placeholder visível quando var está ausente — é debug, não bug.
**Fix:** logar e corrigir a chamada que esqueceu a var. **Não** mudar o loader para substituir por string vazia.

## 9. Quebrar paridade web↔slack acidentalmente
**Sintoma:** teste `loader_test.ts` falha em "paridade".
**Causa:** mudança num bloco base afeta só um canal por engano (ex.: adicionou markdown rico que Slack não renderiza).
**Fix:** o que muda comportamento vai em bloco base (00-08 ou modes/). O que muda **formatação** vai em `channels/`. Não misture.
