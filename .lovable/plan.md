## Análise — "perdi acesso aos perfis dos liderados" (Gutemberg / Faster)

### O que está acontecendo
Print mostra **/hr/pessoas** do workspace **Faster** com **todas as abas zeradas** ("Todos · 0", "Liderados · 0", etc.) e a mensagem "Nenhuma pessoa encontrada com esses filtros". Ou seja: a página está carregando, o `workspaceName` resolveu certo ("Diretório do workspace Faster"), mas o RPC `get_workspace_people` está retornando vazio para o Guto.

### O que verifiquei no banco
- Guto (`guto.biazzi@fstr.co`, `20156655-…`): conta única, último login 02/jun.
- Workspace `Faster` (`27ee8977-…`): `is_active=true`, owner = `vitor@fstr.co`, **Guto está em `hr_admin_ids`** (junto com Matheus).
- Dados existem e estão saudáveis: **9 times**, **20 liderados ativos** (não arquivados), **18 vinculados**, **5 líderes distintos**, 0 convites pendentes.
- Não há erros recentes em `postgres_logs`/`postgrest_logs` para `get_workspace_people` nem `forbidden`.
- Função `get_workspace_people(uuid)` existe em versão única, `SECURITY DEFINER`, com `GRANT EXECUTE` para `authenticated` ok.

### Hipótese mais provável
O `HRAdminGuard` resolve corretamente o workspace pelo `user.id`, mas o `useWorkspacePeople` está sendo chamado num momento em que o **JWT do supabase-js ainda não tem `sub`** (estado intermediário de hidratação da sessão) **ou** com um `workspaceId` formatado de maneira que não bate na checagem. Como o RPC levanta `EXCEPTION 'forbidden'` quando o `auth.uid()` não está em `owner_id`/`hr_admin_ids` e o `useQuery` está usando `safeRpc` (que **lança** em erro), provavelmente o erro está sendo silenciado por um boundary mais acima e a lista cai pra `[]`. Não há `onError` em `useWorkspacePeople`, então o usuário vê "vazio" em vez de uma mensagem.

Vetores secundários a descartar:
- Possível duplicidade futura de `Faster (legado)` afetando o `HRAdminGuard` (hoje legado é `is_active=false`, então não afeta).
- Cache stale do React Query persistido com `[]` antes da sessão hidratar.

### Plano de correção (mínimo invasivo, não-destrutivo)

1. **Diagnóstico in-app**: em `useWorkspacePeople`, trocar `safeRpc` por chamada que preserve `error` e retornar `{ data, error, isLoading }`. Em `HRPessoas`, quando `error` existir, mostrar banner com a mensagem real (ex.: "forbidden" ou erro de rede) e botão "Tentar novamente". Isso elimina a falsa tela "vazia" definitivamente.
2. **Hardening do RPC**: em `get_workspace_people`, em vez de `RAISE EXCEPTION 'forbidden'`, retornar `0 rows` apenas quando `auth.uid()` é `NULL` (sessão ainda não pronta) e manter o `RAISE` somente quando há `uid` mas sem permissão — assim evita estado "vazio sem erro" silencioso e ainda protege.
3. **Refetch ao trocar sessão**: garantir que a `queryKey` do `useWorkspacePeople` inclua o `user.id` além do `workspaceId`, para invalidar quando o JWT muda.
4. **Auditoria pontual da conta do Guto**: rodar `select get_workspace_people('27ee8977-…')` autenticado como ele (via edge function utilitária temporária `debug-rpc-as-user` restrita a super_admin) para confirmar que o RPC devolve as 25+ linhas. Se devolver, fechamos como bug de UI/sessão. Se não devolver, é regressão do RPC.

### Comunicação imediata pro Guto (enquanto corrigimos)
> "Oi Guto, identificamos um bug de carregamento: a lista de pessoas está retornando vazia mesmo com seu acesso de HR Admin correto. Os dados estão íntegros (20 liderados, 9 times). Estamos subindo um fix em algumas horas. Por enquanto, tenta: (1) sair e entrar de novo, (2) limpar cache do navegador, ou (3) acessar pelo perfil do Matheus."

### Escopo / Arquivos
- `src/hooks/useWorkspacePeople.ts` — expor `error` + incluir `user.id` na `queryKey`.
- `src/pages/HRPessoas.tsx` — estado de erro com retry, não cair no "vazio".
- Migration nova — refino do `get_workspace_people` para distinguir "sessão sem uid" vs "uid sem permissão".
- (Opcional) edge function `debug-rpc-as-user` gated por super_admin para reproduzir o caso em produção.

### Fora de escopo
- Repensar modelo de papéis ou reescrever a página.
- Mexer no `HRAdminGuard` além da `queryKey`.
