

## Bias Detection Visual -- Plano de Implementacao

### Resumo

Tornar visivel o campo `bias_alert` que ja existe no banco, mudando o formato de string simples para objeto JSON estruturado nas Edge Functions, e criando um componente visual no frontend para exibir os alertas de vies.

### Parte 1 -- Edge Functions (bias_alert estruturado)

**Arquivos:** `supabase/functions/analyze-feedback-background/index.ts` e `supabase/functions/analyze-feedback/index.ts`

Alteracoes identicas em ambas as funcoes:

1. **Tool schema `toolsRichText`**: substituir `bias_alert` de `{ type: "string" }` para o objeto estruturado:
```text
bias_alert: {
  type: "object",
  properties: {
    detected: { type: "boolean" },
    summary: { type: "string" },
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phrase: { type: "string" },
          type: { type: "string", enum: ["generalizacao","personalidade","genero","comparacao","rotulo"] },
          suggestion: { type: "string" }
        },
        required: ["phrase","type","suggestion"]
      }
    }
  },
  required: ["detected","summary","flags"]
}
```

2. **Tool schema `toolsShortNote`**: substituir `bias_alert` para o mesmo objeto, mas com descricao indicando que deve retornar `{ detected: false, summary: "", flags: [] }` em notas curtas (exceto linguagem ofensiva grave).

3. **System prompt**: adicionar secao "DETECCAO DE VIES ESTRUTURADA" com instrucoes para:
   - Identificar trechos EXATOS do texto
   - Categorizar em 5 tipos (generalizacao, personalidade, genero, comparacao, rotulo)
   - Tom educativo, nunca acusatorio
   - Exemplos de cada tipo

4. **Salvar no banco**: antes do `supabase.update()`, converter `analysis.bias_alert` para string: `JSON.stringify(analysis.bias_alert)`. O campo continua TEXT no banco.

5. **Fallback truncado**: atualizar o fallback de `finishReason === 'length'` para usar `JSON.stringify({ detected: false, summary: "", flags: [] })`.

### Parte 2 -- Componente BiasDetectionPanel

**Novo arquivo:** `src/components/BiasDetectionPanel.tsx`

- Props: `{ biasAlert: string | null }`
- Logica interna:
  1. Tenta `JSON.parse(biasAlert)` -- se falhar, trata como string legada (exibe texto simples se nao for "Nenhum vies detectado")
  2. Se `detected === false` ou `flags` vazio: nao renderiza nada
  3. Se `detected === true`: painel colapsavel (Collapsible do Radix) com:
     - **Header**: icone AlertTriangle amber-500, texto "Atencao ao tipo de linguagem", Badge com count de flags, Chevron (colapsado por padrao)
     - **Body**: summary em texto muted, cada flag com trecho original (bg-amber-50, border-l-2 amber-400), Badge do tipo, seta e sugestao (bg-green-50)
     - **Footer**: disclaimer "Sugestoes geradas por IA para apoiar feedback mais objetivo. Revise antes de usar."

### Parte 3 -- Integracao na FeedbackTimeline

**Arquivo:** `src/components/FeedbackTimeline.tsx`

1. Adicionar `bias_alert` a interface `Feedback`
2. Na area expandida (`CollapsibleContent`), apos `renderSanitizedContent`, adicionar `<BiasDetectionPanel>` condicionalmente:
   - So exibir se content tiver 50+ palavras (contagem inline)
   - Passar `feedback.bias_alert`

### O que NAO muda

- Schema da tabela feedbacks (bias_alert continua TEXT)
- Nenhuma outra Edge Function
- Fluxo de criacao de notas
- Nenhum outro componente

### Secao Tecnica -- Backward Compatibility

- Notas legadas com bias_alert como string simples (ex: "Nenhum vies detectado") serao tratadas gracefully pelo `JSON.parse` try/catch no componente
- Notas RAG (com bias_alert null) nao renderizam o painel
- O formato novo e um superset: o campo TEXT aceita tanto string quanto JSON serializado
