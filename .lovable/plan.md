## Diagnóstico do problema

O Mentor Chat hoje está lento e dá timeout por uma combinação de fatores no Edge Function `chat-mentor`:

### 1. Modelo pesado + reasoning ativado
- Hoje usa **`google/gemini-2.5-pro`** com `reasoning: { effort: "medium" }`.
- O Pro com reasoning leva entre **15 e 60 segundos** para gerar resposta longa (3000 tokens), especialmente quando há contexto grande (system prompt de ~20k chars + 20 notas + histórico da thread).
- O frontend tem `AbortController` com **timeout de 30s** (linha 350 do `MentorChat.tsx`), mas o backend tem **45s** — ou seja, frequentemente o frontend aborta antes do backend responder, gerando o erro "tempo limite excedido" que você viu.

### 2. Pipeline sequencial caro
Para cada mensagem o backend faz, em sequência:
1. Router semântico (chamada GPT-4o-mini) → ~1-2s
2. Embedding da pergunta (OpenAI) → ~1s
3. RPC `match_feedbacks` no Postgres → ~0.5s
4. (Se transcrição longa) Sumarização GPT-4o-mini → ~3-5s
5. Chamada principal Gemini 2.5 Pro com reasoning → 15-45s

Total típico: **20-50 segundos**. Acima do limite de 30s do frontend.

### 3. UX do loading é estática
A tela mostra apenas um spinner com "Pensando…" sem indicar progresso real, o que faz parecer travado.

---

## Stack atual de IA (resposta direta)

| Camada | Provedor / Modelo hoje | Por quê |
|---|---|---|
| Roteador semântico | OpenAI `gpt-4o-mini` | Decisão SIM/NÃO, barato |
| Embeddings (RAG) | OpenAI `text-embedding-3-small` | RAG das notas |
| Sumarização de transcrição | OpenAI `gpt-4o-mini` | Pré-processar transcrições longas |
| **Resposta principal (Mentor)** | **Lovable AI Gateway → `google/gemini-2.5-pro` com reasoning medium** | "Cérebro" |

### Alternativas disponíveis pelo Lovable AI Gateway (sem precisar de API key extra)
- **`google/gemini-3-flash-preview`** ← **default recomendado**, mais rápido (~3-8s) e mais barato que 2.5-pro, mantém qualidade muito próxima
- `google/gemini-2.5-flash` — equivalente atual estável, ~5-10s
- `google/gemini-2.5-pro` — atual, mais lento porém maior precisão
- `google/gemini-3.1-pro-preview` — última geração, ainda preview
- `openai/gpt-5` / `gpt-5-mini` / `gpt-5.2` — disponíveis via gateway (não precisa de chave OpenAI separada)

> **Claude (Anthropic) não está disponível** no Lovable AI Gateway. Para usar exigiria adicionar uma `ANTHROPIC_API_KEY` própria e custo separado.

Recomendo **manter no ecossistema Lovable AI** (sem dor de chave extra, billing centralizado em créditos da workspace) e migrar para Gemini Flash, que já está alinhado à memória `monetization/modelo-economico-e-margens-abril-2026` (otimização de margem usando Flash em L3).

---

## Plano de melhorias

### A. Performance (resolve o timeout)

1. **Trocar o modelo de L3 (resposta principal)** em `supabase/functions/chat-mentor/index.ts` (linha 687):
   - De: `google/gemini-2.5-pro` com `reasoning: { effort: "medium" }`
   - Para: `google/gemini-3-flash-preview` **sem** bloco `reasoning`
   - Resultado esperado: tempo de resposta cai de 15-45s para **3-8s**

2. **Alinhar timeouts**: subir o `AbortController` do frontend de 30s → 60s e baixar o do backend de 45s → 50s, com mensagem de erro mais clara quando estourar.

3. **Aplicar o mesmo modelo em `meu-rhitmo`** (Edge Function do liderado) para consistência e mesma melhoria de latência.

4. **Reduzir contexto desnecessário**:
   - Limitar `conversationHistory` enviado às últimas **10 mensagens** (hoje envia todo o histórico da thread, pode crescer indefinidamente).
   - Manter `max_tokens: 2500` em vez de 3000 (resposta mais ágil sem perda perceptível).

### B. UX mais suave (a "tela mais suave" que você pediu)

5. **Streaming token-a-token** (mudança maior, opcional nesta rodada):
   - Migrar `chat-mentor` para resposta SSE (`stream: true`) e renderizar a resposta aparecendo letra por letra no `MentorChat.tsx`. Isso elimina a sensação de travamento — mesmo se demorar 8s, o usuário começa a ler em ~1s.
   - **Recomendo fazer numa rodada separada** porque exige refator do `handleSend` e do salvamento da mensagem assistant no banco.

6. **Loading com skeleton + mensagens contextuais melhores** (rodada atual):
   - Substituir o spinner solto por um **skeleton bubble** (3 linhas pulsando) na cor da bolha do assistente, dando sensação de "a resposta já está chegando".
   - Trocar mensagens estáticas por progressão sutil:
     - 0-2s: "Lendo o histórico de {memberName}…"
     - 2-5s: "Analisando padrões e contradições…"
     - 5s+: "Estruturando a resposta…"
   - Adicionar uma barra de progresso **indeterminada** (shimmer suave em `bg-primary/10`) no topo da área de chat enquanto carrega.

7. **Toast de erro mais empático** quando der timeout/429/402:
   - Hoje aparece "Erro ao conectar com o Mentor". Trocar por mensagens específicas:
     - Timeout: "A resposta está demorando mais que o normal. Tente uma pergunta mais específica ou clique em tentar novamente."
     - 429: "Muitas requisições agora. Aguarde 30s e tente de novo."
     - 402: "Créditos de IA esgotados. Avise o admin do workspace."
   - Adicionar botão "Tentar novamente" no toast que reenvia a última mensagem.

### C. Recuperação da mensagem que falhou hoje

8. Se houver uma mensagem do usuário salva no banco sem resposta do assistente associada (caso do timeout do `matheus.magalhaes@fstr.co`), nada a recuperar — a resposta nunca foi gerada porque o backend abortou. O usuário pode simplesmente reenviar a mesma pergunta na thread após o fix.

---

## Detalhes técnicos

**Arquivos a editar:**
- `supabase/functions/chat-mentor/index.ts` — trocar modelo, remover `reasoning`, reduzir `max_tokens`, limitar history
- `supabase/functions/meu-rhitmo/index.ts` — mesmo tratamento
- `src/components/MentorChat.tsx` — subir timeout para 60s, skeleton bubble, mensagens de loading progressivas, toast de erro melhorado, botão "tentar novamente"

**Trecho-chave do backend (chat-mentor linhas 680-707):**
```ts
// ANTES
const modelName = useGateway ? 'google/gemini-2.5-pro' : 'gpt-4o';
// ...
body: JSON.stringify({
  model: modelName,
  messages: apiMessages,
  max_tokens: 3000,
  reasoning: { effort: "medium" },
}),

// DEPOIS
const modelName = useGateway ? 'google/gemini-3-flash-preview' : 'gpt-4o-mini';
// ...
body: JSON.stringify({
  model: modelName,
  messages: apiMessages,
  max_tokens: 2500,
  // sem reasoning — Flash é rápido o suficiente sem ele
}),
```

**Sem mudanças no banco** nesta rodada (não mexe em RLS, schema, RPCs).

---

## Não inclui (sugestões para próximas rodadas)

- Streaming SSE token-a-token (item 5) — requer refator maior do `MentorChat.tsx`
- Cache de respostas frequentes (ex: "Resumir histórico recente" da mesma semana)
- Migração para Claude (precisaria adicionar `ANTHROPIC_API_KEY` e custo extra)
- A/B test de qualidade Flash vs Pro nas respostas (você pode validar com 1 semana de uso real e voltar para Pro se sentir queda perceptível)

---

## Resultado esperado

- Tempo médio de resposta: **20-40s → 4-8s**
- Eliminação dos erros de timeout no fluxo normal
- Sensação visual de progresso real durante o loading
- Custo por mensagem **~70% menor** (Flash vs Pro), alinhado à estratégia de margem documentada