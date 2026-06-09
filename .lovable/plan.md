# Validação — Telas por papel no workspace Faster

Rodei `get_account_context` para todos os 14 usuários ativos do Faster (cadastrados pelo Guto + leaders + owner). Cada um já resolve para a persona correta — **nenhuma correção de dados ou código é necessária**. Abaixo o mapa de quem vai para qual tela, e o porquê.

## Mapa de personas (Faster)

```text
Usuário                  | role     | owner | team_leader | linked | Tela alvo
-------------------------|----------|-------|-------------|--------|----------------------
Vitor (owner)            | leader   |  ✅   |    ✅       |   —    | /lider/inicio
Matheus M. (HR+Líder)    | hr_admin |   —   |    ✅       |   —    | /lider/inicio (multi-role; switch para /hr)
Guto (HR + membro)       | hr_admin |   —   |     —       |  C-Lvl | /hr  (HR vence linked_member)
Caio (Líder Comercial)   | leader   |   —   |    ✅       |   —    | /lider/inicio
Yasmin (Líder Excel.)    | leader   |   —   |    ✅       |   —    | /lider/inicio
Douglas (Líder Produtech)| leader   |   —   |    ✅       |   —    | /lider/inicio
Bianca, Jesse, Gabriela, |          |       |             |        |
Matheus liderado, Camila,| user     |   —   |     —       |  ✅    | /liderado/inicio
Guilherme C, Laís,       |          |       |             |        |
Vinicius                 |          |       |             |        |
```

Pendente esperado: **Lucas Fernandes** (`lucas.fernandes@fstr.co`) ainda tem `invite_status='none'` e `linked_user_id=NULL` — é só um convite que ainda não foi aceito. Ao logar pela primeira vez o `get_account_context` via `has_pending_invite` o ligará automaticamente; sem ação.

## Por que tudo casa hoje

1. **RPC `get_account_context**` já decide a ordem certa: Owner → HR Admin → Team Leader → Liderado. Quando o usuário é HR Admin (Guto), `linked_member` ainda vem preenchido, mas `resolvePersona` em `src/lib/navigation.ts` aplica a regra: `isLinkedMember && !isLeader && !isHRAdmin` — então HR sempre vai para `/hr`, não para `/liderado`.
2. `**RoleRouteGuard**` redireciona automaticamente quem entra em `/lider/*` ou `/liderado/*` da persona errada para o `getHomeRoute(...)` correto.
3. **Multi-role** (Matheus M.: HR Admin + Líder de 4 times; Vitor: Owner + Líder de C-Level) já é tratado por `useActiveMode` — sidebar mostra o switcher Líder ↔ Empresa.
4. **Líderes que também aparecem como membros em outros times** (Caio em C-Level, Yasmin em CreativeOps, Douglas em C-Level): a RPC pula `linked_member` quando `is_team_leader=true`, então eles vão direto para `/lider/inicio` (comportamento correto pelo modelo de papéis).

## Plano

Como o estado já está consistente, este plano é só uma rede de segurança:

1. **Sanity check pós-fix** — rodar uma única query SQL parametrizada que retorna, para cada `linked_user_id` distinto do Faster, a persona resolvida pelo `get_account_context`, e gravar o resultado em `.lovable/plan.md` como evidência do snapshot. Sem mudanças de código nem de schema.
2. **Comunicar Guto** — pedir para cada liderado fazer logout/login (caso algum tenha logado antes do fix do RPC de ontem, o cache local de 5min do AccountContext pode ainda mostrar a tela antiga; um refresh resolve).
3. **Sem migração** — nenhuma alteração em RPC, RLS, `RoleRouteGuard`, `resolvePersona` ou tabelas.

Se você quiser que eu vá além disso (ex.: adicionar um botão "Forçar refetch de papel" para o caso de Guto precisar reauditar membros sem pedir logout, ou um relatório admin em `/admin` listando "persona resolvida vs. esperada" por workspace) > Pode fazer só precisa achar um nome mais didático para "refetch", pense sempre simples.

&nbsp;