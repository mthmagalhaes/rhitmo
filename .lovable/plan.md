## Sprint 17.3 — Fechar gaps do plano original

Dois ajustes pequenos para deixar o Sprint 17 100% alinhado ao plano.

### 1. Banner "Rhy sugere gerar Trimestral" em `QuarterlyRecapSection`

Quando existir `leader_nudges` ativo (`nudge_type='quarterly_due'`, `dismissed_at IS NULL`, `member_id` = membro atual) para o líder logado:

- Renderizar card sutil acima da lista de recaps: ícone Sparkles, copy curta no tom Rhy ("Já passou {N} dias desde o último Rhitmo Trimestral. Quer gerar agora cobrindo {período}?"), CTA primário "Gerar agora" e secundário "Mais tarde".
- "Gerar agora" abre o `GenerateQuarterlyDialog` pré-preenchido com `period_start`/`period_end` que vêm do `action_url` do nudge (já gravado pelo cron).
- "Mais tarde" faz UPDATE em `leader_nudges.dismissed_at = now()` (snooze leve; o cron volta a sugerir após 14d).
- Novo hook leve `useQuarterlyDueNudge(memberId)` usando `safeQuery` (segue padrão do projeto). Render condicional: se nada → não mostra nada.

Garante paridade com o líder que **não usa Slack**: ele agora vê o sinal dentro da feature, não só num centro de notificações genérico.

### 2. Eco no Slack ao confirmar recap pelo app

Hoje a DM resumida só sai quando o líder confirma via botão Slack. O plano (§3) previa eco também quando a confirmação acontece pela UI.

- Em `generate-quarterly-recap` (ou no caminho que faz `UPDATE quarterly_recaps SET status='confirmed'` — verificar; se hoje a confirmação acontece só client-side via update direto, criar wrapper edge `confirm-quarterly-recap` que faz o update + dispara DM, e trocar o call site na UI para usar essa edge).
- Lógica do eco: buscar `slack_integrations` do líder; se existir, postar DM curta usando `buildQuarterlyResultBlocks()` (já existe em `_shared/quarterlyNudgeHelpers.ts`) com link "Abrir no Rhitmo".
- Idempotência: usar coluna existente `slack_delivered_at` em `quarterly_recaps` (criada no Sprint 16) — só envia se NULL; marca após sucesso.
- Soft-fail: erro de Slack não bloqueia confirmação.

### Detalhes técnicos

**Arquivos novos:**
- `src/hooks/useQuarterlyDueNudge.ts`
- (opcional, dependendo do call site atual de confirmação) `supabase/functions/confirm-quarterly-recap/index.ts`

**Arquivos editados:**
- `src/components/recaps/QuarterlyRecapSection.tsx` — renderizar banner; integrar com dialog existente.
- `supabase/functions/generate-quarterly-recap/index.ts` ou nova edge — adicionar bloco de eco DM no caminho de confirmação.
- `src/hooks/useRecaps.ts` — se a confirmação migrar para edge, ajustar `confirmRecap` para `safeFunctionInvoke`.

**Sem migração SQL.** `slack_delivered_at` e `dismissed_at` já existem.

**Memória:**
- Atualizar `mem://features/recaps/quarterly-anniversary-nudge.md` com a nova superfície UI e o eco pós-confirmação.

### Considerações

- Banner respeita o RLS de `leader_nudges` (líder só vê os seus).
- Eco no Slack reusa helpers existentes — zero duplicação.
- Sem mudanças no cron, no state machine ou nos handlers de botão (já corretos).