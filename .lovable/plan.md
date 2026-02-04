

## Plano: Correção de "Miopia Temporal" no Mentor Chat

### Problema Identificado

O Mentor Chat está ignorando 20 das 25 notas importadas porque a Edge Function limita artificialmente o contexto a apenas 5 notas:

| Localização | Problema |
|-------------|----------|
| `chat-mentor/index.ts` linha 58 | `feedbacks.slice(0, 5)` - Limita a 5 notas apenas |
| `chat-mentor/index.ts` linha 66 | Usa `created_at` (data de inserção) ao invés de `occurred_at` (data real do evento) |
| System Prompt | Não instrui a IA a considerar histórico antigo |

### Fluxo Atual (Bug)

```text
1. Usuário importa 25 notas de Out/Nov/Dez 2025
2. MemberDetails busca todas as 25 (ordenadas por created_at DESC)
3. MentorChat envia as 25 para Edge Function
4. Edge Function: feedbacks.slice(0, 5) → Usa só 5 notas!
5. IA recebe pouco contexto → "Não encontrei registros suficientes"
```

---

### Solução

#### Parte 1: Aumentar Limite de Notas (5 → 50)

Alterar de 5 para 50 notas, mantendo o limite de caracteres para evitar estouro de tokens:

```typescript
// ANTES (linha 58):
const recentFeedbacks = feedbacks.slice(0, 5);

// DEPOIS:
const recentFeedbacks = feedbacks.slice(0, 50);
```

**Justificativa**: O limite de 5000 caracteres já existe (linha 62), então aumentar para 50 notas permite que o sistema inclua quantas couberem dentro desse limite.

#### Parte 2: Ordenar por occurred_at (Data Real)

Os feedbacks chegam ordenados por `created_at`, mas devemos usar `occurred_at` para contexto temporal correto:

```typescript
// Ordenar por occurred_at (mais recentes primeiro)
const sortedFeedbacks = [...feedbacks].sort((a, b) => {
  const dateA = new Date(a.occurred_at || a.created_at);
  const dateB = new Date(b.occurred_at || b.created_at);
  return dateB.getTime() - dateA.getTime();
});

const recentFeedbacks = sortedFeedbacks.slice(0, 50);
```

#### Parte 3: Usar occurred_at na Formatação

Atualizar a formatação do contexto para mostrar a data real do evento:

```typescript
// ANTES (linha 66):
const date = new Date(fb.created_at).toLocaleDateString('pt-BR');

// DEPOIS:
const date = new Date(fb.occurred_at || fb.created_at).toLocaleDateString('pt-BR');
```

#### Parte 4: Adicionar Instrução ao System Prompt

Incluir orientação explícita para a IA considerar histórico antigo:

```typescript
## IMPORTANTE: HISTÓRICO TEMPORAL

- O gestor pode ter importado notas antigas de sistemas anteriores
- As datas nas notas podem variar de meses ou anos atrás
- Considere TODO o histórico fornecido para identificar padrões
- Mesmo notas antigas são valiosas para análise comportamental
- Não descarte informações por serem "antigas" - analise tendências ao longo do tempo
```

#### Parte 5: Melhorar Log de Debug

Adicionar informações sobre o range temporal das notas:

```typescript
// Após preparar o contexto
const oldestDate = recentFeedbacks.length > 0 
  ? new Date(recentFeedbacks[recentFeedbacks.length - 1].occurred_at || recentFeedbacks[recentFeedbacks.length - 1].created_at)
  : null;
const newestDate = recentFeedbacks.length > 0 
  ? new Date(recentFeedbacks[0].occurred_at || recentFeedbacks[0].created_at)
  : null;

console.log('Context prepared:', { 
  totalChars, 
  notesIncluded: recentFeedbacks.length,
  dateRange: oldestDate && newestDate 
    ? `${oldestDate.toISOString().split('T')[0]} a ${newestDate.toISOString().split('T')[0]}`
    : 'N/A'
});
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/chat-mentor/index.ts` | Aumentar limite para 50 notas, ordenar por occurred_at, adicionar instrução no prompt |

---

### Seção Técnica

**Código completo da nova lógica de seleção:**

```typescript
// Ordenar por occurred_at (mais recentes primeiro) e limitar a 50
const sortedFeedbacks = [...feedbacks].sort((a, b) => {
  const dateA = new Date(a.occurred_at || a.created_at);
  const dateB = new Date(b.occurred_at || b.created_at);
  return dateB.getTime() - dateA.getTime();
});

const recentFeedbacks = sortedFeedbacks.slice(0, 50);

let contextLines = '';
let totalChars = 0;
const maxChars = 5000;

for (let idx = 0; idx < recentFeedbacks.length; idx++) {
  const fb = recentFeedbacks[idx];
  const date = new Date(fb.occurred_at || fb.created_at).toLocaleDateString('pt-BR');
  const sentiment = fb.sentiment || 'neutro';
  const summary = fb.summary || fb.content.substring(0, 200);
  const coaching = fb.coaching_tips || '';
  
  const noteText = `[Nota ${idx + 1} - ${date} - ${sentiment}]
Resumo: ${summary}
${coaching ? `Dicas: ${coaching}` : ''}
---\n\n`;
  
  if (totalChars + noteText.length > maxChars) {
    break;
  }
  
  contextLines += noteText;
  totalChars += noteText.length;
}
```

**Nova instrução no System Prompt (após DADOS DO LIDERADO):**

```typescript
## IMPORTANTE: HISTÓRICO TEMPORAL

- O gestor pode ter importado notas antigas de sistemas anteriores
- As datas nas notas podem variar de meses ou anos atrás  
- Considere TODO o histórico fornecido para identificar padrões
- Mesmo notas antigas são valiosas para análise comportamental
- Não descarte informações por serem "antigas" - analise tendências ao longo do tempo
- Ao responder, cite as datas das notas relevantes para dar contexto temporal
```

**Novo fluxo (Corrigido):**

```text
1. Usuário importa 25 notas de Out/Nov/Dez 2025
2. MemberDetails busca todas as 25 
3. MentorChat envia as 25 para Edge Function
4. Edge Function ordena por occurred_at
5. Seleciona até 50 notas (ou quantas couberem em 5000 chars)
6. Formata com datas reais (occurred_at)
7. System Prompt instrui IA a considerar histórico completo
8. IA analisa todas as notas disponíveis ✓
```

