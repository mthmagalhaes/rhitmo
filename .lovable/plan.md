

## Diagnóstico: Impersonate vaza dados do Admin (Matheus) na visão da liderada (Yasmin)

**Está MUITO errado mesmo, não é só preview.** A Yasmin yasmin.nobrega@fstr.co é uma **liderada** (`linked_user_id` populado, time CreativeOps no workspace Faster Ops). Mas o que aparece na tela impersonando-a é o **dashboard de líder do Matheus** com dados do Matheus.

### Causa raiz

A correção anterior fez `AccountContext.tsx` usar `effectiveUserId`, mas **dois hooks legados continuam usando `user.id` direto**, e o `Index.tsx` usa esses hooks para decidir qual dashboard renderizar:

1. **`src/hooks/useLinkedMember.ts`** — usa `user.id` em todos os checks (owner, leader, linked_member). Resultado: Matheus é detectado como leader → retorna `null` → `isLinkedMember=false` para a "Yasmin impersonada".
2. **`src/hooks/useUserRole.ts`** — mesma coisa: usa `user.id`. Resultado: Matheus é leader (workspace Rhitmo Inc.) → `isLeader=true`.

Como `Index.tsx` linha 457 faz:
```ts
if (isLinkedMember && !isLeader && !isHRAdmin) → render DirectReportDashboard
```
…cai no `else` e renderiza o **dashboard do líder do Matheus** (com workspace, times, nome, nudges, weekly notes, tudo do Matheus). Por isso aparece "Boa tarde, Matheus", times CoS/BizOps/HR/Marketing, alerta "Próximo do limite — Pulse" do workspace Rhitmo Inc., etc.

Além disso, várias `useQuery` dentro do próprio `Index.tsx` continuam usando `user.id` para puxar workspace, meetings, weeklyNotes, nudges — todos do Matheus.

### Plano de correção

**1. Migrar hooks legados para `effectiveUserId`**
- `useLinkedMember.ts` → ler `useImpersonation()` e usar `effectiveUserId` em todas as queries + queryKey
- `useUserRole.ts` → mesma mudança

**2. Migrar queries internas do `Index.tsx` para `effectiveUserId`**
- `workspace`, `meetings`, `weeklyNotes`, `nudges`, `onboardingStatus` (manager_id, leader_id, user_id) — todos passam a usar `effectiveUserId`
- `firstName` (linha 488) deve usar nome da liderada quando impersonando, não `user.user_metadata` (que é do Matheus). Ler de `linkedMember.name` ou de `auth.users` do impersonado via uma nova query leve.
- queryKeys passam a depender de `effectiveUserId` para invalidar ao trocar impersonação.

**3. Auditoria varredura final**
- Procurar `user.id` / `user!.id` / `user?.id` em outros componentes que renderizam dashboard (`AppSidebar`, `NudgesBanner`, `UpgradeBanner`, `SetupChecklist`, `TeamTabs`) e migrar onde necessário.

### Padrão sugerido (DRY)

Criar um hook `useEffectiveUser()` que retorna `{ id, email }` já considerando impersonação, e reusar em todos os pontos. Reduz risco de regressão futura.

```ts
// src/hooks/useEffectiveUser.ts
export function useEffectiveUser() {
  const { user } = useAuth();
  const { isImpersonating, impersonatedUserId, impersonatedEmail } = useImpersonation();
  return {
    id: isImpersonating ? impersonatedUserId : user?.id ?? null,
    email: isImpersonating ? impersonatedEmail : user?.email ?? null,
    isImpersonating,
  };
}
```

### Arquivos modificados
- `src/hooks/useEffectiveUser.ts` (novo)
- `src/hooks/useLinkedMember.ts` (usar effectiveUserId)
- `src/hooks/useUserRole.ts` (usar effectiveUserId)
- `src/pages/Index.tsx` (5 queries + firstName)
- Outros componentes que vazarem em testes pós-fix (AppSidebar, NudgesBanner, etc. — auditoria após o fix dos críticos)

### Memory update
- Atualizar `mem://admin/impersonation-view-mode` com a regra: **todo hook/query que dependa de identidade do usuário deve usar `useEffectiveUser()`**, não `useAuth().user.id` direto.

### Escopo
Médio. ~30 min para o fix dos 3 arquivos críticos + auditoria. Sem migrations.

