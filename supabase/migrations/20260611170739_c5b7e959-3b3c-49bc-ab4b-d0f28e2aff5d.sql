-- Anti-ghost-column guard: force planner to bind columns of critical RPCs.
-- If a referenced column was dropped, this migration fails immediately
-- instead of letting the error surface later in production.

CREATE OR REPLACE FUNCTION public._assert_rpc_runs(_sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE _sql;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'RPC smoke-test failed for [%]: %', _sql, SQLERRM;
END;
$$;

COMMENT ON FUNCTION public._assert_rpc_runs(text) IS
'Smoke-test helper. Call at the end of any migration that alters a public RPC or a column of team_members/teams/workspaces, e.g.:
  select public._assert_rpc_runs($$ select * from public.get_workspace_people(null::uuid) limit 0 $$);
Forces the planner to bind column names so dropped columns break the migration, not the user.';

-- Baseline smoke-tests for the load-bearing RPCs today.
SELECT public._assert_rpc_runs($$ SELECT * FROM public.get_workspace_people(NULL::uuid) LIMIT 0 $$);
SELECT public._assert_rpc_runs($$ SELECT * FROM public.get_team_timeline(NULL::uuid, NULL::uuid[], NULL::text[], NULL::timestamptz, 0) LIMIT 0 $$);
SELECT public._assert_rpc_runs($$ SELECT public.get_account_context(NULL::uuid, NULL::text) LIMIT 0 $$);
SELECT public._assert_rpc_runs($$ SELECT * FROM public.get_team_pulse(7) LIMIT 0 $$);
SELECT public._assert_rpc_runs($$ SELECT public.effective_user_id() LIMIT 0 $$);