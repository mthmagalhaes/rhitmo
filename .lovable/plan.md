## Objetivo
Impedir que um RPC volte a referenciar coluna inexistente (como `tm.job_crafting_profile`) e só estourar em produção quando o usuário carrega a tela.

## Causa raiz (1 linha)
Funções SQL/plpgsql resolvem nomes de coluna **em runtime**. `CREATE OR REPLACE FUNCTION` aceita referência a coluna fantasma sem erro. Quando a coluna é removida em outra migration, o RPC continua "verde" até alguém executar.

## Proposta — 1 guarda só, na própria migration

Criar uma função utilitária `public._assert_rpc_runs(sql text)` e, **ao final de toda migration que altera RPC público ou coluna de `team_members`/`teams`/`workspaces`**, chamar um smoke-test que força o planejador a bindar as colunas:

```sql
-- no fim da migration
select public._assert_rpc_runs($$ select * from public.get_workspace_people(null::uuid) limit 0 $$);
select public._assert_rpc_runs($$ select * from public.get_team_timeline(null::uuid) limit 0 $$);
-- … 1 linha por RPC crítico
```

`_assert_rpc_runs` faz `EXECUTE sql` dentro de um bloco `BEGIN/EXCEPTION`. Se a coluna não existir, a migration falha **antes** de ir pro banco — exatamente o sinal que faltou agora.

Lista inicial de RPCs cobertos (os "load-bearing" do app):
- `get_workspace_people`
- `get_team_timeline`
- `get_account_context`
- `get_team_pulse`
- `effective_user_id`

Custo: ~5 linhas por migration, zero impacto em runtime (LIMIT 0 não retorna dados, mas obriga o planejador a resolver colunas).

## O que NÃO vamos fazer (pra manter simples)
- ❌ CI externo / GitHub Actions
- ❌ Suite de testes Deno paralela
- ❌ Reintroduzir `job_crafting_profile`
- ❌ Mover RPCs pra views materializadas

## Memória
Adicionar regra Core em `mem://index.md`:
> Toda migration que altera RPC público ou coluna de tabelas core (`team_members`, `teams`, `workspaces`) deve terminar com `select public._assert_rpc_runs(...)` para cada RPC dependente — força o planejador a bindar colunas e quebra a migration se houver referência fantasma.

E memória detalhada em `mem://architecture/rpc-smoke-assertion.md` com a lista de RPCs cobertos.

## Arquivos
1. `supabase/migrations/<novo>.sql` — cria `public._assert_rpc_runs(text)` + roda smoke-test inicial nos 5 RPCs listados (valida que estão sãos hoje).
2. `mem://index.md` — nova linha em Core + referência.
3. `mem://architecture/rpc-smoke-assertion.md` — regra + lista.

Pronto. Próxima vez que alguém dropar uma coluna usada por um RPC, a migration falha na hora do deploy, não no navegador do Guto.