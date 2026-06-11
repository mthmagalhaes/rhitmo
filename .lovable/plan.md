## 🎫 TKT-2606-0003 · high · bug
👤 Afetado: guto.biazzi@fstr.co
📍 Rota: /hr/pessoas

### 📌 Sintoma
Banner vermelho: `RPC get_workspace_people failed: column tm.job_crafting_profile does not exist`. Lista zerada.

### 🔎 Causa raiz
A migration mais recente de `public.get_workspace_people` (criada na correção anterior do estado de sessão) calcula `has_sync` como:

```sql
(tm.skills_data IS NOT NULL OR tm.job_crafting_profile IS NOT NULL)
```

Mas `team_members` **não tem** a coluna `job_crafting_profile` — só `skills_data` (confirmado em `information_schema.columns`). A coluna provavelmente foi removida em refactor anterior do Rhitmo Sync, mas o RPC ficou referenciando. Como `STABLE` + planejador resolve nomes em execução, o erro só aparece quando a função efetivamente roda — por isso passou despercebido até o Guto carregar.

Mesmo bug presente em dois lugares dentro da função:
- bloco `pending` (CTE) — linha do `has_sync` de convites pendentes
- `SELECT` final — `CASE WHEN tm.id IS NULL ... ELSE (tm.skills_data IS NOT NULL OR tm.job_crafting_profile IS NOT NULL)`

### 💊 Solução
Nova migration que recria `get_workspace_people` idêntica à versão atual, **trocando** as duas expressões de `has_sync` por:

```sql
(tm.skills_data IS NOT NULL)
```

Sem mexer em RLS, sem mexer em assinatura/retorno (mesmas 17 colunas), sem mexer em frontend.

### ⚠️ Riscos
Nenhum. `has_sync` passa a refletir apenas `skills_data`, que é o sinal real de Rhitmo Sync hoje. Se no futuro voltarmos a ter um segundo sinal (ex.: `work_style_data`), trocamos a expressão na função.

### 🧪 Validação
1. Após a migration, Guto recarrega `/hr/pessoas` → tabela popula com 20+ pessoas, banner some.
2. `SELECT count(*) FROM get_workspace_people('27ee8977-…')` rodado como super_admin retorna >0.
3. Atualiza ticket TKT-2606-0003 → `resolved`.

### Escopo / Arquivos
- `supabase/migrations/<novo>.sql` — `CREATE OR REPLACE FUNCTION public.get_workspace_people(...)` sem `job_crafting_profile`.

### Fora de escopo
- Reintroduzir coluna `job_crafting_profile` (não é o pedido; foi removida intencionalmente).
- Mexer em `useWorkspacePeople` / `HRPessoas.tsx` (já estão corretos — inclusive foi o tratamento de erro novo que mostrou a mensagem real).
