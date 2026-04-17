

Você tocou no ponto crítico. Tem 3 cenários que precisam coexistir:

1. **Auto-agendado pelo calendário, líder vai** → grava normal ✅
2. **Auto-agendado pelo calendário, líder NÃO vai** (reunião do liderado com outras pessoas) → não pode gravar ❌
3. **Líder clica "transcrever" mid-call** → grava (líder está lá, é explícito) ✅

A Opção B pura (remover auto-leave) quebra o cenário 2 — vira gravação não-autorizada de reuniões que o líder nem sabia que existiam. Risco de privacidade real.

A Opção A original (5 min de espera) resolve cenário 2 mas mantém o bug do mid-call (cenário 3).

## Plano híbrido — distinguir origem do agendamento

Adicionar campo `trigger_source` em `recall_bots` com 2 valores:
- `auto_calendar` → bot agendado automaticamente pela sync do Google Calendar. **Aplica regra dos 5 min**: se líder não detectado em 5 min, sai.
- `manual` → líder clicou "transcrever" (seja antes da reunião, seja mid-call). **Não aplica auto-leave por presença**: confia no clique explícito, valida só no `bot.done`.

### Como fica o fluxo

| Cenário | trigger_source | Comportamento |
|---|---|---|
| 1. Calendar + líder vai | `auto_calendar` | Detecta líder em ≤5 min → grava até o fim |
| 2. Calendar + líder NÃO vai | `auto_calendar` | Não detecta em 5 min → bot sai, status `skipped_no_leader` |
| 3. Mid-call manual | `manual` | Grava sempre, valida no `bot.done` |
| 4. Pré-agendado manual | `manual` | Grava sempre, valida no `bot.done` |

### Implementação do delay de 5 min (sem setTimeout)

Como Edge Functions Deno terminam após o response, vou usar abordagem por **timestamp + cron de 1 min**:

1. **Migration**: 
   - `recall_bots.trigger_source text default 'auto_calendar'`
   - `recall_bots.leader_check_due_at timestamptz` (preenchido com `now() + 5 min` quando o bot começa a gravar, **só se trigger_source = auto_calendar**)

2. **`schedule-recall-bot/index.ts`**: aceitar parâmetro `trigger_source` (default `auto_calendar`) e gravar no insert.

3. **`MeetingRecorder.tsx` / botão "Transcrever"**: passar `trigger_source: 'manual'` ao invocar `schedule-recall-bot`.

4. **`recall-webhook/index.ts`**: 
   - No `bot.in_call_recording`: **remover** check síncrono de líder. Em vez disso, **se trigger_source = auto_calendar**, setar `leader_check_due_at = now() + 5 min`.
   - No `bot.done`: validar líder uma vez (igual hoje) — vale para ambos os casos.

5. **Nova edge function `check-pending-leader-presence`** + cron a cada 1 min:
   - Busca bots com `leader_check_due_at <= now() AND status = 'recording' AND leader_detected = false AND trigger_source = 'auto_calendar'`.
   - Para cada um: chama `checkLeaderPresence()`. Se líder ainda não está → `bot.leave()` e marca `skipped_no_leader`.

### Custos
- Cenário 2 (líder não vai): paga ~5 min × $0.01 = **$0.05** por reunião descartada (vs $0.30 da reunião inteira). Aceitável.
- Cenário 3 (mid-call): paga 100% da reunião. Mas só acontece quando líder clica explicitamente — é o resultado desejado.
- Edge Functions adicionais: ~1.440 invocações/dia da cron, custo desprezível.

### UX leader
- "Auto-transcrever" ligado: comportamento confiável, bot só fica se líder aparece em até 5 min.
- Botão "Transcrever" na reunião: funciona sempre, sem race condition.
- Próxima iteração (futuro): toggle "transcrever esta reunião?" na lista de upcoming meetings, pra dar controle explícito do cenário 2 antes de virar 5 min de bot rodando à toa.

## Arquivos
- Migration: `recall_bots` + cron job
- `supabase/functions/recall-webhook/index.ts` (mudar lógica do `in_call_recording`)
- `supabase/functions/schedule-recall-bot/index.ts` (aceitar `trigger_source`)
- `supabase/functions/check-pending-leader-presence/index.ts` (nova)
- `src/components/MeetingRecorder.tsx` (passar `trigger_source: 'manual'`)
- Memory update: `mem://features/recall-ai/bot-transcription-architecture`

Zero mudanças visuais no frontend. Reunião perdida do matheus + Gabriela continua irrecuperável.

