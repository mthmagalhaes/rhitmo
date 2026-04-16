## Diagnóstico: Por que Impersonate não funciona

A feature está **arquiteturalmente incompleta**. O hard reload acontece, mas:

1. **Landing redireciona admin para `/admin**` (linha 602 de `Landing.tsx`): como matheus continua sendo `is_admin=true`, o reload sempre o joga de volta para o painel admin. Visualmente parece que o clique "não fez nada".
2. **AccountContext ignora impersonation**: as queries de workspace/role usam `user!.id` (sempre matheus), mesmo que `effective_user_id()` na DB já resolva para a Lais. Ou seja, mesmo se chegasse no `/dashboard`, mostraria os dados do matheus, não do impersonado.

A função SQL `effective_user_id()` funciona — mas só nas RLS que a chamam. O frontend não usa esse conceito em lugar nenhum.

## Plano de correção (mínimo viável)

### 1. Frontend: adicionar `effectiveUserId` no AccountContext

- Buscar `admin_impersonation` no boot do AccountContext
- Expor `effectiveUserId = impersonation?.impersonated_user_id ?? user.id`
- Trocar **todas as queries internas** que usam `user!.id` por `effectiveUserId` (workspace owner, leader, hr_admin, linked_member)
- Trocar `queryKey: ['account-workspace', user?.id]` por `[..., effectiveUserId]` para invalidar ao trocar de impersonated user

### 2. Roteamento: parar de jogar admin de volta em `/admin` quando está impersonando

- `Landing.tsx` (linha 600-604): se `isImpersonating`, redirecionar para `/dashboard` (não `/admin`)
- `DirectReportGuard.tsx`: se `isImpersonating`, **não** redirecionar admin para `/admin`

### 3. Banner de Impersonation: mostrar globalmente

- Hoje o `<ImpersonationBanner />` só está dentro do `AdminLayout`. Mover (ou duplicar) para o `AppLayout` também, garantindo que o admin veja onde está e tenha o botão "Encerrar".

### 4. Limpar `useAdmin` durante impersonation (opcional, mas importante)

- Enquanto `isImpersonating === true`, fazer `useAdmin()` retornar `isAdmin = false` para o resto do app (assim os fluxos do app tratam o admin como o usuário comum impersonado, sem layouts especiais de admin)

### Escopo / esforço

- **3 arquivos** de mudança principal: `AccountContext.tsx`, `Landing.tsx`, `DirectReportGuard.tsx`
- **1 ajuste menor**: posicionar `ImpersonationBanner` fora do AdminLayout (em `AppLayout`)
- **1 ajuste em `useAdmin**` para considerar impersonation
- Sem migrations. RLS já está pronta via `effective_user_id()`.

### Vale a pena agora?

Sim, é médio (não pequeno, não enorme). É **a** ferramenta de suporte ao cliente — sem ela você não consegue entrar como giovanna/guilherme/lais para depurar o que eles veem. Estimativa: 1 sprint focado.