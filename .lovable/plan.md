## Sprint 17 — Rhitmo Trimestral on-demand + Rhy lembra (e gera por Slack)

Sim, dá pra fazer as duas coisas. E você tem razão na intuição: o Rhy fica **menos broadcaster** (cron civil fixo) e mais **agente que avisa quando faz sentido + executa por linguagem natural**. Mantemos a entrega Sprint 16, só trocamos o gatilho.

### Decisões

1. **UI on-demand** (igual Formal): líder escolhe **Último mês / Último trimestre / Personalizado** ao gerar Trimestral.
2. **Cron civil (1 jan/abr/jul/out) sai.** Vira **cron diário de aniversário** que **só lembra**, não gera.
3. **Lembrete por aniversário**: a cada 90 dias desde `team_members.created_at` (90/180/270/...). Gera nudge no app + DM no Slack.
4. **Slack conversacional**: líder responde "pode gerar" / "manda" / "sim" → Rhy gera o trimestral on-demand e responde no thread com resumo + botão "Abrir no Rhitmo". Mesma engine da `slack_conversations` (Sprint 11.2).

---

### Escopo técnico

**1. Migration**

- `quarterly_recaps`: tornar `period_quarter` nullable e adicionar `period_start date`, `period_end date`, `period_label text` (para "Último mês", "Personalizado 12/02–05/05" etc). Backfill: copiar `period_quarter` → `period_start` e `period_quarter + 3 meses` → `period_end`.
- Índice único composto: `(member_id, period_start, period_end)` substituindo o atual `(member_id, period_quarter)`.
- Nova tabela leve **NÃO** é necessária — reaproveitamos `leader_nudges` (já tem `nudge_type`) com tipo novo `quarterly_recap_anniversary` e `slack_conversations` para o turno conversacional.

**2. `generate-quarterly-recap` (edge)**

- Aceitar body `{ member_id, period_start, period_end, period_label? }` além do `period_quarter` legado (compat).
- `quarterRange()` vira função única que recebe `[start, end)` direto.
- Buscar `monthly_recaps`, `peer_feedback_requests`, `network_signals` no range arbitrário (já está parametrizado por datas — só remover a derivação a partir de `period_quarter`).
- Persistir `period_start`, `period_end`, `period_label`. Mantém `peer_voices` / `network_context` (Sprint 16).

**3. UI — `QuarterlyRecapSection.tsx` ganha um `GenerateQuarterlyDialog**`

- Mesma estrutura do `CreateFormalReviewDialog` (3 botões + Calendar). Reaproveita o componente `Calendar` com `pointer-events-auto`.
- Defaults: `last_quarter` (3 meses até hoje).
- Mostra preview: "X mensais confirmados, Y peer feedback, Z sinais de rede" (chamada já existe em RPC `get_review_evidence`; senão fazemos contagem leve client-side).
- Botão "Gerar Rhitmo Trimestral" → invoca edge com período. Render do recap usa as colunas novas (`period_label` no header).

**4. Novo edge `quarterly-anniversary-cron**`

- Cron diário `0 12 * * *` (09 BRT) via `pg_cron` + `net.http_post` (insert tool, não migration).
- Para cada `team_members` ativo: calcula `dias = floor((now - created_at) / 1 day)`. Se `dias > 0 AND dias % 90 == 0`:
  - Cria `leader_nudges` (`nudge_type = 'quarterly_recap_anniversary'`, severity info, message "Fulano completa N dias com você. Quer que eu gere o Rhitmo Trimestral dos últimos 90 dias?", `action_url = /lider/avaliacoes?member={id}&suggest=quarterly`).
  - Se líder tem `slack_integrations` ativo: envia DM com texto + 2 botões `block_actions`:
    - `generate_quarterly` (payload `{ member_id, period_start, period_end }`)
    - `dismiss`
  - Marca via campo novo em `team_members` (`last_anniversary_nudge_at timestamptz`) para evitar duplicação no mesmo dia.

**5. Slack — geração via DM (botão e linguagem natural)**

- **Botão**: handler em `slack-bot` (`block_actions` com `action_id = generate_quarterly`) → chama `generate-quarterly-recap` → responde com `chat.postMessage` no mesmo canal/thread: header + 2-3 highlights + risco + botão "Abrir no Rhitmo".
- **Linguagem natural**: ao mandar a DM proativa, o cron cria uma `slack_conversations` com `intent = 'awaiting_quarterly_confirmation'` e contexto `{ member_id, period_start, period_end, member_name }`, expira em 24h. No `slack-bot` (rota DM), se houver conversa ativa desse intent, classificamos a resposta via Lovable AI Gateway (gemini-2.5-flash) com prompt curto: "responda apenas YES, NO ou OTHER". `YES` → mesma chamada da geração + fecha conversa; `NO` → fecha; `OTHER` → cai no fluxo `general_chat` (não bloqueia).
- Resposta no Slack reusa `wrapAsRhy()` e blocos compactos (Sprint 11.2 / 14).

**6. Memórias**

- Atualizar `mem://features/recaps/quarterly-feedback-report-delivery.md` (substituir cron civil por aniversário on-demand).
- Criar `mem://features/recaps/quarterly-anniversary-reminder.md`.
- Atualizar `mem://index.md`.

---

### Fluxo

```text
team_members.created_at + 90/180/270... dias
   │
   ▼
quarterly-anniversary-cron (diário 09 BRT)
   ├─► leader_nudges (in-app)
   └─► Slack DM (botão "Gerar" + linguagem natural)
              │
              ├─ "pode gerar" / botão  → generate-quarterly-recap (period = últimos 90d)
              │      └─► quarterly_recaps + DM resumo + botão Abrir
              └─ "agora não" / 24h     → fecha slack_conversations

UI on-demand (qualquer hora)
   QuarterlyRecapSection → Dialog (Último mês / trimestre / Personalizado)
              └─► generate-quarterly-recap (period flexível)
```

---

### Fora de escopo

- Mexer em Mensal/Formal.
- Trocar a entrega Sprint 16 (`slack-deliver-quarterly-recap`) — fica como entrega *após geração*; cron civil dela vira cron diário com mesmo lookback de 7d (não gera nada, só entrega o que foi gerado e ainda não foi enviado por DM resumo). Alternativa: aposentar essa função e fundir tudo no fluxo conversacional. **Recomendo aposentar** porque o resumo agora é entregue na hora da geração via DM. Confirma? Confirmo!

### Risco

- Baixo. Schema com defaults/backfill. Edge e UI retrocompatíveis com `period_quarter`. Cron novo é idempotente via `last_anniversary_nudge_at`.

### Pergunta antes de executar

1. **Aposentar `slack-deliver-quarterly-recap**` (cron civil) e usar só a DM imediata pós-geração? **sim**
2. Janela do lembrete: só múltiplos exatos de 90 dias, ou também "≥ 90 dias desde o último trimestral confirmado" (ex.: liderado antigo sem trimestral nenhum)? **(recomendo a 2ª, mais útil)**