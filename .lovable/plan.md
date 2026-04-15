

## Problema

O bot Recall.ai entra em todas as reuniões agendadas automaticamente, mesmo que o líder não participe. Isso gera custos desnecessários (~$0.15/h por reunião) e transcrições sem valor.

## Opções de Solução

### Opção A: Detecção de presença do líder (recomendada)

Usar o webhook `bot.in_call_recording` para verificar a lista de participantes. Se o líder não estiver presente após X minutos, remover o bot automaticamente.

**Fluxo:**
1. Bot entra na reunião normalmente (2 min antes)
2. Ao receber `bot.in_call_recording`, consultar a API do Recall para listar participantes
3. Se após 3-5 minutos o líder (email do Google Calendar) não estiver na lista de participantes → chamar `DELETE /api/v1/bot/{id}/leave` para remover o bot
4. Atualizar `recall_bots.status` para `"skipped_no_leader"`

**Prós:** Funciona automaticamente, sem ação do líder
**Contras:** O bot ainda entra (custo mínimo ~1-2 min), depende da API de participantes do Recall

### Opção B: Agendamento manual (opt-in por reunião)

Não agendar automaticamente. O líder clica "Transcrever" em cada reunião no dashboard.

**Prós:** Zero custo desnecessário, controle total
**Contras:** Fricção alta, líder pode esquecer

### Opção C: Híbrida (recomendada para implementação)

Manter auto-schedule, mas adicionar lógica de "grace period" no webhook:

1. **No `recall-webhook`**, ao receber `bot.in_call_recording`:
   - Buscar o email do líder (via `recall_bots.user_id` → `auth.users.email`)
   - Chamar `GET /api/v1/bot/{recall_bot_id}/` para obter lista de participantes
   - Se o líder não estiver presente, agendar uma verificação (ou usar um campo `leader_joined` no registro)

2. **Adicionar um campo `leader_detected`** na tabela `recall_bots` (boolean, default false)

3. **No webhook `bot.call_ended` ou `bot.done`**:
   - Se `leader_detected = false`, descartar a transcrição (não processar) e marcar como `skipped`
   - Isso evita o custo de processamento de IA, embora o custo do Recall ($0.15/h) já tenha sido incorrido

### Limitação importante

O Recall.ai cobra pelo tempo que o bot está na call, **independentemente** de processarmos ou não a transcrição. Ou seja:
- **Opção A** minimiza o custo (bot sai em ~3 min = custo mínimo)
- **Opção C** evita custo de IA mas não evita custo do Recall
- **Opção B** é a única que evita 100% do custo

## Recomendação

**Implementar Opção A** (detecção de presença + auto-leave). É a melhor relação custo-benefício:
- Custo de bot que sai em 3 min é negligenciável
- Não adiciona fricção ao líder
- Evita transcrições inúteis e custos de IA

### Arquivos a modificar

1. **`supabase/functions/recall-webhook/index.ts`** — Adicionar lógica no evento `bot.in_call_recording` para verificar participantes e remover bot se líder ausente
2. **Migração SQL** — Adicionar coluna `leader_detected boolean default false` na tabela `recall_bots`
3. **`supabase/functions/schedule-recall-bot/index.ts`** — Salvar email do líder no registro para facilitar a comparação

### Nota sobre a API Recall

A verificação de participantes usa `GET /api/v1/bot/{id}/` que retorna `meeting_participants`. Precisamos confirmar que o email do participante é retornado (em Google Meet, geralmente sim).

