## 🎫 Ticket Rhitmo Support — Slack: brief proativo, DM conversacional e visibilidade de atividade

**Afetado:** matheus.magalhaes@fstr.co (user `79a6f679…`, slack `U04N7M58KR6`)
**Severity:** `high` (regressão silenciosa em feature paga, sem entrega)
**Categoria:** `regressao` + `bug`

---

### 📌 Sintomas reportados

1. Não recebe DM proativa antes da 1:1 (3 reuniões hoje: Guilherme 14:00, Laís 14:00, Gabriela 13:30 — todas com `brief_dm_sent_at = NULL`).
2. DM conversacional no Slack responde sempre em "modo coaching pessoal" e redireciona ("peça 'me fala sobre a Gabriela'") mesmo quando a pergunta já cita o nome explicitamente.
3. Card "Atividade no Slack" só existe dentro do sheet do liderado em `MemberDetails`. `/lider/1on1s` virou redirect legado para `/lider/pessoas`, então o líder não tem ponto de entrada óbvio. Diário de Bordo (`/lider/diario`) não consome `slack_activity_rollup`.

---

### 🔎 Causa raiz (investigada, com refs)

**1. Orquestrador respondendo 401 em todos os ticks**
`supabase/functions/_shared/cronAuth.ts` foi endurecido e removeu o bypass do literal `INTERNAL_CRON_TRIGGER`. Mas o `cron.job` id `20` (`rhitmo-orchestrator-every-30min`) **ainda envia `x-cron-secret: INTERNAL_CRON_TRIGGER`** no header — comparei contra os jobs `35` e `36` (ambient/weekly), que já foram atualizados para o secret real `7evhjpp2w7…`. Reproduzi com `curl` direto na função: `401 Unauthorized`. Resultado: `processed = 0` em todas as execuções desde a hardening, **zero DMs enviadas**, e `brief_dm_sent_at` permanece `NULL` para todas as 1:1s.

**2. Leader DM nunca resolve liderado por NL**
`supabase/functions/slack-bot/index.ts:217` em `callLeaderMentorFromDM` envia hard-coded `mode: 'leader_self'` para `chat-mentor`, sem nenhuma tentativa de extrair nome de liderado da pergunta. `chat-mentor` no modo `leader_self` (ver `supabase/functions/_shared/soul/modes/leader-self.md`) por contrato redireciona qualquer pergunta sobre liderado específico — comportamento que aparece literalmente na imagem ("peça aqui mesmo no Slack: 'me fala sobre a Gabriela'"). Já temos `leader_with_member` resolvido perfeitamente no web (`MentorThread.tsx`) — falta só portar a resolução para a DM.

**3. SlackActivityCard isolado em uma única tela**
`rg SlackActivityCard` → único call site é `src/pages/MemberDetails.tsx:841` (sheet do liderado). `/lider/1on1s` foi promovido para `/lider/pessoas` (`src/pages/lider/OneOnOnes.tsx` virou `<Navigate>`). Pipeline back-end existe (`slack-ambient-classifier` 9/21h + `slack-weekly-rollup` 04:30h → `context_evidence(evidence_type='slack_activity_rollup')`) — só falta UI no Diário de Bordo.

---

### 💊 Solução proposta

**Fase 1 — Desbloquear DM proativa (root cause, 15 min)**

1. Migration: dropar e recriar o `cron.job` `rhitmo-orchestrator-every-30min` usando `current_setting('app.settings.cron_secret')` ou o valor literal do `CRON_SECRET` real (mesmo padrão dos jobs 35/36).
2. Validar imediatamente: `SELECT support_…` chamar a função via `curl_edge_functions` com o secret correto, esperar `200` + processar as 3 meetings travadas.
3. Backfill manual opcional: rodar a função 1× com `brief_dm_sent_at = NULL AND start_time >= now() - interval '2 hours'` ampliado para alcançar 1:1s da próxima hora.

**Fase 2 — Member resolution na DM (slack-bot/index.ts apenas)**

1. Em `callLeaderMentorFromDM`, antes de chamar `chat-mentor`:
   - Carregar `team_members` do workspace do líder (já temos `persona.workspaceId`).
   - Rodar um fuzzy match simples (Levenshtein/contains, case-insensitive) no `question` contra `name` e `first_name`.
   - Se **1 match único**, montar payload `mode: 'leader_with_member'` com `memberId`, `memberName`, `memberRole`, `feedbacks` (últimos 50, mesmo shape do `MentorThread`) e `workStyleData` quando existir.
   - Se 0 ou >1 matches, manter `leader_self` (comportamento atual).
2. Adicionar log `[DM-MENTOR] member_resolved: <name> (<id>)` para diagnóstico.
3. Sem mudanças em `chat-mentor`, schema ou RLS.

**Fase 3 — Atividade Slack como evidência no Diário de Bordo (`/lider/diario`)**

1. Estender `useContextTimeline`/`useTeamTimeline` (ou hook equivalente do Diário) para incluir `context_evidence` com `evidence_type IN ('slack_activity_rollup', 'slack_ambient_signal')`.
2. Renderizar entrada com badge "Slack" (ícone oficial), título "Atividade no Slack — semana de DD/MM", liderado, e snippet do rollup. Clique abre `EvidenceDrawer` (já existe, ver `useEvidence`).
3. Sem mudanças no pipeline back-end (já popula `context_evidence`).

---

### ⚠️ Riscos / regressões

- **Fase 1:** dropar o cron e recriar gera 1 ciclo sem execução (≤30 min). Idempotência por `brief_dm_sent_at IS NULL` garante que nada se perde. **Anti-regressão:** confirmar que `CRON_SECRET` env var continua igual antes/depois.
- **Fase 2:** match ambíguo (dois liderados com primeiro nome igual) cai no fallback `leader_self` — comportamento atual, sem perda. Match falso-positivo possível em frases tipo "tive ontem o Guilherme do RH" se `Guilherme` for liderado também — mitigado exigindo nome dentro de pergunta direta ("falei com", "feedback para", "como cobrar", etc.) **ou** apenas usando o match quando o nome estiver presente como token isolado.
- **Fase 3:** se a evidência for muito frequente, polui o feed — adicionar agrupamento semanal por liderado (uma entrada por rollup, não por sinal).

### 🧪 Validação

- (1) `curl_edge_functions /slack-rhitmo-orchestrator` com `CRON_SECRET` correto → `200 {processed:3+}` e `brief_dm_sent_at` preenchido nas 3 1:1s. Aguardar próximo tick do cron → DM chegar no Slack.
- (2) DM no Slack para o bot: "essa semana o que falei com Gabriela Lucas?" → resposta cita feedbacks reais com `[doc:UUID]`, não cai mais em coaching mode. Repetir com outro líder/liderado para garantir generalidade.
- (3) `/lider/diario` lista entradas "Atividade no Slack" mistas com feedbacks/1:1s, ordenadas por `occurred_at`. Click abre evidência original.

### 🧱 Ordem de execução proposta

```
Fase 1 (migration cron) → testar DM proativa
   ↓
Fase 2 (slack-bot member resolution) → testar conversa
   ↓
Fase 3 (Diário consome slack evidências) → validar UI
```

### 📝 Memórias a atualizar após resolver

- `mem://features/slack/proactive-dms-orchestrator` — adicionar nota sobre `CRON_SECRET` real (sem bypass).
- `mem://features/slack/conversational-state-machine` — registrar fluxo de member-resolution NL.
- Nova: `mem://features/diario/slack-evidence-integration`.

---

→ **Aplicar agora?** Posso começar pela Fase 1 (a mais crítica e isolada), e a partir do diagnóstico voltar com plano refinado das Fases 2 e 3. Ou tocar as três numa rodada só. Como prefere?
