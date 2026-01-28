

## Plano: Corrigir Edge Functions com Modelos Inválidos

### Problema Detectado

Duas Edge Functions críticas estão usando um modelo OpenAI que **não existe**:

| Função | Modelo Atual (Inválido) | Modelo Correto |
|--------|------------------------|----------------|
| `analyze-feedback` | `gpt-5-mini-2025-08-07` | `gpt-4o-mini` |
| `analyze-feedback-background` | `gpt-5-mini-2025-08-07` | `gpt-4o-mini` |

Isso impede que feedbacks sejam analisados corretamente - a OpenAI retornará erro ao receber chamadas com esse modelo inexistente.

---

### Correção a Implementar

**Arquivo 1:** `supabase/functions/analyze-feedback/index.ts`
- Linha 257: Alterar `model: 'gpt-5-mini-2025-08-07'` para `model: 'gpt-4o-mini'`

**Arquivo 2:** `supabase/functions/analyze-feedback-background/index.ts`  
- Linha 214: Alterar `model: 'gpt-5-mini-2025-08-07'` para `model: 'gpt-4o-mini'`

---

### Por que `gpt-4o-mini`?

1. **Consistência**: Já é usado por `chat-mentor` e `reanalyze-feedback`
2. **Custo**: Mais barato que `gpt-4o` com qualidade suficiente para análise de texto
3. **Velocidade**: Resposta mais rápida que modelos maiores
4. **Disponibilidade**: Modelo estável e amplamente disponível

---

### Resultado Esperado

Após a correção:
- Novos feedbacks serão analisados corretamente pela IA
- Resumo, sentiment, coaching_tips e bias_alert serão gerados
- O fluxo de criação de notas no frontend funcionará sem erros

---

### Seção Técnica

**Deploy automático**: As funções serão redeployadas automaticamente após salvar as alterações.

**Verificação pós-deploy**: Testar criação de nota na interface ou via curl:
```bash
# Verificar se a função responde corretamente
curl -X POST https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/analyze-feedback \
  -H "Authorization: Bearer <JWT>" \
  -d '{"content": "Teste de análise", "memberId": "<uuid>", "type": "note"}'
```

