## Sprint 1 — Continuação (pós-manifest)

Manifest atualizado e app reinstalado. Agora executo em sequência, sem te interromper, os 3 itens que faltam pra fechar a Sprint 1:

---

### Item A — Agendar o `slack-ambient-classifier` (pg_cron)

Registra o cron que dispara a Edge Function diariamente:
- **Schedule:** `0 6 * * *` UTC (3h BRT)
- **Mecanismo:** `pg_cron` + `pg_net` chamando o endpoint da function
- **Logging:** já tratado via `automation_runs` dentro da própria function
- Insert direto via tool de SQL (não migration, porque carrega URL e anon key específicos do projeto)

---

### Item B — Handler do shortcut `save_as_evidence` no `slack-bot`

Quando o líder clicar nos `⋯` de uma mensagem → "Salvar como evidência":
1. `slack-bot` recebe payload tipo `message_action` com `callback_id = save_as_evidence`
2. Resolve o autor da mensagem (Slack user → `team_members.slack_user_id` → `member_id`)
3. Resolve o líder (quem clicou → `manager_id` via `slack_connections`)
4. Insere em `slack_ambient_evidence` com:
   - `status = 'approved'` (ação manual = já aprovada)
   - `category = 'manual'`
   - `relevance_score = 1.0`
   - `source = 'shortcut'`
5. Confirma com mensagem ephemeral: "✅ Salvo como evidência sobre @João. Ver em rhitmo.co/evidence"

---

### Item C — Página `/evidence` (revisão batch)

Nova rota no app pra líder revisar evidências capturadas pelo classifier:

**Layout (Bento/Creme):**
```
┌─────────────────────────────────────────────────┐
│ Evidências do Slack                             │
│ 12 pendentes · 4 liderados                      │
├─────────────────────────────────────────────────┤
│ Filtros: [Todos ▾] [Categoria ▾] [Liderado ▾]  │
├─────────────────────────────────────────────────┤
│ ┌─ João Silva · #engenharia · 2h atrás ──────┐ │
│ │ 🚀 Entrega                                  │ │
│ │ "Subi PR do checkout v2, passou em todos os│ │
│ │  testes E2E. Já tá em staging."             │ │
│ │ Score: 0.87 · [Ver no Slack ↗]              │ │
│ │ [✓ Aprovar] [→ Virar feedback] [✕ Dispensar]│ │
│ └────────────────────────────────────────────┘ │
│ ┌─ Maria · #vendas · 5h atrás ───────────────┐ │
│ │ ...                                          │ │
└─────────────────────────────────────────────────┘
```

**Componentes novos:**
- `src/pages/Evidence.tsx` — listagem com filtros e ações
- `src/components/evidence/EvidenceCard.tsx` — card de evidência
- `src/components/evidence/EvidenceFilters.tsx` — filtros
- `src/hooks/useEvidence.ts` — fetch + mutations (approve/dismiss/convert)

**Ações:**
- **Aprovar** → `status = 'approved'` (fica como evidência consultável)
- **Virar feedback** → cria registro em `feedbacks` com `source = 'slack_ambient'`, status vira `converted_to_feedback`
- **Dispensar** → `status = 'dismissed'`, some da lista
- Bulk select: aprovar/dispensar em lote

**Navegação:** novo item no `AppSidebar` "Evidências" com badge de pendentes.

---

### Item D — Digest via Slack DM + card in-app (cadência configurável)

**Edge Function `send-evidence-digest`:**
- Roda diariamente (cron `0 12 * * *` UTC = 9h BRT)
- Pra cada líder com `leader_digest_preferences`:
  - Verifica se `cadence` (weekly/biweekly/monthly) bate com `day_of_week` e `last_sent_at`
  - Conta evidências `pending` agrupadas por liderado
  - Envia DM Slack (se canal = slack | both) com Block Kit:
    ```
    📊 Resumo Rhitmo da semana
    
    Você tem 12 evidências esperando revisão sobre 4 liderados:
    • João: 3 entregas no #engenharia
    • Maria: 2 reconhecimentos no #vendas
    • Pedro: 4 mensagens no #produto
    • Ana: 3 menções em #design
    
    [Revisar agora] → rhitmo.co/evidence
    [Mudar cadência] → rhitmo.co/settings/notifications
    ```
  - Atualiza `last_sent_at`

**Card in-app:**
- Componente `<EvidenceDigestCard />` no dashboard do líder (se canal = in_app | both)
- Mesma info da DM, com CTA pra `/evidence`
- Some quando líder revisa todas

**Settings:**
- Adiciona seção "Evidências do Slack" em `NotificationsTab.tsx`
- Switch de cadência (semanal | quinzenal | mensal)
- Switch de canal (Slack DM | in-app | ambos)

---

### Ordem de execução

1. Item A (cron) — 1 min
2. Item B (handler shortcut) — edit `slack-bot/index.ts` + deploy
3. Item C (UI `/evidence`) — 4 arquivos novos + sidebar + rota
4. Item D (digest) — Edge Function nova + cron + card dashboard + settings

Te aviso ao final com link pra testar (`rhitmo.co/evidence`) ou se travar em algum ponto.

### Detalhes técnicos relevantes

- O `slack-bot` já trata `view_submission` e slash commands; vou adicionar branch novo pra `type === 'message_action'` no parser de payloads interativos.
- `useEvidence.ts` segue o padrão de `useLeaderInbox.ts` (React Query + mutations).
- Bulk approve usa update em lote via array de IDs.
- Digest cron NÃO duplica envios: `last_sent_at` + check de cadência garantem idempotência.
- Conversão evidência → feedback popula `feedbacks.source = 'slack_ambient'` e `feedbacks.evidence_id` (FK opcional pra rastreio reverso — vou adicionar a coluna se ainda não existir).

Confirma que sigo?
