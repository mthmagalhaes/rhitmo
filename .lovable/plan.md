## Objetivo

Atualizar a alma da Rhitmo (`supabase/functions/_shared/soul/`) com 5 arquivos novos e 2 revisões editoriais, mais loader.ts e README. **Sem mudanças em edge functions, DB ou frontend.** Snapshots existentes de `leader-member` e `member-self` permanecem byte-a-byte iguais.

## Princípios de execução

1. **Merge, nunca overwrite.** Para arquivos que já existem, leio o conteúdo atual primeiro e só adiciono/altero o que o documento anexo explicita.
2. **Zero regressão.** A composição de `leader-member`, `member-self`, `pulse-survey`, `one-on-one-prep`, `self-review` continua idêntica. Os novos blocos `07-memory` e `08-disc-calibration` só são incluídos nos modos que extendem essas almas (`leader-self` v2, `monthly-recap`, `quarterly-recap`).
3. **Vars novas opcionais.** Toda nova `{{var}}` é `string | undefined | null` no `vars` (já é o tipo atual de `ComposeOptions.vars`) — chamadas existentes sem essas vars continuam funcionando; o `interpolate` mantém `{{placeholder}}` para debug quando ausentes.
4. **Regen obrigatório.** Após editar qualquer `.md`, rodo `regen-docs.ts` (atualiza `docs.generated.ts` que vai no bundle) e `regen-snapshots.ts` (revalida snapshots). Snapshots de `leader-member.{web,slack}` e `member-self.{web,slack}` precisam continuar idênticos.

## Mudanças por arquivo

### 1. `soul/00-identity.md` — REVISÃO (merge)
- Manter intacto: frontmatter (só atualizar `version: 1 → 2`) e toda a seção `## IDENTIDADE` atual.
- Apêndice ao final, na ordem do anexo:
  - `## CARÁTER` (5 bullets: Direto, Perspicaz, Sem condescendência, Com leveza, Consistente).
  - `## O QUE O RHITMO NÃO É` (4 bullets).
  - `## FRASE DE POSICIONAMENTO INTERNO` (blockquote).
- Diff esperado: só adições — nada removido.

### 2. `soul/modes/leader-self.md` — REVISÃO (merge editorial)
Mudanças vs. atual:
- Frontmatter `version: 1 → 2`, `extends` passa a `[identity, guardrails, tone-and-format, memory]`.
- Subhead novo no topo: parágrafo "Este modo tem a nota mais alta de satisfação…" (1 parágrafo, antes das Regras).
- `REGRAS CRÍTICAS DE ESCOPO`: mantém as 5 regras; a #2 fica mais curta (sem o "Não tente adivinhar."), apenas referenciando `{{redirectInstruction}}` — alinhado ao anexo.
- Reorganizar seções `TIME DE`, `PERFIL DE LIDERANÇA`, `PADRÕES RECENTES`, `REFLEXÕES E RECAPS` em um único bloco `### CONTEXTO DO LÍDER` com sub-rótulos em negrito; adicionar `**Resumo de sessões anteriores:** {{sessionSummary}}` e `**Ações pendentes de sessões anteriores:** {{pendingActions}}`.
- `POSTURA`: manter 3 bullets atuais + adicionar 2 novos (continuidade via histórico; nomear evitação anti-loop).
- Nova seção `### PERGUNTAS PODEROSAS` com 5 perguntas literais do anexo.
- `ESCOPO`: manter ✅ atuais + adicionar `✅ Usar memória de sessões anteriores para criar continuidade.`
- `❌`: manter atuais + adicionar `❌ Virar terapia — se o líder indicar sofrimento intenso, valide e oriente apoio profissional.`
- Vars antigas (`redirectInstruction`, `directReportsList`, `leaderProfileSection`, `teamPatternsSummary`, `leaderName`, `leaderFirstName`) preservadas.

### 3. `soul/07-memory.md` — NOVO
Conteúdo integral do anexo (MEMÓRIA DE RELACIONAMENTO, COMO USAR, CALIBRAÇÃO POR PROFUNDIDADE, AÇÕES PENDENTES, REGRA ANTI-REPETIÇÃO). Frontmatter `id: memory, applies_to: [web, slack], version: 1`.

### 4. `soul/08-disc-calibration.md` — NOVO
Conteúdo integral (mapeamento D/I/S/C, combinados, quando não usar, nunca usar para). Frontmatter `id: disc-calibration, applies_to: [web, slack], version: 1`.

### 5. `soul/modes/monthly-recap.md` — NOVO
Conteúdo integral (3 blocos: Mandou bem / Atenção / Padrão do mês + regras de análise + confirmação). Frontmatter `id: mode-monthly-recap, version: 1, extends: [identity, guardrails, tone-and-format, citations]`.

### 6. `soul/modes/quarterly-recap.md` — NOVO
Conteúdo integral (6 blocos: Destaques / Padrões / Evolução / Classificação / Risco / Ação). Frontmatter `id: mode-quarterly-recap, version: 1, extends: [identity, guardrails, tone-and-format, citations]`.

### 7. `soul/channels/whatsapp.md` — NOVO
Conteúdo integral (formatação WhatsApp, brevidade, ritmo, ações confirmadas). Frontmatter `id: channel-whatsapp, applies_to: [whatsapp], version: 1`.

### 8. `soul/README.md` — APPEND
- Append (sem tocar no que existe):
  - Atualizar o bloco "Estrutura" — acrescentar `07-memory.md`, `08-disc-calibration.md`, `modes/monthly-recap.md`, `modes/quarterly-recap.md`, `channels/whatsapp.md`.
  - Seção `## Arquivos adicionados (v2)` (tabela com 5 linhas).
  - Seção `## Variáveis novas (adicionar ao loader.ts)` (tabela com 11 linhas do anexo).
  - Seção `## Ordem de carregamento (loader.ts) — atualizada` com o diagrama do anexo.

### 9. `soul/loader.ts` — EDIT

```text
type Mode =
  | "leader-member" | "leader-self" | "member-self"
  | "pulse-survey" | "one-on-one-prep" | "self-review"
  | "monthly-recap"      // NEW
  | "quarterly-recap";   // NEW

type Channel = "web" | "slack" | "whatsapp";   // whatsapp NEW
```

Atualizações de `MODE_BLOCKS` (mantém o que já existe; só novos modos recebem 07/08):

- `leader-member`: **inalterado** (não adicionar 07/08 — manteria snapshot).
- `member-self`: **inalterado** (mantém snapshot).
- `pulse-survey`, `one-on-one-prep`, `self-review`: **inalterados**.
- `leader-self`: adicionar `"07-memory.md"` após `03-tone-and-format.md` (alinhado a `extends: [..., memory]`). Sem snapshot atual; não há regressão de teste.
- `monthly-recap` (novo): `["00-identity.md", "01-guardrails.md", "02-analysis-matrix.md", "03-tone-and-format.md", "05-citations.md", "07-memory.md", "08-disc-calibration.md", "modes/monthly-recap.md"]`.
- `quarterly-recap` (novo): `["00-identity.md", "01-guardrails.md", "02-analysis-matrix.md", "03-tone-and-format.md", "05-citations.md", "07-memory.md", "08-disc-calibration.md", "modes/quarterly-recap.md"]`.

`CHANNEL_BLOCK.whatsapp = "channels/whatsapp.md"`.

Tipo das `vars` em `ComposeOptions` já aceita qualquer chave (`Record<string, string | undefined | null>`) — nada a estender em TS para receber as novas variáveis. Apenas documentar (em comentário no topo) as novas chaves esperadas:
`sessionSummary, sessionCount, pendingActions, monthlyRecaps, previousQuarterSummary, quarterLabel, monthlyRecapCount, nextQuarterDate, periodStart, periodEnd, evidenceCount, nextMonth`.

### 10. `soul/regen-docs.ts` — EDIT
Adicionar à constante `FILES`:
`"07-memory.md", "08-disc-calibration.md", "modes/monthly-recap.md", "modes/quarterly-recap.md", "channels/whatsapp.md"`.

### 11. `soul/regen-snapshots.ts` — sem mudança de casos
Mantém os 4 casos atuais (`leader-member.{web,slack}`, `member-self.{web,slack}`). Vão continuar idênticos depois do regen — é a validação anti-regressão.

### 12. `soul/loader_test.ts` — sem mudanças necessárias
Os 11 testes existentes continuam passando. (Opcional, fora do escopo: adicionar smoke test para `monthly-recap`/`quarterly-recap`/`whatsapp`. Pulo agora para manter "soul only, sem outros side-effects" — posso adicionar num follow-up.)

## Sequência de execução

1. Ler conteúdo atual de `00-identity.md` e `modes/leader-self.md` (em paralelo).
2. Escrever os 5 arquivos novos + os 2 revisados + README atualizado + `loader.ts` + `regen-docs.ts` (paralelo onde possível).
3. Rodar `deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-docs.ts`.
4. Rodar `deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-snapshots.ts`.
5. Verificar `git diff supabase/functions/_shared/soul/__snapshots__/` → **deve estar vazio** (prova de zero regressão).
6. Rodar `supabase--test_edge_functions` filtrando `loader_test.ts` para confirmar 11/11 verdes.

## Validações finais (checklist)

- [ ] Todos os arquivos antigos de `soul/` continuam presentes.
- [ ] `docs.generated.ts` inclui os 5 novos `.md`.
- [ ] Snapshots `leader-member.*` e `member-self.*` sem diff.
- [ ] `loader_test.ts` passa.
- [ ] `composeSystemPrompt({mode:"monthly-recap", channel:"web"})` retorna prompt com headers `IDENTIDADE`, `GUARDRAILS`, `CAMADAS DE ANÁLISE` (analysis-matrix), `TOM`, `[doc:` (citations), `MEMÓRIA DE RELACIONAMENTO`, `CALIBRAÇÃO POR PERFIL COMPORTAMENTAL`, `RHITMO MENSAL`, `FORMATAÇÃO PARA WEB`.
- [ ] `composeSystemPrompt({mode:"leader-self", channel:"web"})` contém `PERGUNTAS PODEROSAS`.
- [ ] Nenhuma edge function precisa de mudança (vars novas são todas opcionais).

## Riscos & decisões

- **Por que NÃO incluir 07/08 em todos os modos base** (apesar do README dizer "base sempre"): incluir mudaria os snapshots de `leader-member` e `member-self`, violando o requisito explícito "produces same output as before (no regression)". A interpretação consistente do spec é: 07/08 são "almas base disponíveis" carregadas só pelos modos que as listam em `extends`. Posso reverter essa decisão se você confirmar que quer regenerar os snapshots de `leader-member`/`member-self` agora.
