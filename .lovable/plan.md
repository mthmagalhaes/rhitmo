## Sprint: Recall.ai bot reliability + chat hygiene

Resolve dois bugs encontrados na reunião `[Interno] Fator Seguradora` (13/05):

1. **Loop de bots fantasma** — bot bom morto a meio da gravação por falha do resolver de participantes; calendar sync reagenda repetidamente.
2. **Mensagem duplicada no chat do Meet** — `fetch-calendar-events` configura `on_participant_join` além de `on_bot_join`, gerando 1 mensagem por participante novo.

---

### Parte 1 — Parar o spam de chat (rápido, isolado)

**Arquivo: `supabase/functions/fetch-calendar-events/index.ts` (~linhas 337–347)**

- Remover bloco `on_participant_join` inteiro.
- Manter apenas `on_bot_join` com a mensagem padrão (mesma que `schedule-recall-bot` usa, para uniformidade).
- Resultado: bot envia **1 mensagem só**, no momento em que entra. Independente de quantas pessoas chegam depois.

Validação: agendar uma 1:1 de teste, observar chat do Meet — 1 mensagem.

---

### Parte 2 — Corrigir o resolver de participantes (causa raiz do bot morto)

**Arquivo: `supabase/functions/_shared/recallParticipants.ts`**

Refactor de `fetchAllRecallParticipants`:

- Hoje: lê `bot.meeting_participants` (legacy, frequentemente vazio) + tenta `participant_events` como complemento.
- Novo: chama **sempre** as duas fontes em paralelo, mescla, e adiciona um terceiro estado de retorno: `inconclusive`.
- Critério de `inconclusive`: ambas fontes vazias **e** o bot está `recording`/`in_call_recording` há < 90 s. Significa "ainda não consigo ler", não "ninguém está aqui".
- Adicionar log JSON estruturado: `{ bot_id, legacy_count, events_count, merged_count, decision, ms_since_recording_start }`.

Tipo de retorno passa de `RecallParticipant[]` para `{ status: 'ok' | 'inconclusive', participants: RecallParticipant[] }`.

---

### Parte 3 — Não matar o bot quando o resolver está cego

**Arquivo: `supabase/functions/check-pending-leader-presence/index.ts`**

- Quando resolver retornar `inconclusive`:
  - Não chamar `bot/leave/`.
  - Não marcar `skipped_no_leader`.
  - Empurrar `leader_check_due_at = now() + 3 min`.
  - Incrementar coluna nova `leader_check_attempts`.
  - Teto: 3 tentativas (≈ 14 min total a partir do `bot.in_call_recording`). Depois disso, sim, marcar `skipped_no_leader`.
- Quando resolver retornar `ok` com participantes vazios → comportamento atual mantido (líder ausente).

---

### Parte 4 — Bloquear o ciclo de reagendamento

**Arquivos: `supabase/functions/fetch-calendar-events/index.ts` + `supabase/functions/schedule-recall-bot/index.ts`**

- Trocar dedup `not("status", "in", '("error","done","skipped_no_leader")')` por `not("status", "in", '("done")')`.
- Dentro de janela de 30 min ao redor de `start_time`, **`skipped_no_leader` e `error` passam a bloquear** novo agendamento.
- Coluna nova `attempt_count` em `recall_bots`. Cap de 2 tentativas por evento por dia.
- Resultado: quando o bot 1 morrer, calendar sync **não cria** bot 2 minutos depois para o mesmo Meet link.

---

### Parte 5 — Migração

```sql
ALTER TABLE recall_bots
  ADD COLUMN IF NOT EXISTS attempt_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leader_check_attempts int NOT NULL DEFAULT 0;
```

Sem mudança de RLS. Sem novas tabelas.

---

### Parte 6 — Defesa final em `bot.done`

**Arquivo: `supabase/functions/recall-webhook/index.ts` (~linhas 108–147)**

- Antes de descartar transcript como `skipped_no_leader`, ler `recordings[*].started_at` / `ended_at` do payload.
- Se gravação efetiva ≥ 60 s, **nunca** descartar — manter transcript e processar normalmente. Se o bot ficou na call gravando algo útil, o líder vai querer ver.
- Sub-código `bot_kicked_from_waiting_room` → marcar como `error` (não `skipped_no_leader`), para não envenenar dedup.

---

## Validação ao final

1. `fetch-calendar-events` deploy → confirmar que body do POST para Recall não contém `on_participant_join`.
2. Forçar 1:1 de teste com 3 pessoas entrando em momentos diferentes → garantir 1 mensagem só no chat do Meet.
3. Olhar `_shared/recallParticipants.ts` log JSON na próxima reunião real → confirmar `legacy_count=0, events_count>0, decision=ok`.
4. Inspecionar `recall_bots` após 24 h: nenhuma reunião deve ter > 1 bot por evento.

---

## Arquivos tocados

- `supabase/functions/fetch-calendar-events/index.ts`
- `supabase/functions/_shared/recallParticipants.ts`
- `supabase/functions/check-pending-leader-presence/index.ts`
- `supabase/functions/recall-webhook/index.ts`
- `supabase/functions/schedule-recall-bot/index.ts`
- 1 migração SQL (2 colunas em `recall_bots`)

## Não tocar

- `automatic_leave.waiting_room_timeout = 120` fica como está. Subir esconde sintoma sem resolver causa.
- `schedule-recall-bot` já tem só `on_bot_join` — sem mudança no fluxo manual.
- Lógica de `bot.in_call_recording` agendar `leader_check_due_at = +5 min` continua igual.