

## Plano: Integração Recall.ai para Transcrição Automática de Reuniões

### Diagnóstico: Por que o sistema atual não funciona

O pipeline atual depende de captura de áudio do lado do cliente (extensão Chrome com `tabCapture` ou popup com `getDisplayMedia`), o que falha por múltiplas razões:
- Requer ação manual do líder (selecionar aba, marcar "compartilhar áudio")
- Limitação de 25MB do Whisper (reuniões longas falham)
- Extensão Chrome é frágil (permissões, atualizações do Meet)
- Popup fecha se o líder navegar incorretamente

### Solução: Recall.ai como Meeting Bot

O Recall.ai envia um **bot** que entra na reunião do Google Meet automaticamente, grava, transcreve e entrega o resultado via webhook. Nenhuma ação do líder é necessária além de conectar o Calendar.

**Pricing:** $0.50/hora de reunião gravada (inclui transcrição built-in).

### Arquitetura

```text
Google Calendar (já integrado)
     │
     ▼
[fetch-calendar-events] ──► upcoming_meetings (já existe)
     │
     ▼
[schedule-recall-bot] ──► Recall.ai API: POST /api/v1/bot/
     │                      com join_at = start_time - 1min
     │                      meeting_url = meet_link
     ▼
     Bot entra na reunião automaticamente
     │
     ▼
[recall-webhook] ◄──── Recall.ai envia webhook (bot.done / transcript.done)
     │
     ▼
     Salva transcrição em meeting_transcripts
     Cria feedback automático (mesmo fluxo do upload-meeting)
     Dispara analyze-feedback-background
```

### Fase 1: Piloto Interno (escopo aprovado)

#### 1. Secret: RECALL_API_KEY
- Solicitar ao usuário a API key do Recall.ai via ferramenta `add_secret`
- Região sugerida: `us-east-1`

#### 2. Tabela: `recall_bots` (nova)
Rastreia bots enviados e seu status:
```sql
CREATE TABLE public.recall_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.upcoming_meetings(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  recall_bot_id TEXT NOT NULL,          -- ID retornado pela API do Recall
  meeting_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, joining, recording, done, error
  transcript TEXT,
  transcript_data JSONB,                -- transcript com speaker labels
  meeting_transcript_id UUID REFERENCES public.meeting_transcripts(id),
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. Edge Function: `schedule-recall-bot`
- Chamada pelo frontend quando o líder ativa "Transcrição Automática" para uma reunião específica (ou chamada automaticamente pelo `fetch-calendar-events`)
- Envia `POST` para `https://us-east-1.recall.ai/api/v1/bot/` com:
  - `meeting_url`: link do Google Meet
  - `join_at`: horário agendado (start_time - 1 min)
  - `transcription_options.provider`: `"recallai"`
  - `bot_name`: `"Rhitmo"`
- Salva o `recall_bot_id` na tabela `recall_bots`

#### 4. Edge Function: `recall-webhook`
- Endpoint público (sem JWT) que recebe webhooks do Recall.ai
- Eventos relevantes: `bot.status_change`, `bot.transcription_complete`
- Quando transcrição completa:
  1. Busca transcrição via `GET /api/v1/bot/{id}/transcript/`
  2. Salva em `meeting_transcripts` (mesmo schema atual)
  3. Cria feedback automático no diário de bordo
  4. Dispara `analyze-feedback-background` (não-bloqueante)
  5. Atualiza `recall_bots.status = 'done'`

#### 5. UI: Botão "Transcrever" no UpcomingMeetingsCard
- No card de cada reunião futura com `meet_link`, adicionar botão "Transcrever automaticamente"
- Ao clicar, chama `schedule-recall-bot`
- Badge de status: "Bot agendado" → "Gravando" → "Transcrito ✓"
- Mantém o fluxo existente de gravação manual como fallback

#### 6. Ajuste no `fetch-calendar-events`
- Para o piloto: **não** agendar bots automaticamente
- Apenas marcar reuniões que têm `meet_link` como "elegíveis para transcrição"

### O que NÃO muda
- Pipeline atual de gravação manual (extensão Chrome + popup) continua funcionando como fallback
- Tabela `meeting_transcripts` e fluxo de análise AI permanecem iguais
- Google Calendar OAuth já está implementado e funcional

### Arquivos criados/modificados

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Criar tabela `recall_bots` com RLS |
| `supabase/functions/schedule-recall-bot/index.ts` | **Novo** — Agendar bot no Recall.ai |
| `supabase/functions/recall-webhook/index.ts` | **Novo** — Receber webhooks e processar transcrição |
| `src/components/dashboard/UpcomingMeetingsCard.tsx` | Botão "Transcrever" por reunião |
| `src/hooks/useCalendarIntegration.ts` | Adicionar mutation para agendar bot |

### Pré-requisito
Você precisará criar uma conta no [Recall.ai](https://recall.ai), obter a API key, e configurar o webhook URL apontando para `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/recall-webhook`.

