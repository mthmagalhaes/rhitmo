

## Plano: Corrigir /mentor "Sem resposta do mentor" + Melhorias UX

### Diagnóstico

**Bug principal**: O `chat-mentor` retorna `{ response: mentorResponse }`, mas o `slack-bot` lê `data.reply || data.message` — nenhum dos dois existe. Resultado: sempre cai no fallback `'Sem resposta do mentor.'`.

**Bug secundário (não-bloqueante)**: O semantic search (`match_feedbacks` RPC) retorna "Unauthorized", mas isso é tratado com fallback silencioso e não bloqueia a resposta. Provavelmente um problema de permissão na RPC function — investigar separadamente.

**UX: pergunta não aparece**: O bot não inclui a pergunta do usuário na resposta. Como o Slack mostra slash commands como "efêmeros" (só o usuário vê), a pergunta original desaparece visualmente.

### Alterações

#### 1. Fix campo de resposta (`slack-bot/index.ts`, linha 894)

```typescript
// DE:
const reply = data.reply || data.message || 'Sem resposta do mentor.';
// PARA:
const reply = data.response || data.reply || data.message || 'Sem resposta do mentor.';
```

#### 2. Mostrar a pergunta do usuário na resposta (`slack-bot/index.ts`, ~linha 896)

Adicionar um bloco com a pergunta original antes do header, para o usuário ter contexto:

```typescript
blocks.push(
  { type: 'section', text: { type: 'mrkdwn', text: `> _${question}_` } },
);
```

#### 3. Investigar RPC `match_feedbacks` Unauthorized

Verificar se a RPC function tem `SECURITY DEFINER` e se aceita chamadas com service role key. Isso é secundário — o mentor funciona sem semantic search (usa feedbacks recentes como fallback).

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/slack-bot/index.ts` | Fix `data.response`, adicionar bloco de pergunta |

### Resultado esperado
- `/mentor como dar feedback?` → Mostra a pergunta + resposta da IA
- Tempo de resposta: ~5-7s é esperado (3 chamadas de IA: router + embeddings + resposta)

