## Sprint 16 — Rhitmo Trimestral: peer voices, network context e entrega no Slack

Confirmado: Semestral fora de escopo. Trabalhamos só com `quarterly_recaps` (Rhitmo Trimestral) que já existe.

### Objetivo
Levar o Rhitmo Trimestral ao padrão "Feedback Report" da referência Windmill: enriquecer com vozes de pares (Sprint 15) e sinais de rede (Sprint 14), e entregar proativamente ao líder via Slack DM no início de cada trimestre, com link para o app.

### Escopo (4 entregas)

**1. Migration — `quarterly_recaps`**
- `ADD COLUMN peer_voices jsonb NOT NULL DEFAULT '[]'::jsonb`
- `ADD COLUMN network_context jsonb NOT NULL DEFAULT '{}'::jsonb`
- `ADD COLUMN slack_delivered_at timestamptz`
- Sem mudança em RLS (já existente é suficiente).

**2. `generate-quarterly-recap` — enriquecimento**
- Buscar do trimestre `[startMonth, endMonth)`:
  - `peer_feedback_requests` com `status='answered'` para o `subject_member_id = member.id` → top 3 respostas mais recentes (texto + nome do par via `peer_user_id` → profile).
  - `network_signals` para o `member_id` no mesmo período → top 3 ativos por `severity`.
- Passar para o prompt como blocos auxiliares ("Vozes de pares", "Sinais de rede").
- Persistir nos novos campos `peer_voices` e `network_context`. Funciona nos modos `from_monthly` e `from_raw`.
- Sem mudança no contrato JSON principal (`highlights`, `recurring_patterns`, etc).

**3. UI — `QuarterlyRecapSection.tsx`**
- Render condicional de 2 blocos novos abaixo dos `highlights`:
  - "Vozes de pares" → cards com `CitationChip` apontando para `peer_feedback_requests`.
  - "Contexto de rede" → chips por `signal_type` com link para `EvidenceDrawer`.
- Header com `wrapAsRhy()`. Recap antigo (campos vazios) → seções escondidas.

**4. Edge function nova `slack-deliver-quarterly-recap` + cron**
- Cron `0 13 1 1,4,7,10 *` (1º de jan/abr/jul/out, 10h BRT).
- Para cada `quarterly_recaps` com `ai_generated_at >= now()-7d` e `slack_delivered_at IS NULL`, agrupando por `manager_id`:
  - Verifica `slack_integrations` ativo do líder.
  - Monta DM: header + 1 bloco resumo por liderado (3-5 linhas: highlight #1 + risk + 1 peer voice se houver) + botão "Ver no Rhitmo" → `https://rhitmo.co/lider/avaliacoes?recap={id}`.
  - Limite 8 liderados por mensagem; resto vira mensagens em thread.
  - Marca `slack_delivered_at = now()` (idempotência).
- Cron via `cron.schedule` + `net.http_post` (insert tool, não migration — segue padrão do projeto).

### Detalhes técnicos

```text
trigger trimestral (1º jan/abr/jul/out)
   │
   ▼
generate-quarterly-recap (enriquecido) ──► quarterly_recaps + peer_voices + network_context
   │
   ▼
slack-deliver-quarterly-recap (cron 13:00 UTC mesmo dia)
   │
   ▼
Slack DM ao líder + slack_delivered_at = now()
   │
   ▼
botão → /lider/avaliacoes?recap={id}  (já abre o componente certo)
```

- **Sem nova tabela.** Tudo em `quarterly_recaps`.
- **Sem alteração** em `monthly_recaps`, Pulse, peer review, brief, mentor.
- **Privacidade:** peer_voices nominal (mesmo padrão do brief Sprint 14/15). Apenas líder/HR Admin via RLS já vigente.
- **Risco de quebra:** baixo. Colunas com default não nulo. Edge nova isolada. UI degradada para registros legados.

### Ordem de execução
1. Migration (3 colunas).
2. Enriquecer `generate-quarterly-recap` + redeploy.
3. Render dos blocos novos em `QuarterlyRecapSection`.
4. Edge `slack-deliver-quarterly-recap` + cron schedule.
5. Atualizar memórias: criar `mem://features/recaps/quarterly-feedback-report-delivery`, atualizar `mem://features/slack/proactive-dms-orchestrator` e `mem://index.md`.
