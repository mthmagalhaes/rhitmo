## Sprint 17 (parte 2) — Anniversary Nudge + Slack Conversational + Cleanup

Continuação do Sprint 17. A parte 1 (schema flexível + dialog on-demand) já está em produção. Agora vamos fechar o loop proativo do Rhy e aposentar o cron civil.

### 1. Daily Anniversary Cron (`quarterly-anniversary-cron`)

Nova edge function executada **diariamente às 09:00 BRT (12:00 UTC)** via `pg_cron`:

- Para cada `team_members` ativo (não arquivado, com `linked_user_id` ou não):
  - Calcula `days_since_created = (today - created_at)`.
  - Calcula `days_since_last_quarterly = (today - max(period_end))` em `quarterly_recaps` confirmados (`status='confirmed'`).
  - Dispara nudge se:
    - `days_since_created >= 90` E (`days_since_last_quarterly IS NULL` OU `days_since_last_quarterly >= 90`)
    - E `last_anniversary_nudge_at IS NULL` OU `> 14 dias atrás` (cooldown anti-spam).
- Ações ao disparar:
  1. INSERT em `leader_nudges` (tipo `quarterly_due`, payload com `member_id`, `period_start`, `period_end` sugeridos = últimos 90 dias).
  2. Envia DM Slack ao líder (se `slack_integrations` ativo) via `slack-send-dm` com:
     - Texto wrapped por `wrapAsRhy()`: "Já passou ~X dias desde o último Rhitmo Trimestral de **Fulano**. Quer que eu gere agora cobrindo {período}?"
     - 2 botões: `[Gerar agora]` (action_id `generate_quarterly_confirm`) e `[Mais tarde]` (action_id `generate_quarterly_dismiss`).
     - Link de fallback para `/lider/avaliacoes?member=...&suggest=quarterly&start=...&end=...`.
  3. UPDATE `team_members.last_anniversary_nudge_at = now()`.

### 2. Slack Conversational Loop

Estender o state machine existente (`slack_conversations`) com novo intent `awaiting_quarterly_confirmation`:

- **Button handler** (em `slack-interactive` ou equivalente):
  - `generate_quarterly_confirm`: chama `generate-quarterly-recap` com `{member_id, period_start, period_end, mode:'auto'}`, posta "Gerando…" no thread, e quando pronto edita a mensagem com resumo wrapped por `wrapAsRhy()` + link para o app.
  - `generate_quarterly_dismiss`: agradece e marca `last_anniversary_nudge_at` para próximo ciclo (30 dias).
- **Natural language fallback** (em `slack-dm-handler`):
  - Quando o líder responde DM com `slack_conversations.intent = awaiting_quarterly_confirmation`, passa para Lovable AI Gateway (gemini-2.5-flash) com prompt de classificação:
    - Resposta afirmativa ("sim", "pode gerar", "vai", "manda ver") → executa mesma lógica do botão confirm.
    - Resposta negativa ("não", "depois", "agora não") → mesma lógica do dismiss.
    - Ambíguo → Rhy pede confirmação explícita uma vez.
  - Limpa `slack_conversations.intent` após resposta.
- Resultado da geração no Slack: card resumido (3-5 bullets do JSON do recap) + link "Ver no Rhitmo".

### 3. Cleanup do Cron Civil (Sprint 16)

- **Aposentar** `slack-deliver-quarterly-recap` (cron de 1º jan/abr/jul/out):
  - Remover schedule do `pg_cron` (via insert tool, pois é dado de runtime).
  - Manter código da função por 1 sprint comentado/dormente (rollback fácil), ou deletar — recomendo deletar via `delete_edge_functions` para manter clareza.
- **Entrega imediata pós-geração**: ao confirmar um recap (status muda p/ `confirmed`) via UI ou Slack, já dispara DM resumida ao líder no momento — sem depender de cron civil. Reaproveita o helper de DM que será criado no item 1.

### Arquivos afetados

**Novos:**
- `supabase/functions/quarterly-anniversary-cron/index.ts`
- `supabase/functions/_shared/quarterlyNudgeHelpers.ts` (cálculo de período, formatação de DM)

**Editados:**
- `supabase/functions/slack-interactions/index.ts` (ou nome equivalente do handler de buttons) — adicionar `generate_quarterly_confirm/dismiss`.
- `supabase/functions/slack-dm-handler/index.ts` — handler do intent `awaiting_quarterly_confirmation`.
- `supabase/functions/generate-quarterly-recap/index.ts` — disparar DM Slack ao confirmar (se invocado de fluxo confirm).
- `src/components/recaps/QuarterlyRecapSection.tsx` — banner sutil "Rhy sugere gerar trimestral" quando `leader_nudges` tipo `quarterly_due` ativo.

**Deletados:**
- `supabase/functions/slack-deliver-quarterly-recap/` (após confirmar deploy do novo fluxo).

**SQL (via insert tool, não migração):**
- `cron.unschedule('slack-deliver-quarterly-recap-civil')` (ou nome usado).
- `cron.schedule('quarterly-anniversary-cron', '0 12 * * *', ...)`.

**Memória:**
- Criar `mem://features/recaps/quarterly-anniversary-nudge.md` documentando o novo fluxo e atualizar índice.

### Considerações

- **Idempotência**: cooldown de 14 dias em `last_anniversary_nudge_at` evita DM duplicada se cron rodar 2x ou líder demorar a responder.
- **Liderado sem Slack do líder**: nudge ainda cria `leader_nudges` (banner no app), só pula DM.
- **Threading**: respostas em DM mantêm contexto via `thread_ts` em `slack_conversations`.
- **Observabilidade**: log estruturado em cada etapa (calculou X membros, disparou Y nudges, Z falharam).
