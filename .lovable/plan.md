

## Diagnostico e Correcao -- Bias Detection

### Diagnostico

Query executada:
```text
SELECT id, title, LEFT(content, 50), bias_alert, created_at
FROM feedbacks ORDER BY created_at DESC LIMIT 5;
```

**Resultado: CASO A** -- `bias_alert` e NULL em todas as notas recentes, incluindo a nota "Ela sempre se emociona, nunca e objetiva..." que claramente contem vies.

**Causa raiz:** O `NewNoteDialog.tsx` salva a nota no banco mas **nunca chama** a Edge Function `analyze-feedback-background`. Apos o insert, ele so chama `backup-data` (fire-and-forget). A funcao de analise background so e chamada pelo `upload-meeting` (transcricoes de audio). Notas manuais nunca recebem analise de IA.

---

### Correcao

**Arquivo: `src/components/NewNoteDialog.tsx`**

Apos o insert bem-sucedido e antes do backup, adicionar chamada fire-and-forget para `analyze-feedback-background`:

```text
// Fire-and-forget: trigger AI analysis (bias detection, summary, sentiment)
if (feedback?.id) {
  supabase.functions.invoke('analyze-feedback-background', {
    body: { feedbackId: feedback.id }
  }).catch(err => {
    console.warn('Background analysis failed (non-critical):', err);
  });
}
```

Posicao: logo apos a linha `onSuccess()` e antes do bloco de backup existente.

**Arquivo: `src/components/FeedbackTimeline.tsx`**

Adicionar botao de reprocessamento visivel apenas em desenvolvimento, dentro do `CollapsibleContent`, apos o `BiasDetectionPanel`:

- Botao discreto com icone RefreshCw e texto "Reanalisar"
- Visivel apenas quando `window.location.hostname` inclui "localhost" ou "preview"
- Ao clicar, chama `supabase.functions.invoke('analyze-feedback-background', { body: { feedbackId: feedback.id } })`
- Toast de confirmacao apos sucesso

**Reprocessar notas existentes:**

Executar query SQL para limpar campos de analise das notas recentes, permitindo reprocessamento:

```text
UPDATE feedbacks 
SET bias_alert = NULL, summary = NULL, sentiment = NULL, coaching_tips = NULL
WHERE created_at > NOW() - INTERVAL '2 days'
AND (bias_alert IS NULL OR bias_alert NOT LIKE '{%}')
RETURNING id, title;
```

Apos a limpeza, o botao "Reanalisar" na timeline permitira reprocessar cada nota individualmente.

---

### Secao Tecnica

Arquivos alterados:
- `src/components/NewNoteDialog.tsx` -- adicionar chamada fire-and-forget para analyze-feedback-background
- `src/components/FeedbackTimeline.tsx` -- adicionar botao de reprocessamento (dev only)

Nenhuma alteracao em:
- Edge Functions (ja estao corretas com schema estruturado)
- Schema do banco
- RLS policies
- Nenhum outro componente

