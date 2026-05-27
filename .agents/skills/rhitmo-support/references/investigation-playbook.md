# Investigation Playbook

Queries e tool calls prontos. Adapte os placeholders.

## Resolver user pelo email
```sql
SELECT id, email, last_sign_in_at, created_at,
       raw_user_meta_data->>'full_name' AS full_name
FROM auth.users WHERE lower(email) = lower('USER_EMAIL');
```

## Workspaces que o user pertence
```sql
SELECT w.id, w.name, w.owner_id,
       (w.owner_id = 'USER_ID'::uuid) AS is_owner,
       ('USER_ID'::uuid = ANY(COALESCE(w.hr_admin_ids,'{}'))) AS is_hr_admin
FROM workspaces w
WHERE w.owner_id = 'USER_ID'::uuid
   OR 'USER_ID'::uuid = ANY(COALESCE(w.hr_admin_ids,'{}'));

SELECT t.id AS team_id, t.name AS team_name, t.workspace_id,
       (t.leader_user_id = 'USER_ID'::uuid) AS is_leader,
       tm.id AS member_id, tm.linked_user_id
FROM teams t
LEFT JOIN team_members tm ON tm.team_id = t.id
WHERE t.leader_user_id = 'USER_ID'::uuid
   OR tm.linked_user_id = 'USER_ID'::uuid;
```

## Account context (espelha o que o frontend recebe)
```sql
SELECT * FROM get_account_context('USER_ID'::uuid);
```

## Convite consumido / status
```sql
SELECT id, email, invited_at, confirmed_at, last_sign_in_at,
       confirmation_sent_at, recovery_sent_at
FROM auth.users WHERE email = 'USER_EMAIL';
```

## Logs — edge function
Tool: `supabase--edge_function_logs` com `function_name` + `search` (email, user_id, ou trecho do erro).

## Logs — postgres/auth/edge HTTP
Tool: `supabase--analytics_query`.

Auth (últimas 24h, com erro):
```
select id, auth_logs.timestamp, event_message, metadata.level, metadata.status, metadata.path, metadata.msg, metadata.error
from auth_logs
cross join unnest(metadata) as metadata
where auth_logs.timestamp > timestamp_sub(current_timestamp(), interval 24 hour)
  and (metadata.level = 'error' or metadata.status >= 400)
order by timestamp desc limit 50
```

Edge HTTP por função:
```
select function_edge_logs.timestamp, event_message, response.status_code,
       request.method, m.execution_time_ms
from function_edge_logs
cross join unnest(metadata) as m
cross join unnest(m.response) as response
cross join unnest(m.request) as request
where m.function_id = 'FUNCTION_ID'
  and function_edge_logs.timestamp > timestamp_sub(current_timestamp(), interval 24 hour)
order by timestamp desc limit 50
```

## RLS check rápido para uma tabela
```sql
SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr,
       pg_get_expr(polwithcheck, polrelid) AS with_check_expr
FROM pg_policy
WHERE polrelid = 'public.TABLE_NAME'::regclass;
```

## Simular acesso como user X (sem mutar)
Use `set_config('request.jwt.claim.sub', 'USER_ID', true)` dentro de transação read-only:
```sql
BEGIN;
SELECT set_config('request.jwt.claim.sub', 'USER_ID', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT count(*) FROM <tabela_suspeita>;
ROLLBACK;
```

## Abrir/atualizar ticket
```sql
SELECT support_ticket_open('{
  "affected_user_email":"...","route":"...",
  "category":"bug","severity":"medium",
  "title":"...","symptom":"...","hypothesis":"...",
  "tags":["auth","invite"]
}'::jsonb);

SELECT support_ticket_update('TKT-AAMM-XXXX', '{
  "status":"diagnosed",
  "root_cause":"...",
  "resolution_proposal":"...",
  "edge_functions":["invite-hr-admin"],
  "files_touched":["src/components/settings/AccessTab.tsx"],
  "memory_refs":["mem://auth/invite-link-parameter-compatibility"]
}'::jsonb);
```

## Listar tickets recentes (durante triagem para checar duplicata)
```sql
SELECT ticket_number, status, severity, title, affected_user_email, created_at
FROM support_tickets
WHERE created_at > now() - interval '30 days'
ORDER BY created_at DESC LIMIT 20;
```

## Frontend boot quebrado / tela branca em produção

Quando o sintoma é "app fora do ar" mas backend está OK:

1. **Confirmar que é frontend, não backend**:
   ```bash
   curl -sI https://rhitmo.co                       # espera 200
   curl -s https://rhitmo.co | grep -oE 'assets/[^"]+\.js' | head -5
   ```
   Se HTML chega e backend está `ACTIVE_HEALTHY` (via `supabase--cloud_status`), é bundle.

2. **Capturar o erro real** do browser (preview da sandbox ou prod):
   - `code--read_console_logs` no preview, ou pedir ao Matheus screenshot do console em prod.
   - Procurar especificamente: `Cannot access '\w+' before initialization` ou `Cannot read properties of undefined (reading 'createContext'...)`.

3. **Identificar o chunk culpado**:
   ```bash
   # qual chunk lança o erro? (ex: vendor-i18n-XXXX.js:1:NNNN)
   # baixar e ver o início — primeiros imports revelam o ciclo:
   curl -s https://rhitmo.co/assets/vendor-i18n-XXXX.js | head -c 400
   curl -s https://rhitmo.co/assets/vendor-react-YYYY.js | head -c 400
   ```
   Se cada um importa do outro → ciclo de chunk.

4. **Fix imediato**: remover `manualChunks` em `vite.config.ts` (ver pitfall em `known-pitfalls.md`).

5. **Validar pós-deploy**:
   - `curl -s https://rhitmo.co | grep -oE 'assets/[^"]+\.js'` → novos hashes.
   - Browser console limpo (só `Auth event: INITIAL_SESSION` é esperado).
   - Smoke test em rota com lib pesada (`/lider/analytics` para Recharts, `/lider/diario` para Tiptap, `/lider/configuracoes` para Radix).
