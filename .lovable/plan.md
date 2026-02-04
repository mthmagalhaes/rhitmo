

## Plano: Upgrade Mentor Chat 2.0 - Arquitetura de 3 Camadas

### Objetivo

Implementar uma arquitetura de 3 camadas no Mentor Chat para otimizar custos e expandir o contexto analisável de 5.000 para 20.000 caracteres, usando roteamento inteligente e o modelo GPT-4o para respostas complexas.

---

### Arquitetura Atual vs Nova

| Aspecto | Atual | Novo (2.0) |
|---------|-------|------------|
| Modelo | gpt-4o-mini fixo | gpt-4o (principal) + gpt-4o-mini (roteador) |
| Limite de contexto | 5.000 chars | 20.000 chars |
| Busca de dados | Sempre busca 50 notas | Roteador decide se precisa buscar |
| Compressão | Usa `summary` ou corta em 200 chars | Usa `summary` ou corta em 800 chars |
| Custo por mensagem | ~fixo | Variável (menor para perguntas simples) |

---

### Camada 1: Roteamento Semântico ("O Porteiro")

Esta camada analisa a mensagem do usuário com GPT-4o-mini para decidir se precisa buscar dados no banco.

**Lógica de Decisão:**

```text
┌─────────────────────────────────────────────────┐
│ Mensagem do Usuário                             │
└────────────────────────┬────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────┐
│ GPT-4o-mini: "Preciso buscar dados? SIM/NAO"    │
└────────────────────────┬────────────────────────┘
                         ▼
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼────┐                    ┌─────▼─────┐
    │   NAO   │                    │    SIM    │
    └────┬────┘                    └─────┬─────┘
         │                               │
         ▼                               ▼
 Pula busca de dados           Busca + Comprime notas
 contextText = ""              contextText = notas
         │                               │
         └───────────────┬───────────────┘
                         ▼
              ┌──────────────────────┐
              │ GPT-4o: Resposta     │
              └──────────────────────┘
```

**Prompt do Roteador:**

```typescript
const routerPrompt = `O usuário disse: "${question}".

Para responder isso com qualidade, é OBRIGATÓRIO ler as anotações e feedbacks históricos do liderado?

Exemplos de "NAO":
- Saudações ("Oi", "Olá", "Bom dia")
- Pedidos genéricos de formatação ("Formata isso em bullets")
- Perguntas sobre você ("O que você faz?", "Quem é você?")
- Continuação de conversa sem mudar de tema

Exemplos de "SIM":
- Perguntas sobre comportamento ("Como a Gabriela se comporta em reuniões?")
- Análise de padrões ("Quais são os pontos fortes do João?")
- Preparação para 1:1 ("Me ajuda a preparar a 1:1")
- Sugestões de PDI ("O que posso sugerir de desenvolvimento?")

Responda APENAS "SIM" ou "NAO" (sem acento, sem explicação).`;
```

**Otimização para Conversas Longas:**

Se a conversa já tiver mais de 2 turnos e o contexto já foi injetado anteriormente, assume que não precisa buscar novamente (exceto se a intenção mudar).

---

### Camada 2: Busca e Compressão de Contexto ("A Prensa")

Quando o roteador aprova a busca, aplica-se compressão inteligente:

**Algoritmo de Compressão:**

```typescript
const compressContext = (feedbacks: any[]): string => {
  // Ordenar por occurred_at DESC
  const sorted = [...feedbacks].sort((a, b) => {
    const dateA = new Date(a.occurred_at || a.created_at);
    const dateB = new Date(b.occurred_at || b.created_at);
    return dateB.getTime() - dateA.getTime();
  });
  
  const limited = sorted.slice(0, 50);
  let contextLines = '';
  let totalChars = 0;
  const maxChars = 20000; // Aumentado de 5000 para 20000
  
  for (const fb of limited) {
    const date = new Date(fb.occurred_at || fb.created_at).toLocaleDateString('pt-BR');
    const typeLabel = fb.type || 'Nota';
    
    // Compressão inteligente: prefere summary, senão corta em 800 chars
    let text = fb.summary;
    if (!text || text.length < 20) {
      text = fb.content.substring(0, 800);
      if (fb.content.length > 800) text += '...';
    }
    
    const noteText = `[Data: ${date}] [Tipo: ${typeLabel}]\n${text}\n---\n\n`;
    
    if (totalChars + noteText.length > maxChars) {
      break; // Para de adicionar para não estourar
    }
    
    contextLines += noteText;
    totalChars += noteText.length;
  }
  
  return contextLines || 'Nenhum histórico disponível ainda.';
};
```

**Mudanças de Formato:**

| Campo | Antes | Depois |
|-------|-------|--------|
| Limite por nota | 200 chars | 800 chars |
| Limite total | 5.000 chars | 20.000 chars |
| Formato | `[Nota X - Data - Sentiment]` | `[Data: DD/MM/YYYY] [Tipo: X]` |
| Coaching tips | Incluído | Removido (economiza tokens) |
| Sentiment | Incluído | Removido (economiza tokens) |

---

### Camada 3: O Cérebro (GPT-4o)

**Mudanças no System Prompt:**

Adicionar instrução específica para análise de fragmentos comprimidos:

```typescript
const systemPrompt = `# RHITMO MENTOR 2.0 - CONSTITUIÇÃO

## IDENTIDADE
${RHITMO_IDENTITY}

## CAPACIDADE AVANÇADA

Você é um Mentor de Liderança Sênior com acesso a fragmentos COMPRIMIDOS do histórico do liderado.
Sua missão é:
1. CONECTAR PONTOS entre diferentes datas para encontrar padrões comportamentais
2. IDENTIFICAR RISCOS que não são óbvios em notas isoladas
3. ANALISAR TENDÊNCIAS ao longo do tempo

## REGRAS ESPECIAIS

- NÃO diga "não encontrei dados" a menos que a lista esteja COMPLETAMENTE vazia
- Se os dados forem antigos (meses atrás), analise-os mesmo assim como contexto histórico
- Fragmentos curtos ainda contêm insights valiosos - extraia o máximo possível
- Quando houver muitas notas, busque padrões recorrentes e exceções

## REGRAS DE OURO (GUARD-RAILS)
${GUARDRAILS_PROMPT}

... resto do prompt existente ...
`;
```

**Mudança de Modelo:**

```typescript
// ANTES
model: 'gpt-4o-mini',

// DEPOIS
model: 'gpt-4o',
max_tokens: 1500, // Aumentado para respostas mais completas
```

---

### Implementação

Alterar `supabase/functions/chat-mentor/index.ts`:

#### 1. Função de Roteamento

```typescript
const shouldFetchContext = async (
  question: string, 
  openAIApiKey: string
): Promise<boolean> => {
  const routerPrompt = `O usuário disse: "${question}".

Para responder isso com qualidade, é OBRIGATÓRIO ler as anotações e feedbacks históricos do liderado?

Exemplos de "NAO": Saudações, formatação, perguntas sobre você, continuação sem mudar tema.
Exemplos de "SIM": Comportamento, padrões, 1:1, PDI, feedback, riscos.

Responda APENAS "SIM" ou "NAO".`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: routerPrompt }],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.log('Router failed, defaulting to SIM');
      return true;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim()?.toUpperCase();
    console.log('Router decision:', answer);
    
    return answer !== 'NAO';
  } catch (error) {
    console.error('Router error, defaulting to SIM:', error);
    return true;
  }
};
```

#### 2. Função de Compressão

```typescript
const compressContext = (feedbacks: any[]): string => {
  if (!feedbacks?.length) return 'Nenhum histórico disponível ainda.';
  
  const sorted = [...feedbacks].sort((a, b) => {
    const dateA = new Date(a.occurred_at || a.created_at);
    const dateB = new Date(b.occurred_at || b.created_at);
    return dateB.getTime() - dateA.getTime();
  });
  
  const limited = sorted.slice(0, 50);
  let contextLines = '';
  let totalChars = 0;
  const maxChars = 20000;
  
  for (let idx = 0; idx < limited.length; idx++) {
    const fb = limited[idx];
    const date = new Date(fb.occurred_at || fb.created_at).toLocaleDateString('pt-BR');
    const typeLabel = fb.type || 'Nota';
    
    // Prefere summary, senão corta content em 800 chars
    let text = fb.summary;
    if (!text || text.length < 20) {
      text = fb.content.substring(0, 800);
      if (fb.content.length > 800) text += '...';
    }
    
    const noteText = `[Data: ${date}] [Tipo: ${typeLabel}]\n${text}\n---\n\n`;
    
    if (totalChars + noteText.length > maxChars) break;
    
    contextLines += noteText;
    totalChars += noteText.length;
  }
  
  return contextLines || 'Nenhum histórico disponível ainda.';
};
```

#### 3. Fluxo Principal Atualizado

```typescript
// 1. Roteamento
const needsContext = await shouldFetchContext(question, openAIApiKey);
console.log('Needs context:', needsContext);

// 2. Compressão (apenas se necessário)
let contextLines = '';
if (needsContext) {
  contextLines = compressContext(feedbacks);
  console.log('Context compressed:', { 
    chars: contextLines.length, 
    notesIncluded: (contextLines.match(/\[Data:/g) || []).length 
  });
} else {
  contextLines = '(Contexto histórico não solicitado para esta pergunta)';
  console.log('Context skipped by router');
}

// 3. GPT-4o com contexto (ou sem)
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  ...
  body: JSON.stringify({
    model: 'gpt-4o',  // Upgrade de modelo
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ],
    max_tokens: 1500,  // Aumentado
  }),
});
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/chat-mentor/index.ts` | Adicionar roteador, compressão 2.0, upgrade para GPT-4o |

---

### Seção Técnica

**Custos Estimados:**

| Cenário | Antes (gpt-4o-mini) | Depois (Híbrido) |
|---------|---------------------|------------------|
| "Oi, tudo bem?" | ~0.001 USD | ~0.0003 USD (só roteador) |
| "Analise padrões" | ~0.002 USD | ~0.015 USD (roteador + gpt-4o) |
| Média 10 msgs | ~0.015 USD | ~0.05 USD |

**Trade-off:** Custo maior para perguntas complexas, mas qualidade MUITO superior e análise de 4x mais contexto.

**Timeout Ajustado:**

GPT-4o pode demorar mais que gpt-4o-mini. Aumentar timeout:

```typescript
const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s
```

**Fluxo Visual:**

```text
Usuário: "Como a Gabriela se comporta em reuniões?"
           │
           ▼
    ┌──────────────┐
    │  Roteador    │ gpt-4o-mini (3 cents)
    │  "SIM"       │
    └──────┬───────┘
           ▼
    ┌──────────────┐
    │  Compressor  │ 50 notas → 20.000 chars
    └──────┬───────┘
           ▼
    ┌──────────────┐
    │  GPT-4o      │ Análise profunda
    └──────┬───────┘
           ▼
    Resposta: "Baseado em 25 notas entre Out/2025 e Jan/2026..."
```

