---
name: RPC Smoke Assertion
description: Toda migration que altera RPC público ou colunas core deve terminar com `_assert_rpc_runs` para forçar o planejador a bindar colunas e quebrar a migration se houver referência fantasma.
type: preference
---

## Regra

Toda migration que:
- cria/altera função `public.*` consumida pelo frontend ou edge, **ou**
- altera/dropa coluna de `team_members`, `teams`, `workspaces`, `feedbacks`, `performance_reviews`, `context_evidence`

**deve terminar com** uma chamada `select public._assert_rpc_runs(...)` para cada RPC dependente.

## Por quê
Funções SQL/plpgsql resolvem nomes de coluna em **runtime**. `CREATE OR REPLACE FUNCTION` aceita referência a coluna fantasma sem erro. Quando a coluna é dropada em outra migration, o RPC fica quebrado e só estoura quando um usuário carrega a tela. Foi exatamente o que aconteceu em TKT-2606-0003 (`tm.job_crafting_profile` em `get_workspace_people`).

## Como aplicar

```sql
-- no fim da migration
select public._assert_rpc_runs($$ select * from public.get_workspace_people(null::uuid) limit 0 $$);
```

`LIMIT 0` não retorna dados, mas obriga o planejador a resolver todas as colunas. Se a coluna sumiu, a migration aborta com mensagem clara.

## RPCs com baseline coberto (atualizar quando criar novos load-bearing)

| RPC | Assinatura de smoke-test |
|---|---|
| `get_workspace_people` | `select * from public.get_workspace_people(null::uuid) limit 0` |
| `get_team_timeline` | `select * from public.get_team_timeline(null::uuid, null::uuid[], null::text[], null::timestamptz, 0) limit 0` |
| `get_account_context` | `select public.get_account_context(null::uuid, null::text) limit 0` |
| `get_team_pulse` | `select * from public.get_team_pulse(7) limit 0` |
| `effective_user_id` | `select public.effective_user_id() limit 0` |

## Quando alterar um RPC dessa lista
Adicionar a chamada `_assert_rpc_runs` correspondente no fim da migration. Se criar um RPC novo "load-bearing" (chamado pelo dashboard, sidebar, ou home), adicione aqui e crie smoke-test no momento da criação.
