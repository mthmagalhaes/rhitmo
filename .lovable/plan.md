

## Plano: Ajustar timing do bot e adicionar mensagem de consentimento

### Mudanças

**1. Reduzir `join_at` de 10 minutos para 2 minutos antes**

Arquivos: `supabase/functions/schedule-recall-bot/index.ts`, `supabase/functions/fetch-calendar-events/index.ts`

Trocar `10 * 60 * 1000` por `2 * 60 * 1000` em ambos os lugares onde o `joinAt` é calculado.

**2. Adicionar mensagem automática de consentimento no chat da reunião**

Arquivos: `supabase/functions/schedule-recall-bot/index.ts`, `supabase/functions/fetch-calendar-events/index.ts`

Adicionar o campo `chat` ao payload do Create Bot:

```json
{
  "meeting_url": "...",
  "join_at": "...",
  "bot_name": "Rhitmo",
  "chat": {
    "on_bot_join": {
      "send_to": "everyone",
      "message": "👋 Olá! Sou o assistente Rhitmo. Esta reunião está sendo transcrita para fins de anotações e desenvolvimento profissional. Se tiver dúvidas, fale com seu líder.",
      "pin": true
    },
    "on_participant_join": {
      "exclude_host": true,
      "message": "👋 Olá! Esta reunião está sendo transcrita pelo Rhitmo para fins de anotações e desenvolvimento profissional."
    }
  },
  "recording_config": {
    "transcript": {
      "provider": { "meeting_captions": {} }
    }
  }
}
```

- `on_bot_join` com `pin: true` — no Google Meet a mensagem fica fixada no topo do chat para todos.
- `on_participant_join` com `exclude_host: true` — quem entrar depois também recebe a mensagem, sem repetir para o organizador.

### Arquivos a modificar
- `supabase/functions/schedule-recall-bot/index.ts` — timing + chat
- `supabase/functions/fetch-calendar-events/index.ts` — timing + chat (auto-transcribe)

### Resultado esperado
- Bot entra 2 minutos antes da reunião (não 10).
- Ao entrar, envia mensagem pinada no chat avisando da transcrição.
- Participantes que entrarem depois também recebem o aviso.

