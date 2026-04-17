---
name: Recall.ai Bot Transcription Architecture
description: Arquitetura híbrida de detecção de líder com trigger_source (auto_calendar vs manual) para bots Recall.ai, incluindo cron de 5 min e validação no bot.done
type: feature
---

# Arquitetura de transcrição via bot Recall.ai

## Origem do agendamento — `recall_bots.trigger_source`

Toda linha em `recall_bots` carrega `trigger_source` (default `auto_calendar`):

| Valor | Quem insere | Comportamento |
|---|---|---|
| `auto_calendar` | `fetch-calendar-events` (sync automática do Google Calendar) | Aplica grace window de 5 min para detectar líder. Se ausente → bot sai com `skipped_no_leader`. |
| `manual` | `schedule-recall-bot` invocado pelo botão "Transcrever" do líder | NÃO aplica auto-leave por presença. Confia no clique explícito. Valida só no `bot.done`. |

## Fluxo de detecção de líder

1. **`bot.in_call_recording` (webhook)** — `recall-webhook/index.ts`:
   - Se `trigger_source = auto_calendar` e `leader_check_due_at` ainda não foi setado → marca `leader_check_due_at = now() + 5 min`. Não faz check síncrono (roster do Recall demora 30-60s para popular).
   - Se `trigger_source = manual` → não faz nada. Bot grava normalmente.

2. **Cron `check-pending-leader-presence` (a cada 1 min)** — Edge Function:
   - Busca bots com `status = recording AND leader_detected = false AND trigger_source = auto_calendar AND leader_check_due_at <= now()`.
   - Para cada um: chama Recall API `bot/{id}/`, verifica `meeting_participants`. Se líder presente → marca `leader_detected = true`. Se ausente → chama `bot/{id}/leave/` e marca `status = skipped_no_leader`.

3. **`bot.done` (webhook)** — última oportunidade:
   - Se `leader_email` setado e `leader_detected = false` → re-checa via Recall API antes de processar transcrição.
   - Se `status = skipped_no_leader` ou líder nunca detectado → descarta transcrição sem criar `meeting_transcript`.
   - Se líder detectado → cria `meeting_transcripts` + `feedbacks` para todos os membros vinculados ao Google event ID / meet_link.

## Por que NÃO usar setTimeout no webhook

Edge Functions Deno terminam imediatamente após o `Response`. Qualquer `setTimeout` é perdido. Por isso o delay de 5 min é implementado via timestamp em coluna + cron worker externo.

## Custos por cenário

| Cenário | trigger_source | Custo Recall (~$0.01/min) |
|---|---|---|
| Líder vai à reunião agendada | `auto_calendar` | Reunião completa ($0.30 / 30min) |
| Líder NÃO vai à reunião agendada | `auto_calendar` | ~5 min descartados ($0.05) |
| Líder clica "Transcrever" mid-call | `manual` | Reunião completa, zero risco de race condition |

## Arquivos críticos

- `supabase/functions/recall-webhook/index.ts` — gerencia eventos do bot, agenda check diferido
- `supabase/functions/check-pending-leader-presence/index.ts` — worker cron de validação após grace window
- `supabase/functions/schedule-recall-bot/index.ts` — invocado pela UI (botão "Transcrever"), default `trigger_source = manual`
- `supabase/functions/fetch-calendar-events/index.ts` — sync de calendário, insere bot direto (default `auto_calendar`)
- `src/hooks/useCalendarIntegration.ts` — hook `scheduleBot` passa `trigger_source: 'manual'`
- Cron job `check-pending-leader-presence-every-minute` (1 min)

## Provider e região

- API region: `us-west-2.recall.ai`
- Transcript provider: `recallai_streaming` com `mode: prioritize_accuracy`, `language_code: auto`
- Bot identification: `bot_name = "Rhitmo"` com mensagens de chat de aviso de privacidade
