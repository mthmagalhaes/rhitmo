# Plano: 3 gaps de Calendário/Bot/Slack

## Diagnóstico

### Gap 1 — Brief Slack avisa de 1:1 que já não existe (Giovanna)
A DM "Vi que você tem 1:1 com Giovanna amanhã" foi enviada pelo `slack-rhitmo-orchestrator` há ~13h. Depois disso, ela remarcou a reunião para ontem (passada).

Causas:
1. `fetch-calendar-events` **não filtra `event.status === 'cancelled'`** do Google Calendar — eventos cancelados/movidos ficam órfãos até o cleanup de `start_time < now-1h`.
2. Quando o evento é remarcado para uma data passada, o upsert atualiza `start_time` mas a DM já foi enviada e **nunca é retratada/atualizada** no Slack.
3. `brief_dm_sent_at` é IS NULL → marcado, sem revalidação. Se o evento se mover dentro da janela, nenhum follow-up acontece.

### Gap 2 — 1:1 Laís + Guilherme não criou bot nem apareceu no painel
Em `fetch-calendar-events:291-295` há uma guarda explícita:
> *"More than one DISTINCT member matched → group meeting in disguise, skip."*

Quando 2+ membros do time estão na MESMA reunião, ela é descartada como "reunião em grupo disfarçada". Não entra em `upcoming_meetings` → não aparece no painel → bot não é agendado.

A regra existe para evitar tratar planning/all-hands como 1:1, mas é binária demais. 1:1s legítimas com 2 liderados (skip-level, mentoria conjunta, par programming) viram invisíveis.

### Gap 3 — Não dá pra enviar bot depois que a reunião já começou
A função `schedule-recall-bot` existe e aceita `meeting_url + start_time` manualmente, mas não há UI exposta para "puxar bot agora" quando o líder percebe que ele não entrou. Recall.ai aceita bots com `join_at` no presente (entra imediatamente).

---

## Mudanças propostas

### Sprint A — Brief não-mais-stale (Gap 1)

**1. `fetch-calendar-events/index.ts`**
- Filtrar `event.status === 'cancelled'` antes do upsert.
- Para eventos com `google_event_id` já existente em `upcoming_meetings` mas que sumiram do payload do Google **OU** vieram com `status='cancelled'`: deletar a linha (não esperar cleanup de 1h).
- Quando `start_time` mudar em mais de 15 min num evento que já tinha `brief_dm_sent_at`: resetar `brief_dm_sent_at = NULL` para o orchestrator reenviar com a hora nova (não dá pra editar mensagem antiga sem `ts`, então a opção pragmática é reenviar com prefixo "📅 Reagendado:").

**2. `slack-rhitmo-orchestrator/index.ts`**
- Antes de enviar a DM, revalidar: `start_time` ainda futuro **E** `member_id` ainda existe. (já filtra `gte('start_time', nowIso)` — manter, mas adicionar log claro se um meeting some entre cron e envio.)
- Considerar guardar `slack_message_ts` da DM enviada — abre porta para `chat.update` no futuro se o evento mudar (não implementar agora, só preparar coluna).

### Sprint B — 1:1 multi-membro visível (Gap 2)

**`fetch-calendar-events/index.ts:291-295`**
- Trocar "skip se size > 1" por: **se size entre 2 e 3 → criar uma linha em `upcoming_meetings` para CADA membro** (já temos `onConflict: user_id,google_event_id,member_id` que aceita múltiplos rows por evento).
- Manter o skip apenas se `size > 3` (aí é claramente grupo grande).
- Bot é agendado UMA vez por `meeting_url` (a dedup em `existingByUrl` já protege contra bots duplicados).
- No painel "Próximas 1:1s", se já existir lógica de dedup por `google_event_id`, mostrar a reunião com badge "Laís + Guilherme" (ver com `useCalendarIntegration` / componente do painel).

### Sprint C — "Enviar bot agora" (Gap 3)

**Backend:** `schedule-recall-bot` já aceita o caso. Só precisa permitir `start_time` no passado recente (até -30min) e setar `join_at = now()` quando o start já passou.

**Frontend:**
- Em `/lider/inicio` (ou painel de 1:1s recentes), adicionar botão **"🤖 Enviar bot agora"** em reuniões que:
  - estão acontecendo agora (start_time entre -30min e +5min de now), **OU**
  - terminaram nos últimos 30 min sem `recall_bot` associado.
- Botão chama `schedule-recall-bot` com `trigger_source: 'manual_retroactive'` e mostra toast "Bot entrando na reunião…".
- Em `recall_bots`, registrar o novo tipo de trigger pra telemetria.

**Limite:** Recall só consegue gravar o que ainda está acontecendo — o pedaço passado da reunião é perdido. Deixar isso claro no toast/confirm: *"O bot vai gravar a partir de agora; o que já passou não pode ser recuperado."*

---

## Ordem sugerida
1. **Sprint C primeiro** (resolve a dor imediata da Laís+Gui hoje — botão "enviar bot agora" + ajuste no schedule-recall-bot).
2. **Sprint B** (corrige a causa raiz: a reunião deveria ter sido detectada).
3. **Sprint A** (qualidade de vida: parar de mandar brief de reunião fantasma).

## Riscos
- **Sprint B:** mudar a regra de skip pode incluir reuniões que de fato são planning de 2 pessoas. Mitigação: cap em 3 membros + log; revisitar se HR reclamar.
- **Sprint A:** resetar `brief_dm_sent_at` ao remarcar pode duplicar DMs se Google Calendar disparar reschedules em série. Mitigação: só resetar se diferença > 15 min E enviar no máximo 1 reenvio (coluna `brief_dm_resent_at`).
- **Sprint C:** Recall cobra por bot. Limitar a 1 retroativo por reunião e respeitar o cap de plano que já existe em `schedule-recall-bot`.

Quer que eu siga primeiro pela C (botão de bot retroativo) ou prefere fazer A+B+C juntos?
