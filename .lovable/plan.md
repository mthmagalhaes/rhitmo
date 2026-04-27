## Diagnóstico

O botão **Descartar** mostra o toast de sucesso mas os cards permanecem porque o `UPDATE recall_bots SET status = 'dismissed'` é bloqueado silenciosamente por RLS.

Verificação no banco:
- Policies em `public.recall_bots`: apenas `SELECT` (own + admin) e `INSERT`. **Não existe policy de UPDATE.**
- Os 2 bots da reunião 15/04 continuam com `status = 'unrecoverable'` no banco mesmo após o clique.
- Como o Supabase JS não retorna erro quando RLS bloqueia um UPDATE (apenas 0 linhas afetadas), o código entra no caminho de sucesso e mostra o toast.

## Correção

### 1. Criar RPC `dismiss_recall_bot` (migration)
Função `SECURITY DEFINER` em `plpgsql` que:
- Recebe `_bot_id uuid`
- Valida que `user_id = auth.uid()` (ou `effective_user_id()` para impersonation)
- Faz `UPDATE recall_bots SET status = 'dismissed' WHERE id = _bot_id AND user_id = effective_user_id()`
- Retorna `boolean` indicando se atualizou

Optamos por RPC ao invés de adicionar policy de UPDATE genérica para limitar a mudança ao único campo necessário (`status → 'dismissed'`), evitando que o client possa alterar `recall_bot_id`, `user_id`, etc.

### 2. Atualizar `PendingTranscriptsCard.tsx`
Trocar o `.from('recall_bots').update(...)` por `.rpc('dismiss_recall_bot', { _bot_id: bot.id })`. Se retornar `false`, mostrar erro ("Não foi possível descartar — recarregue a página").

## Resultado esperado

- Clicar em **Descartar** atualiza `status = 'dismissed'` no banco.
- O card desaparece imediatamente após a invalidação da query.
- Os 2 bots de 15/04 atualmente travados serão dispensáveis no próximo clique.
