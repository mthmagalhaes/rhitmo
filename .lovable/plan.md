

## Plano: Speaker Diarization + Auto-agendamento + Meeting Captions

### 1. Speaker Diarization nativa (Recall.ai)

**Problema atual:** O webhook formata a transcrição com labels genéricos (`speaker`/`Participante`).

**Solução:** Após `bot.done`, além do transcript, buscar o endpoint `GET /api/v1/bot/{id}/speaker_timeline/` para obter os nomes reais dos participantes. O Recall.ai já faz diarização perfeita usando streams separados — os `speaker.name` vêm do nome do participante no Google Meet/Teams/Zoom.

**Mudanças:**

- **`recall-webhook/index.ts`**: Após buscar o transcript, fazer um segundo fetch para `/speaker_timeline/`. Usar o `speaker_id` do transcript para mapear ao `name` do speaker_timeline. O formato final fica: `**João Silva:** texto da fala`. Salvar o `speaker_timeline` completo no campo `transcript_data` (JSONB) para uso futuro.

### 2. Auto-agendamento de bot para todas as 1:1s

**Problema atual:** O líder precisa clicar "Transcrever" manualmente para cada reunião.

**Solução:** Adicionar uma coluna `auto_transcribe` (boolean, default false) na tabela `google_calendar_tokens`. Quando ativada, o `fetch-calendar-events` automaticamente chama `schedule-recall-bot` para cada reunião que tenha `meet_link` e ainda não tenha bot agendado.

**Mudanças:**

- **Migração SQL**: `ALTER TABLE google_calendar_tokens ADD COLUMN auto_transcribe BOOLEAN DEFAULT false;`
- **`fetch-calendar-events/index.ts`**: Após fazer upsert das reuniões, verificar se `auto_transcribe = true`. Se sim, para cada reunião com `meet_link` que não tenha bot agendado em `recall_bots`, criar automaticamente o bot via Recall.ai API (mesma lógica do `schedule-recall-bot`, mas server-to-server sem JWT do usuário).
- **`useCalendarIntegration.ts`**: Adicionar mutation `toggleAutoTranscribe` que faz update na tabela `google_calendar_tokens`.
- **`UpcomingMeetingsCard.tsx`**: Adicionar toggle "Transcrição automática" no header do card (ao lado de "Desconectar"). Quando ativo, os botões individuais "Transcrever" são substituídos por badges "Auto ✓". Manter botão manual como fallback para reuniões sem meet_link.

### 3. Meeting Captions como provider de transcrição

**Problema atual:** Usamos `provider: "default"` no bot, que pode ter custo adicional de $0.15/hora.

**Solução:** Trocar para `provider: "meeting_captions"` como padrão. Meeting Captions é **gratuito** (sem custo adicional), usa as legendas nativas do Google Meet/Teams/Zoom. Tem diarização precisa pois usa streams separados. A desvantagem (sem timestamps por palavra) não nos afeta, pois queremos apenas o texto.

**Mudanças:**

- **`schedule-recall-bot/index.ts`**: Alterar `transcription_options.provider` de `"default"` para `"meeting_captions"`. Adicionar fallback: se o body incluir `provider`, usar esse; senão, `"meeting_captions"`.
- **`fetch-calendar-events/index.ts`** (auto-schedule): Usar `"meeting_captions"` como provider padrão.

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Adicionar `auto_transcribe` em `google_calendar_tokens` |
| `supabase/functions/recall-webhook/index.ts` | Buscar speaker_timeline para nomes reais dos participantes |
| `supabase/functions/schedule-recall-bot/index.ts` | Trocar provider para `meeting_captions` |
| `supabase/functions/fetch-calendar-events/index.ts` | Auto-agendar bots quando `auto_transcribe = true` |
| `src/hooks/useCalendarIntegration.ts` | Adicionar `toggleAutoTranscribe` + expor `autoTranscribe` state |
| `src/components/dashboard/UpcomingMeetingsCard.tsx` | Toggle de auto-transcrição no header + badges "Auto ✓" |

### Custo estimado por reunião

- Bot joining: $0.50/hora (fixo Recall.ai)
- Transcrição (meeting_captions): **$0.00** (gratuito)
- Total: **~$0.50/hora** por reunião

