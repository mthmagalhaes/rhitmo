

## Corrigir: Resolução de membros quando `users.info` falha

### Problema
Quando o líder digita `/nota @guilherme cunha`, o Slack envia `<@U08RFSY3F29|guilherme.cunha>`. O fluxo de resolução:
1. Busca U08RFSY3F29 em `slack_integrations` → não encontrado (Guilherme não vinculou conta)
2. Chama `users.info` no Slack → falha com `user_not_found`
3. Retorna erro, **sem tentar o fuzzy match pelo nome**

O membro "Guilherme Cunha" existe na tabela `team_members`, mas o código desperdiça o display name (`guilherme.cunha`) que vem no próprio formato da menção `<@U...|display_name>`.

### Solução

**`supabase/functions/slack-bot/index.ts`** — No bloco de fallback (linhas ~207-245), adicionar:

1. **Antes de chamar `users.info`**: extrair o display name do `|` da menção (`mentionMatch` já captura `<@U...|display_name>`, mas o regex descarta a parte após `|`). Ajustar para capturar o display name.

2. **Quando `users.info` falha**: usar o display name extraído da menção (ex: `guilherme.cunha` → `guilherme cunha`) para fazer fuzzy match na tabela `team_members`, da mesma forma que o fallback por `realName` já faz.

3. **Fluxo corrigido**:
   - Slack integration lookup → se falhar...
   - Extrair display name da menção (`|` part) → fuzzy match → se falhar...
   - `users.info` → real name → fuzzy match → se falhar...
   - Retornar erro

Mudança pontual: ~15 linhas no bloco `resolveMember`.

### Arquivos alterados
- `supabase/functions/slack-bot/index.ts` — melhorar fallback no `resolveMember`

