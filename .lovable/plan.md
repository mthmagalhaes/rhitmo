

## Plano: Transcrição no Diário + Multi-liderado + Contexto para Mentor/Meu Rhitmo + Help Center

### Diagnóstico

1. **Webhook → Diário de Bordo**: O `recall-webhook` salva a transcrição em `meeting_transcripts` mas **nunca cria um registro em `feedbacks`** (o Diário de Bordo). O `analyze-feedback-background` é chamado com `transcript_id` e `source: "recall_bot"`, mas a função só aceita `feedbackId` — ou seja, a análise automática **está quebrada** e a transcrição nunca aparece no diário.

2. **Reunião com múltiplos liderados**: O `fetch-calendar-events` já cria uma entrada em `upcoming_meetings` **por participante**. Porém o `recall_bots` salva apenas **um `member_id`** por bot. Quando a reunião tem 3 liderados, a transcrição só cria `meeting_transcript` e feedback para um deles.

3. **Mentor Chat / Meu Rhitmo**: O `chat-mentor` usa `compressContext` sobre `feedbacks` (notas) e busca semântica. Mas `meeting_transcripts` **nunca entram no contexto** — são dados invisíveis para a IA.

4. **Help Center**: Não menciona a feature de transcrição automática.

---

### 1. recall-webhook: Criar feedbacks automáticos no Diário de Bordo

**Problema**: A transcrição é salva em `meeting_transcripts` mas nunca cria um `feedback` (diário de bordo).

**Solução**: Após `bot.done`, além de salvar o `meeting_transcript`:
- Buscar **todos os `member_id`s** da tabela `upcoming_meetings` que compartilham o mesmo `google_event_id` ou `meeting_url` + `user_id`
- Para **cada liderado** encontrado:
  - Criar um `meeting_transcript` separado (com `member_id` correto)
  - Criar um `feedback` no diário de bordo com `type: 'meeting_transcript'`, `content` = transcrição formatada (truncada a 15k chars para economia), `source: 'recall_bot'`
  - Chamar `analyze-feedback-background` com o `feedbackId` correto (não `transcript_id`)
- Se nenhum membro for encontrado (reunião sem match), criar apenas o `meeting_transcript` com `member_id: null` como hoje

**Arquivo**: `supabase/functions/recall-webhook/index.ts`

### 2. analyze-feedback-background: Nenhuma mudança necessária

A função já funciona com `feedbackId` e faz análise + embedding. O problema era apenas que o webhook chamava com o parâmetro errado (`transcript_id`). Com a correção do passo 1, o pipeline funciona.

### 3. Mentor Chat + Meu Rhitmo: Incluir meeting_transcripts no contexto (sem explodir tokens)

**Problema**: As transcrições são invisíveis para a IA.

**Solução token-eficiente**: Na função `compressContext` (usada por `chat-mentor` e `meu-rhitmo`):
- Não enviar a transcrição bruta (pode ter 10k+ palavras)
- Usar o `summary` do feedback criado no passo 1 (gerado pelo `analyze-feedback-background`, ~100 palavras)
- A busca semântica via embeddings já capturará os feedbacks de transcrição porque terão embedding gerado

**Resultado**: Zero mudança no código do mentor — os feedbacks de transcrição entram naturalmente no RAG via o pipeline existente de `feedbacks` + embeddings.

### 4. Migração SQL: Adicionar coluna `source` em feedbacks

Para distinguir notas manuais de transcrições automáticas no diário:

```sql
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
```

Valores: `'manual'` (padrão), `'recall_bot'`, `'slack'`, `'magic_paste'`.

### 5. Help Center: Seção de Transcrição Automática

Adicionar card na lista de features do líder:
- Título: "Transcrição Automática"
- Subtítulo: "Suas reuniões transcritas e analisadas pela IA"
- Steps: Conectar Google Calendar, ativar toggle, bot entra automaticamente, transcrição aparece no diário

**Arquivo**: `src/pages/HelpCenter.tsx`

### 6. UI: Badge "Transcrição" no FeedbackTimeline

Para que o líder identifique visualmente quais notas vieram de transcrição automática:
- Se `feedback.source === 'recall_bot'`, mostrar badge "Transcrição" com ícone `Mic`
- Já existe lógica de badges por tipo no timeline

**Arquivo**: `src/components/FeedbackTimeline.tsx`

---

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Adicionar `source` em `feedbacks` |
| `supabase/functions/recall-webhook/index.ts` | Multi-membro + criar feedbacks no diário |
| `src/pages/HelpCenter.tsx` | Card "Transcrição Automática" |
| `src/components/FeedbackTimeline.tsx` | Badge visual para transcrições |

### Custo de tokens

- Transcrição de 1h ≈ 5k-15k palavras → summary de ~100 palavras via `analyze-feedback-background`
- Mentor Chat consome apenas o summary (~100 tokens) + embedding para busca semântica
- Impacto marginal nos custos de IA

