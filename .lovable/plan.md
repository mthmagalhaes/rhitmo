## Diagnóstico

### Problema 1 — "Descartar" não remove o card
No `PendingTranscriptsCard.tsx`, o botão **Descartar** está dentro do `<AlertDialog>` (envolvendo todo o bloco do card). Quando você clica, o `AlertDialog` interpreta como clique no trigger e abre o modal de confirmação do **Reprocessar**. Além disso, o `handleDismiss` faz `UPDATE recall_bots SET status = 'dismissed'`, mas o filtro do query usa `.in('status', PROBLEMATIC_STATUSES)` que **inclui `unrecoverable`** — ou seja, sem invalidar com status novo, ele de fato sairia. O bug visual é só o modal abrindo por cima.

**Correção:** mover o botão Descartar para FORA do `<AlertDialog>` e adicionar `e.stopPropagation()` defensivo. Já há invalidação de query, então o card desaparece sozinho após o update.

### Problema 2 — Transcrição "cortada"
Confirmei no banco:
- A `meeting_transcripts.transcript` da reunião 27/04 tem **71.187 caracteres** (transcrição COMPLETA, não corrompida ✅).
- Mas o `feedbacks.content` (que é o que aparece no Diário de Bordo do liderado) tem só **15.000 caracteres** — exatamente o `truncatedContent.slice(0, 15000)` aplicado no `reprocess-meeting/index.ts` linha 182.

Por isso a fala da Laís termina abrupta: o conteúdo é truncado em 15k chars antes de ser salvo no feedback. A transcrição original na tabela `meeting_transcripts` está íntegra.

**Correção:** salvar a transcrição **completa** no `feedbacks.content` (sem `.slice(0, 15000)`). O truncamento foi pensado para a IA de análise, mas não deve afetar o que o líder/liderado leem. A `analyze-feedback-background` já pode lidar com truncamento internamente se precisar.

## Mudanças

### 1. `src/components/dashboard/PendingTranscriptsCard.tsx`
- Reorganizar JSX: o `<AlertDialog>` envolve apenas o botão "Reprocessar". O botão "Descartar" fica como irmão, fora do dialog.
- Adicionar `e.stopPropagation()` no `onClick` do Descartar por segurança.

### 2. `supabase/functions/reprocess-meeting/index.ts`
- Linha 182: remover `truncatedContent` ou usar `formattedTranscript` direto no `feedbacks.content`.
- Linha 209: passar `formattedTranscript` (completo) em vez de `truncatedContent` para `createTranscriptAndFeedback`.
- Aplicar a mesma mudança em `supabase/functions/recall-webhook/index.ts` (mesma lógica de truncamento provavelmente está lá).
- Re-deploy das duas functions.

### 3. Recuperar a transcrição já distribuída de hoje
Como a transcrição completa está em `meeting_transcripts.transcript` (71k chars) mas os 6 feedbacks distribuídos têm só 15k, vou rodar um UPDATE para sincronizar o `feedbacks.content` com o transcript completo correspondente (apenas para os 6 feedbacks da reunião 27/04 do Matheus).

## Resultado esperado

- Botão Descartar funciona em 1 clique (sem abrir modal de Reprocessar).
- Os 5 liderados (Yasmin, Giovanna, Laís, Guilherme, Gabriela) passam a ver a transcrição **completa** (~71k chars) no Diário de Bordo, incluindo o trecho com Yas/Giovanna que estava cortado.
- Próximas reuniões processadas via Recall já gravam o conteúdo completo desde o início.
