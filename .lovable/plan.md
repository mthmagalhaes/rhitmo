

## Sprint 5.4 Complemento — Notificacao por Email + Secao "Novidades"

### Visao Geral
Duas melhorias ao fluxo de avaliacao compartilhada: (1) enviar email ao liderado quando o lider compartilha, (2) mostrar indicador de "nao lido" na tab Visao Geral.

---

### 1. Migracao de banco: coluna `member_viewed_at`

Adicionar coluna a tabela `performance_reviews`:

```sql
ALTER TABLE performance_reviews 
ADD COLUMN IF NOT EXISTS member_viewed_at timestamptz DEFAULT NULL;
```

Essa coluna sera atualizada quando o liderado abrir a avaliacao no dialog de leitura. Reviews com `shared_with_member = true` e `member_viewed_at IS NULL` sao consideradas "nao lidas".

---

### 2. Edge Function: `notify-review-shared` (nova)

Seguir exatamente o padrao da `send-disc-invite`:
- Mesma estrutura de CORS, Resend, HTML
- Input: `{ memberName, memberEmail, leaderName, reviewTitle, reviewDate }`
- De: `Rhitmo <noreply@rhitmo.co>`
- Assunto: `"{leaderName} compartilhou sua avaliacao de desempenho"`
- HTML com logo Rhitmo, saudacao, bloco cinza com detalhes, botao roxo `#7C3AED` linkando para `https://rhitmo.co/dashboard`, rodape "Equipe Rhitmo"
- Adicionada ao `supabase/config.toml` com `verify_jwt = true`

---

### 3. ReviewViewDialog.tsx — Disparar email ao compartilhar

No handler do botao "Compartilhar com liderado" (linhas ~344-355), apos o update com sucesso:
- Buscar `email` e `name` do team_member (member_id do review)
- Buscar nome do lider via `user_metadata`
- Invocar `supabase.functions.invoke('notify-review-shared', { body: ... })`
- Fire-and-forget (nao bloquear o toast de sucesso se o email falhar, apenas log de erro)

---

### 4. DirectReportDashboard.tsx — Secao "Novidades" na Visao Geral

**Dados**: Derivar `unreadReviews` a partir de `sharedReviews` ja existente:
```
const unreadReviews = sharedReviews.filter(r => !r.member_viewed_at);
```

A query `shared-reviews` precisa incluir `member_viewed_at` no select.

**Secao "Novidades"**: Renderizar entre o header "Ola, {nome}" e os cards Resumo/Proximas Acoes, APENAS se `unreadReviews.length > 0`. Cada item e clicavel e navega para tab feedbacks + abre o modal.

**Badge no card "Resumo"**: Na linha de "X feedbacks compartilhados", adicionar badge se `unreadReviews.length > 0`.

**Marcar como lido**: No dialog de leitura da avaliacao, quando abrir uma review, atualizar `member_viewed_at = now()` se ainda for null:
```
await supabase.from('performance_reviews')
  .update({ member_viewed_at: new Date().toISOString() })
  .eq('id', review.id)
  .is('member_viewed_at', null);
```

---

### Arquivos alterados

| Arquivo | Acao |
|---|---|
| Migracao SQL | Adicionar coluna `member_viewed_at` |
| `supabase/functions/notify-review-shared/index.ts` | Criar Edge Function de email |
| `supabase/config.toml` | Adicionar configuracao da nova funcao |
| `src/components/ReviewViewDialog.tsx` | Invocar email ao compartilhar |
| `src/components/dashboard/DirectReportDashboard.tsx` | Secao Novidades + badge + marcar como lido |

### O que NAO muda
- Modal de leitura da avaliacao (estrutura existente)
- `filterReviewForMember`
- Badge na tab Feedbacks
- Demais tabs e componentes

