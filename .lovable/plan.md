

## Plano: Corrigir Convite do Guilherme Cunha

### Problema
O Guilherme acessa o link `https://app-rhitmo.lovable.app/invite?token=a0e5a2da-c3c1-492f-b967-b017db380020` e vê "Convite Inválido".

**Causa raiz:** A função SQL `get_invite_details` espera um parâmetro do tipo `uuid`, mas o Supabase JS client envia o valor como `text`. Isso causa um erro de tipo (`function get_invite_details(text) does not exist`) que é capturado como erro genérico e exibido como "Convite Inválido".

O convite está intacto no banco — status `pending`, token válido, workspace "Faster Ops" ativo.

### Correção

1. **Alterar a função SQL `get_invite_details`** para aceitar `text` em vez de `uuid`, fazendo o cast internamente (`tm.invite_token = p_invite_token::uuid`). Isso é mais resiliente e compatível com o client JS.

2. **Alternativa (sem migration):** Fazer o cast no frontend em `Invite.tsx` — mas alterar a função SQL é mais robusto.

### Arquivo a modificar

| Arquivo | Ação |
|---------|------|
| Nova migration SQL | `DROP + CREATE` da função `get_invite_details` com parâmetro `text` |

A correção é de 1 migration. Após aplicada, o Guilherme poderá acessar o link normalmente.

