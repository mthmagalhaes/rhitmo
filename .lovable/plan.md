

## Plano: Transcricao como Nota Unificada na Base de Conhecimento

### Resumo

Transformar o fluxo pos-upload para que cada transcricao finalizada seja automaticamente inserida como uma nota (feedback) padrao na tabela `feedbacks`, com `source = 'transcription'`. Isso unifica transcrições e notas manuais em uma unica base de conhecimento, sem necessidade de filtros especiais em avaliacoes ou mentor chat.

---

### O que ja existe e funciona a nosso favor

- Tabela `feedbacks` ja possui coluna `source` (valor atual: `'manual'`) e `meeting_transcript_id` (FK opcional)
- `generate-review` ja busca todos os feedbacks por `member_id` + periodo -- transcrições serao incluidas automaticamente
- `chat-mentor` (RAG) ja usa feedbacks como base -- transcrições entram sem alteracao
- `ContextPicker` ja lista feedbacks para selecao manual no Mentor Chat
- `FeedbackTimeline` ja renderiza feedbacks -- so precisa do icone de microfone

---

### Alteracoes Necessarias

#### 1. Edge Function `upload-meeting` -- Adicionar transcricao + criacao de feedback

Apos o upload do audio e criacao do registro em `meeting_transcripts`, a funcao deve:

1. Baixar o arquivo do storage
2. Enviar para OpenAI Whisper (reutilizando logica do `transcribe-audio`)
3. Gerar titulo automatico: se `meeting_title` foi informado, usar ele; senao, `"Transcricao de Audio - DD/MM/YYYY"`
4. Inserir na tabela `feedbacks` com:
   - `source`: `'transcription'`
   - `meeting_transcript_id`: ID do registro criado
   - `content`: texto transcrito
   - `title`: titulo gerado
   - `type`: `'neutral'`
   - `member_id`, `manager_id`: do contexto
   - `occurred_at`: timestamp atual
   - `visibility`: `'private_leader'` (padrao de privacidade)
5. Atualizar `meeting_transcripts.processing_status` para `'completed'` e salvar o texto em `transcript`
6. Disparar `analyze-feedback-background` para gerar embedding (RAG) e classificacao

**Observacao sobre Whisper:** O arquivo `.webm` pode ser grande. Se exceder 25MB (limite do Whisper), truncar ou segmentar. Para a maioria das reunioes de ate 1h, o `.webm` com opus fica abaixo desse limite.

#### 2. Frontend: `FeedbackTimeline.tsx` -- Icone de microfone

- Verificar `feedback.source === 'transcription'` (ou presenca de `meeting_transcript_id`)
- Se sim, exibir icone `Mic` em vez do icone de visibilidade padrao (Lock/Eye)
- Manter a mesma estrutura de lista, badge "Compartilhado", etc.
- Adicionar um `Badge` discreto "Transcrição" ao lado da data para diferenciar visualmente

**Nota:** A interface `Feedback` no componente precisa incluir `source` como campo opcional.

#### 3. Frontend: `ContextPicker.tsx` -- Nenhuma alteracao necessaria

O ContextPicker ja lista feedbacks por `member_id`. Transcrições com `source = 'transcription'` aparecerao automaticamente na lista. O titulo gerado ("Transcricao de Audio - DD/MM") sera visivel para selecao.

#### 4. Avaliacao Formal (`generate-review`) -- Nenhuma alteracao necessaria

A funcao ja busca `feedbacks` por `member_id` + periodo (`occurred_at`). Transcrições serao incluidas automaticamente no contexto da IA. Nao ha filtro por `source` ou `type` que precisaria ser removido.

#### 5. Mentor Chat (`chat-mentor`) -- Nenhuma alteracao necessaria

O RAG ja indexa embeddings de todos os feedbacks. O `ContextPicker` ja lista todos. Transcrições entram na base de conhecimento automaticamente apos o embedding ser gerado pelo `analyze-feedback-background`.

---

### Detalhes Tecnicos

**Arquivo: `supabase/functions/upload-meeting/index.ts`**

Adicionar apos a criacao do `meeting_transcripts`:

```text
1. Ler o blob do storage (ou usar o proprio File do FormData)
2. Enviar para Whisper API (OpenAI)
3. Com o texto retornado:
   a. Atualizar meeting_transcripts: transcript = texto, processing_status = 'completed'
   b. Inserir em feedbacks: source='transcription', content=texto, title=auto, type='neutral'
   c. Chamar analyze-feedback-background (async, sem bloquear resposta)
4. Retornar sucesso com transcript_id e feedback_id
```

**Arquivo: `src/components/FeedbackTimeline.tsx`**

- Adicionar `source?: string` e `meeting_transcript_id?: string` na interface `Feedback`
- No render de cada item, antes do icone de visibilidade:
  - Se `source === 'transcription'`: mostrar `Mic` icon em azul/primary
  - Senao: manter Lock/Eye atual
- Adicionar Badge "Transcrição" discreto quando aplicavel

**Arquivo: `src/components/MeetingRecorder.tsx`**

- Atualizar a mensagem de sucesso para refletir que a transcrição sera criada como nota
- Invalidar queries de feedbacks apos sucesso para que a timeline atualize

**Nenhuma migracao de banco necessaria** -- as colunas `source` e `meeting_transcript_id` ja existem na tabela `feedbacks`.

---

### Fluxo Completo Apos Implementacao

```text
Lider grava reuniao
  -> Audio enviado para upload-meeting
  -> Upload no storage
  -> Whisper transcreve o audio
  -> Texto inserido como feedback (source='transcription')
  -> Embedding gerado (analyze-feedback-background)
  -> Nota aparece na Timeline com icone de microfone
  -> Disponivel no Mentor Chat (auto-RAG e ContextPicker)
  -> Incluida automaticamente em Avaliacoes Formais do periodo
```

