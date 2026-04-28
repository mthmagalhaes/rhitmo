## Diagnóstico: por que o app ficou mais lento

Investiguei os pontos que rodam em **toda página autenticada** e identifiquei 4 gargalos cumulativos:

### 1. AccountContext dispara 4 queries em paralelo + retries agressivos (gargalo principal)
Em `src/contexts/AccountContext.tsx`, a cada mount o app faz **simultaneamente** para o mesmo usuário:
- workspace (`workspaces` por owner_id + fallback `teams` por leader_user_id)
- role (3 queries em paralelo dentro de uma única `useQuery`)
- linked member (mais 2 queries `workspaces`+`teams` antes do `team_members`)
- pending invite por email

Resultado: **~9 round-trips ao Supabase só para descobrir quem é o usuário**, com queries duplicadas (workspace+team_leader são consultados 3 vezes). Pior: `retry: 5` com backoff exponencial até 10s — se uma falha por RLS transitória, trava o boot por dezenas de segundos. E **nenhuma dessas queries tem `staleTime`**, então elas refazem a cada navegação que remonta o provider.

### 2. Sem QueryClient global com `staleTime`
`src/App.tsx` cria `new QueryClient()` sem defaults. Cada `useQuery` do app considera dados "stale" imediatamente, refazendo no foco de janela, reconexão e remontagem.

### 3. ActivityBadge faz polling de 30s em todas as páginas
`refetchInterval: 30000` com 2 `count(*)` em tabelas — ok individualmente, mas soma à carga geral e segura conexões.

### 4. Sem code-splitting de rotas
`src/App.tsx` importa estaticamente **40+ páginas** (Admin, HR, DesignSystem, Recorder, etc.). O bundle inicial carrega tudo, mesmo quando o usuário só vai ao `/dashboard`. Isso impacta o **primeiro carregamento** (TTI/LCP), que é a sensação principal de "está mais lento".

---

## Plano de otimização

### Etapa 1 — Consolidar AccountContext em uma RPC única
Criar uma função SQL `get_account_context(p_user_id uuid)` (SECURITY DEFINER) que retorna em **uma única chamada** um JSON com `{ workspace_id, role, linked_member, has_pending_invite }`. Substituir as 4 `useQuery` do `AccountContext` por uma única query.

Ganhos: de ~9 round-trips para 1, eliminando duplicação e tornando o boot determinístico.

### Etapa 2 — Reduzir retries e adicionar `staleTime`
- Trocar `retry: 5` (até 10s/tentativa) por `retry: 2` com `retryDelay` máx de 2s.
- Adicionar `staleTime: 5 * 60_000` para a query consolidada (perfil/role muda raramente).
- Remover o loop `ensureSession()` que joga erro para forçar retry — usar `enabled` corretamente.

### Etapa 3 — Configurar defaults globais do QueryClient
Em `src/App.tsx`:
```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,           // 1 min de cache padrão
      gcTime: 10 * 60_000,         // 10 min em memória
      refetchOnWindowFocus: false, // evita refetch ao voltar para a aba
      retry: 1,
    },
  },
});
```
Queries críticas que precisam ser sempre frescas (ActivityBadge polling, mutations) já controlam isso explicitamente.

### Etapa 4 — Code-splitting das rotas pesadas
Converter para `React.lazy()` as páginas que **não fazem parte do fluxo principal de líder**:
- Admin, AdminLayout, DesignSystem
- HRDashboard, HRTeams, HRMembers, HRAnalytics, CompetencyFramework
- RecorderPopup, SlackConnect, SlackChannels, GoogleCalendarCallback
- Enterprise, Roadmap, TermsOfService, PrivacyPolicy, Unsubscribe, ResetPassword

Manter eager: Landing, AuthPage, Index/Dashboard, AppLayout (caminho crítico).
Envelopar `<Routes>` em `<Suspense fallback={<LoadingScreen/>}>`.

Ganho esperado: bundle inicial **30-50% menor**, primeiro paint do `/dashboard` bem mais rápido.

### Etapa 5 — Reduzir polling do ActivityBadge
Aumentar `refetchInterval` de 30s para **60s** e adicionar `refetchIntervalInBackground: false` (não faz sentido fazer polling com a aba escondida).

### Etapa 6 — Medição
Após as mudanças, rodar `browser--performance_profile` no `/dashboard` autenticado para confirmar Web Vitals e tempo até a primeira query útil.

---

## Arquivos afetados

- **Migration nova**: criar função `get_account_context`
- `src/contexts/AccountContext.tsx` — substituir 4 queries por 1 RPC
- `src/App.tsx` — defaults do QueryClient + lazy imports + Suspense
- `src/components/ActivityBadge.tsx` — polling 60s

## Fora do escopo (mas vale registrar)
- Migrar páginas pesadas (Index, MemberDetails, HRAnalytics) para `useQueries`/RPCs agregadas — fica para uma segunda rodada se ainda houver lentidão após as mudanças acima.
- Edge functions lentas (chat-mentor, generate-quarterly-recap) já foram tratadas em conversas anteriores e não afetam o tempo de carregamento das páginas.

## Risco
Baixo. A RPC consolidada precisa replicar fielmente a lógica atual de fallback (owner → leader → linked member). Vou validar com `supabase--read_query` antes de ativar.
