# Anti-Patterns

## 1. CHECK constraint com `now()` ou dado mutável
**Sintoma:** migration falha; ou pior, restore quebra meses depois.
**Causa:** Postgres exige CHECK imutável.
**Fix:** use TRIGGER `BEFORE INSERT/UPDATE` que RAISE EXCEPTION.

## 2. Policy recursiva (SELECT da própria tabela)
**Sintoma:** `infinite recursion detected in policy`.
**Causa:** policy faz `SELECT ... FROM mesma_tabela`.
**Fix:** SECURITY DEFINER function isolada (memória `architecture/rls-recursion-prevention`):
```sql
CREATE FUNCTION public.is_team_leader(_team_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM teams WHERE id = _team_id AND leader_user_id = _uid) $$;
```

## 3. Role em `profiles.role` (privilege escalation)
**Sintoma:** usuário comum vira admin via UPDATE no próprio profile.
**Fix:** role SÓ em `user_roles` com enum `app_role`. Checagem via `has_role(auth.uid(), 'admin')`. Nunca expor INSERT/UPDATE em `user_roles` ao `authenticated`.

## 4. `effective_user_id()` sem `LIMIT 1`
**Sintoma:** durante impersonação, retorna múltiplas linhas → vazamento entre workspaces.
**Causa:** subquery sem LIMIT pode retornar mais de uma row, e RLS subsequente vaza.
**Fix:** memória `infrastructure/security-hardening-pii-exposure-fix`. Toda implementação interna usa `LIMIT 1`. Se for criar variante, manter.

## 5. Esquecer GRANT na mesma migration
**Sintoma:** Data API: `permission denied for table X`.
**Causa:** Supabase não dá grant default em `public` para `anon`/`authenticated`/`service_role`.
**Fix:** SEMPRE 4 etapas na ordem: CREATE → GRANT → ENABLE RLS → POLICY.

## 6. FK para `auth.users`
**Sintoma:** restore quebra; "must be owner of relation users".
**Fix:** `uuid` solto + validação por `auth.uid()`. Sem FK.

## 7. `ALTER DATABASE postgres ...`
**Sintoma:** migration rejeitada pelo Cloud.
**Fix:** use ALTER ROLE / SET no nível da role ou schema.

## 8. Editar `auth.*`, `storage.*`, `realtime.*`, `supabase_functions.*`, `vault.*`
**Proibido.** Inclui triggers nesses schemas. Use schema `public` + lógica em edge function.

## 9. RPC pública sem `_assert_rpc_runs`
**Sintoma:** RPC quebra em produção sem aviso; frontend cai silencioso.
**Fix:** memória `architecture/rpc-smoke-assertion`. Toda migration que cria/altera RPC chamada do frontend encerra com:
```sql
SELECT public._assert_rpc_runs('nome_rpc');
```

## 10. `description` da migration com SQL ou keywords
**Sintoma:** PR review fica confuso; usuário não-técnico não entende.
**Fix:** prosa em PT, bullets, sem SELECT/INSERT/UPDATE/DELETE/GRANT. Liste tabelas afetadas e regras de acesso em linguagem natural.

## 11. Policy `FOR ALL` quando precisa de WITH CHECK diferente
**Sintoma:** UPDATE consegue mover row pra outro dono.
**Fix:** policies separadas por operação. `FOR ALL` só quando `USING` = `WITH CHECK`.

## 12. Coluna sem NOT NULL nem default que entra em INSERT do frontend
**Sintoma:** `null value violates not-null constraint` na primeira mutação real.
**Fix:** decidir antes — ou NOT NULL com DEFAULT, ou explicitamente nullable. Não deixar pro acaso.

## 13. Não chamar `supabase--migration` como tool dedicada
**Sintoma:** mudança no schema sem aprovação do usuário; types desatualizados.
**Fix:** SEMPRE via `supabase--migration` (1 chamada isolada, sem paralelizar). Aguardar aprovação. Só depois escrever código frontend que depende do schema novo.
