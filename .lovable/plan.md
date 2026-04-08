

## Fazer o Slack funcionar — Substituir URLs hardcoded

### Problema
76 ocorrências de `rhitmo.lovable.app` hardcoded em 8 edge functions. Todas as URLs de redirect, links em mensagens e botões do Slack apontam para o domínio errado.

### Solução
Substituir todas as ocorrências de `https://rhitmo.lovable.app` por `https://rhitmo.co` nos 7 arquivos afetados (o 8º, `auth-email-hook`, usa `app-rhitmo.lovable.app` como sample URL para preview — manter).

### Arquivos e mudanças

| Arquivo | Ocorrências | Mudança |
|---------|-------------|---------|
| `supabase/functions/slack-bot/index.ts` | ~8 | `rhitmo.lovable.app` → `rhitmo.co` |
| `supabase/functions/slack-oauth-callback/index.ts` | 5 | idem |
| `supabase/functions/invite-member-slack/index.ts` | 1 | idem |
| `supabase/functions/google-calendar-oauth/index.ts` | 1 | idem |
| `supabase/functions/notify-review-shared/index.ts` | 1 | idem |
| `supabase/functions/notify-admin-new-lead/index.ts` | 1 | idem |
| `supabase/functions/admin-invite-user/index.ts` | 2 | idem |

### Abordagem
Em cada arquivo, definir uma constante `const APP_URL = 'https://rhitmo.co'` no topo e usar template literals (`${APP_URL}/dashboard`, `${APP_URL}/slack/connect?...`). Isso facilita futuras mudanças de domínio.

### Deploy
Após as edições, deploy de todas as 7 edge functions de uma vez.

### O que NÃO muda
- `auth-email-hook/index.ts` — usa `app-rhitmo.lovable.app` apenas como sample para preview de templates, não afeta produção
- Frontend (`SlackConnect.tsx`) — não tem URLs hardcoded, usa rotas relativas
- Secrets do Slack — já estão todos configurados

