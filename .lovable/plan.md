

## Correções Recall.ai + Atualização de Documentação

### Problemas identificados

1. **Deduplicação falha no `fetch-calendar-events`**: verifica apenas `meeting_id`, mas não `meeting_url`. Reuniões recorrentes com o mesmo link geram bots duplicados.
2. **Sem timeouts de auto-leave no bot**: o bot fica na sala de espera ou em chamada sem gravar indefinidamente, acumulando "machine time".
3. **`fetch-calendar-events` não salva `leader_email`** ao criar bots via auto-schedule (linha 348-356), impedindo a detecção de presença do líder.
4. **`setTimeout` no webhook não funciona**: Edge Functions Deno encerram após o `return` — o `setTimeout` de 3 minutos nunca executa.

### Plano de implementação

**1. Corrigir `fetch-calendar-events/index.ts`**
- Adicionar deduplicação por `meeting_url` como fallback (além de `meeting_id`)
- Salvar `leader_email: authUser.email` no insert de `recall_bots`
- Adicionar `automatic_leave` config ao body do Recall API:
  ```
  automatic_leave: {
    waiting_room_timeout: 120,        // 2 min na sala de espera → sai
    in_call_not_recording_timeout: 180, // 3 min sem gravar → sai
    noone_joined_timeout: 300,         // 5 min sozinho → sai
  }
  ```

**2. Corrigir `schedule-recall-bot/index.ts`**
- Adicionar deduplicação por `meeting_url` (fallback)
- Adicionar mesmos `automatic_leave` timeouts
- `leader_email` já está sendo salvo ✓

**3. Corrigir `recall-webhook/index.ts`**
- **Remover `setTimeout`** (não funciona em Deno Edge Functions)
- Substituir por verificação síncrona imediata: ao receber `bot.in_call_recording`, verificar participantes direto (sem grace period) e marcar `leader_detected`. Se não encontrar, marcar para re-verificação no próximo webhook event (`bot.call_ended`/`bot.done`)
- Alternativa: usar uma flag `recording_started_at` e verificar presença no `bot.done` — se líder nunca foi detectado, descartar transcrição

**4. Gerar `cost-analysis.md` atualizado**
- Adicionar seção sobre custos de "machine time" (~$0.25-0.35/h) além da transcrição ($0.15/h)
- Atualizar custo efetivo por reunião: ~$0.20-0.25 por reunião de 30min (machine + transcription)
- Documentar otimizações implementadas (auto-leave, deduplicação, detecção de presença)

**5. Atualizar `rhitmo-technical-report-april-2026.md`**
- Seção Recall.ai: adicionar detalhes de `automatic_leave`, deduplicação, e presença do líder
- Atualizar modelo de billing para refletir machine time + transcription

### Detalhes técnicos

A correção mais crítica é o `setTimeout` no webhook — Edge Functions encerram ao retornar a response, então o timer de 3 min nunca dispara. A solução é verificar presença de forma síncrona no evento `bot.in_call_recording` (imediata, sem grace) e novamente no `bot.done` antes de processar.

