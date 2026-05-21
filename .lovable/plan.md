## O que estou vendo no banco

- Workspace ativo na sessão: **Faster Ops** (`27ee8977…`), owner = `79a6f679…`.
- Esse owner tem **122 evidências** em `context_evidence` e **14 sinais pendentes** + 50 aprovados em `slack_ambient_evidence` (`manager_id = 79a6f679…`).
- RLS e RPC (`get_team_timeline`) testados manualmente como esse owner retornam as 122 linhas. A função e as policies não estão quebradas.

Ou seja, **os dados existem e as policies funcionam**. O motivo de não aparecer nada na tela é quase certamente um descasamento entre `effective_user_id()` no banco e o `auth.uid()` do usuário logado, OU um erro no `useTeamTimeline` que o React Query está engolindo.

## Hipóteses prováveis

1. A conta logada (`matheus.magalhaes@fstr.co`) **não é** o `79a6f679…` que aparece como dono no banco — pode ser uma conta secundária criada depois do bug de multi-conta, e o sidebar resolve "Faster Ops" via outro caminho (ex.: super admin) sem dar acesso a manager_id nos slack evidences.
2. Impersonation residual: existe linha em `admin_impersonation` ativa que faz `effective_user_id()` retornar um uid sem dados, sem mostrar o banner amarelo.
3. Erro silencioso no `safeRpc('get_team_timeline')` ou na query de `slack_ambient_evidence` — o `useInfiniteQuery` está marcando `isError` mas a UI só mostra o empty-state.

## Plano de correção

### 1. Diagnóstico imediato (logs no console + tela)

- Em `src/pages/lider/Contexto.tsx`, mostrar visivelmente no header de debug (só em dev) `effectiveUserId`, `workspaceId`, `isImpersonating`, `rows.length` e qualquer `error?.message` retornado por `useTeamTimeline`. Hoje o erro é só `console.error` no DEV — vamos jogar também numa tag pequena no topo da página atrás de `import.meta.env.DEV`.
- Em `SlackSignalsTriage` e `useEvidence`, idem: expor `error?.message` quando a query falhar.
- Logar 1x no console o resultado de `supabase.rpc('get_account_context', { p_user_id: user.id })` para confirmar quem o banco enxerga.

### 2. Endpoint de diagnóstico (RPC `debug_context_access`)

Criar uma RPC SECURITY DEFINER que, para o `auth.uid()` atual, devolve:

```text
{
  auth_uid, effective_user_id, is_admin,
  has_active_impersonation, impersonated_user_id,
  workspaces_owned: [{id,name}],
  teams_led: [{id,name,workspace_id}],
  linked_member: {id,name,workspace_id} | null,
  allowed_member_count_in('27ee...'),
  context_evidence_visible_count,
  slack_evidence_visible_count
}
```

Chamar essa RPC uma vez no carregamento de `/lider/contexto` em dev e dar log. Isso elimina a adivinhação sobre quem o banco realmente vê.

### 3. Correções condicionais (aplicar conforme o diagnóstico mostrar)

- **Se `has_active_impersonation = true` sem banner**: limpar a linha de `admin_impersonation` expirada (já existe `effective_user_id()` que filtra por `ended_at IS NULL AND expires_at > now()`, então o bug é uma linha órfã ativa) e adicionar verificação no `useImpersonation` pra mostrar o banner sempre que houver linha ativa.
- **Se a conta `matheus.magalhaes@fstr.co` for diferente de `79a6f679…`**: reatribuir owner do workspace Faster Ops para a conta usada hoje (migration de update em `workspaces.owner_id` + `teams.leader_user_id`), ou orientar a logar com a conta correta.
- **Se a RPC está retornando erro real**: corrigir o erro reportado (provavelmente algo introduzido pela migration recente de `slack_ambient_evidence`, mesmo o `get_team_timeline` não tocando nessa tabela).

### 4. Hardening pra evitar regressão

- No `useTeamTimeline` e no `useEvidence`, em vez de só logar em dev, propagar `error` para um Toast destrutivo quando a query falha. Empty state e erro hoje têm a mesma aparência, e foi exatamente isso que escondeu o problema.

## Fora de escopo

- Refazer o pipeline do Slack ou mudar o classifier (já entregue na rodada anterior).
- Mexer no `MemberNetworkPanel` (aba Rede), exceto pelos logs de debug.

## Detalhes técnicos

- Arquivos afetados: `src/pages/lider/Contexto.tsx`, `src/hooks/useTeamTimeline.ts`, `src/hooks/useEvidence.ts`, `src/components/context/SlackSignalsTriage.tsx`, possivelmente `src/hooks/useImpersonation.ts`.
- Migration nova: `debug_context_access()` RPC (SECURITY DEFINER, retorna jsonb). Pode ser temporária — removida após o root cause confirmado.
- Sem mudança em RLS nem no `get_team_timeline` enquanto a causa raiz não estiver confirmada.
