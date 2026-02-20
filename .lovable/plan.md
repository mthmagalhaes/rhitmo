

## Pipeline de Classificacao Automatica de Notas

### Diagnostico

Tres problemas encontrados:

1. **upload-meeting NAO chama classify-note**: Apos transcrever o audio e inserir o feedback, a edge function `upload-meeting` dispara apenas `analyze-feedback-background` (para embedding), mas nunca chama `classify-note`. Resultado: transcricoes ficam sem tags e sem titulo AI.

2. **Fallback de titulo no front usa texto generico ruim**: Tanto `FeedbackTimeline` quanto `ContextPicker` exibem "Anotacao nao classificada" quando `title` e null, em vez de um formato legivel com data.

3. **NewNoteDialog ja funciona**: O fluxo manual de nova nota ja chama `classify-note` antes do INSERT e persiste o titulo no campo `title`. Nenhuma correcao necessaria aqui.

### Plano de Correcao

**Arquivo 1: `supabase/functions/upload-meeting/index.ts`**

Apos criar o feedback com sucesso (depois do INSERT na tabela feedbacks, ~linha 147), adicionar chamada ao `classify-note` para enriquecer a nota com tags e titulo AI:

- Fazer fetch para `classify-note` passando o `transcriptionText`
- Se retornar tags e/ou suggestedTitle, fazer UPDATE no feedback recem-criado
- Chamada non-blocking (try/catch), similar ao pattern ja usado para `analyze-feedback-background`
- Usar `supabaseServiceKey` no Authorization header para autenticar

**Arquivo 2: `src/components/FeedbackTimeline.tsx`**

Linha 90 -- trocar o fallback:
```text
// Antes:
const displayTitle = feedback.title || "Anotacao nao classificada";

// Depois:
const displayTitle = feedback.title || `Nota de ${formattedDate}`;
```

Remover o emoji fixo do fallback (o emoji ja nao faz sentido no novo formato).

**Arquivo 3: `src/components/ContextPicker.tsx`**

Linha 102 -- trocar o fallback:
```text
// Antes:
{fb.title || 'Anotacao nao classificada'}

// Depois:
{fb.title || `Nota de ${format(new Date(fb.occurred_at || fb.created_at), 'dd/MM/yyyy', { locale: ptBR })}`}
```

O `format` e `ptBR` ja estao importados neste arquivo.

### Detalhes Tecnicos

**Chamada classify-note no upload-meeting:**

```text
// Apos o bloco que cria o feedback (~linha 155)
if (transcriptionText && feedbackId) {
  try {
    const classifyResponse = await fetch(
      `${supabaseUrl}/functions/v1/classify-note`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: transcriptionText }),
      }
    );
    
    if (classifyResponse.ok) {
      const classifyData = await classifyResponse.json();
      const updates: Record<string, unknown> = {};
      
      if (classifyData.tags?.length > 0) {
        updates.tags = classifyData.tags;
      }
      if (classifyData.suggestedTitle) {
        updates.title = classifyData.suggestedTitle;
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('feedbacks')
          .update(updates)
          .eq('id', feedbackId);
      }
    }
  } catch (classifyErr) {
    console.error('Classification failed (non-critical):', classifyErr);
  }
}
```

### O que NAO muda

- Nenhuma nota historica sera reprocessada
- A logica do NewNoteDialog permanece intacta (ja funciona)
- A edge function classify-note nao precisa de alteracao
- Nenhuma migracao de banco necessaria
- O campo `title` na tabela feedbacks ja e o correto

