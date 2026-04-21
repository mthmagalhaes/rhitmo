

# Rhitmo Core — Ajustes finais antes de fechar Sprint 4

Os 3 alertas técnicos + o estado de transição estão corretos. Aqui está o que entra para fechar a sprint sem regressão.

## 1. Funções separadas para confirmação (drop da ideia "função genérica")

Confirmação **continua sendo update direto na tabela via RLS** (já implementado em `useConfirmMonthlyRecap` e `useConfirmQuarterlyRecap`). Não vamos criar `finalize-monthly-recap` / `finalize-quarterly-recap` como edge functions.

**Motivo:** RLS já garante que só o `manager_id` pode atualizar. Validação de payload acontece no client (`canConfirm` no Quarterly exige classification + risk + actionKey). Para reforçar **server-side**, adicionamos:

- **Trigger Postgres** `validate_quarterly_recap_confirm` — ao mudar `status` de `draft` → `confirmed`, exige `classification IS NOT NULL AND turnover_risk IS NOT NULL AND next_action_key IS NOT NULL`. Senão, `RAISE EXCEPTION`.
- **Trigger Postgres** `validate_monthly_recap_confirm` — ao confirmar, exige `dominant_pattern IS NOT NULL AND length(trim(dominant_pattern)) > 0` (highlight/concern podem ser vazios por design — quando não há evidência, omite).

Isso fecha o buraco sem multiplicar funções nem inventar bugs silenciosos. Funções genéricas ficam fora.

## 2. Cron de mensal — threshold ≥3 evidências + flag `low_evidence`

**No cron mensal** (`monthly-recaps-cron`, dia 2):
- Itera sobre todos `(team_members × leader)` ativos
- Conta `feedbacks + meeting_transcripts` do mês anterior por membro
- **Só dispara `generate-monthly-recap` se `total ≥ 3`**
- **Só cria nudge** "Mensal aguardando confirmação" se draft foi gerado

Quando o líder gera **manualmente** com `<3` evidências (caso comum em times pequenos), a edge function permite gerar mas marca o recap com nova coluna `low_evidence boolean NOT NULL DEFAULT false`. UI mostra badge âmbar:

> ⚠ Poucas evidências este mês (X registros). O resumo pode estar incompleto — registre mais notas antes de confirmar.

**Migração adicional:** `ALTER TABLE monthly_recaps ADD COLUMN low_evidence boolean NOT NULL DEFAULT false;` + lógica em `generate-monthly-recap` para setar `low_evidence = (fbCount + mtCount) < 3`.

## 3. Hidratação completa dos trimestrais em `generate-formal-review`

Atualizar `generate-formal-review/index.ts` para:

```ts
// Após buscar feedbacks/meetings, buscar recaps confirmados no período
const { data: quarterlies } = await supabase
  .from("quarterly_recaps")
  .select("period_quarter, highlights, recurring_patterns, evolution_vs_previous, classification, turnover_risk, turnover_risk_reason, next_action_key, source_monthly_recap_ids")
  .eq("member_id", member.id)
  .eq("status", "confirmed")
  .gte("period_quarter", periodStart)
  .lte("period_quarter", periodEnd);

const { data: monthlies } = await supabase
  .from("monthly_recaps")
  .select("period_month, highlight_text, concern_text, dominant_pattern")
  .eq("member_id", member.id)
  .eq("status", "confirmed")
  .gte("period_month", periodStart)
  .lte("period_month", periodEnd);
```

E **injetar conteúdo hidratado** no prompt:
- Bloco "## CALIBRAÇÕES TRIMESTRAIS CONFIRMADAS PELO LÍDER" com highlights, recurring_patterns (texto completo), classification, turnover_risk, next_action — **antes** do bloco de evidências brutas.
- Bloco "## RESUMOS MENSAIS CONFIRMADOS" com highlight_text/concern_text/dominant_pattern por mês.
- Instrução explícita no system prompt: *"Quando há trimestrais confirmadas, elas são a espinha da review. Use os feedbacks brutos APENAS como suporte/citação. NÃO refaça a calibração que o líder já validou."*

Sem trimestral nem mensal confirmado → fallback para o comportamento atual (feedbacks brutos).

## 4. Estado de transição: empty state com CTA de geração manual

Para usuários existentes (líderes com feedbacks mas zero recaps), adicionar um **`RhitmoTimelineCard`** simples no `MemberDetails.tsx` posicionado **antes** das tabs `Diário de Bordo` / `Avaliações Formais`.

Lógica:
- Conta `monthly_recaps` + `quarterly_recaps` confirmados do membro
- **Se zero recaps E ≥3 feedbacks no mês passado:** card destacado "Você tem N notas registradas — gere o primeiro Resumo Mensal" + botão `Gerar Rhitmo Mensal` (chama `generate-monthly-recap` para o mês anterior)
- **Se zero recaps E <3 feedbacks no mês passado:** card neutro "Registre mais notas para destravar seu primeiro Rhitmo Mensal" (sem botão)
- **Se ≥1 recap:** card colapsado com "Ver linha do tempo Rhitmo →" levando até a seção de recaps abaixo
- Adicionar nova **tab** `Rhitmo` na linha de tabs (entre `Diário` e `Avaliações`) que renderiza `<MonthlyRecapSection memberId={member.id} />` + `<QuarterlyRecapSection memberId={member.id} />`

Componente novo: `src/components/recaps/RhitmoTimelineCard.tsx`.

## 5. Cron jobs — instalação

Dois jobs via `pg_cron` + `pg_net` (instalados via insert tool, fora de migration por terem URL/anon key específicos):

- `rhitmo-monthly-recaps-generate` — `0 9 2 * *` (dia 2 do mês, 9h UTC) → POST em `generate-monthly-recap-cron` (nova edge function que usa service role e itera sobre membros ativos)
- `rhitmo-quarterly-recaps-generate` — `0 9 2 1,4,7,10 *` → POST em `generate-quarterly-recap-cron`

Edge functions cron são separadas das funções "manuais" (que exigem auth do líder). Reutilizam `automation_runs`, `cronAuth`, `dispatchNotification`.

## 6. Critérios de aceite atualizados

- [x] Triggers Postgres bloqueiam confirm sem campos obrigatórios (testar via SQL)
- [x] Cron mensal só gera draft + nudge para membros com ≥3 evidências
- [x] Coluna `low_evidence` populada e badge UI visível quando true
- [x] `generate-formal-review` consome conteúdo **hidratado** dos trimestrais (não só IDs) — verificável criando review num membro com trimestral confirmado e checando que o prompt contém os textos
- [x] `RhitmoTimelineCard` aparece no `MemberDetails` para usuários existentes com CTA funcional
- [x] Nova tab `Rhitmo` no `MemberDetails` renderizando Monthly + Quarterly sections
- [x] i18n PT/EN/ES das novas strings
- [x] Linter Supabase sem novos warnings

## Considerações técnicas

- **Migração SQL:** add `low_evidence`, criar 2 triggers de validação, criar 2 edge functions de cron
- **Edits em arquivos existentes:**
  - `supabase/functions/generate-monthly-recap/index.ts` — set `low_evidence`
  - `supabase/functions/generate-formal-review/index.ts` — buscar e hidratar recaps
  - `src/pages/MemberDetails.tsx` — montar tab Rhitmo + RhitmoTimelineCard
  - `src/components/recaps/MonthlyRecapSection.tsx` — exibir badge `low_evidence`
  - `src/hooks/useRecaps.ts` — adicionar `low_evidence` ao type
  - `src/i18n/locales/*.json` — strings novas
- **Novos arquivos:**
  - `src/components/recaps/RhitmoTimelineCard.tsx`
  - `supabase/functions/generate-monthly-recap-cron/index.ts`
  - `supabase/functions/generate-quarterly-recap-cron/index.ts`
- **SQL via insert tool (não migration):** os 2 cron schedules
- **SQL via migration:** 2 triggers de validação + coluna `low_evidence`

