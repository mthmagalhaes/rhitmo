create or replace function public.rebuild_slack_cron_jobs(
  p_cron_secret text,
  p_anon_key text,
  p_supabase_url text
) returns jsonb
language plpgsql
security definer
set search_path = public, cron, net
as $$
declare
  v_targets jsonb := '[
    {"name":"detect-network-signals-daily","fn":"detect-network-signals","schedule":"30 3 * * *"},
    {"name":"quarterly-recap-slack-delivery","fn":"slack-deliver-quarterly-recap","schedule":"0 13 1 1,4,7,10 *"},
    {"name":"slack-ambient-classifier-daily","fn":"slack-ambient-classifier","schedule":"0 9,21 * * *"},
    {"name":"slack-weekly-rollup-daily","fn":"slack-weekly-rollup","schedule":"30 4 * * *"}
  ]'::jsonb;
  v_target jsonb;
  v_headers text;
  v_cmd text;
  v_results jsonb := '[]'::jsonb;
  v_jobid bigint;
begin
  if p_cron_secret is null or length(p_cron_secret) < 8 then
    raise exception 'p_cron_secret missing or too short';
  end if;

  for v_target in select * from jsonb_array_elements(v_targets)
  loop
    v_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', p_cron_secret,
      'Authorization', 'Bearer ' || p_anon_key
    )::text;

    v_cmd := format(
      $cmd$
SELECT net.http_post(
  url := %L,
  headers := %L::jsonb,
  body := jsonb_build_object('trigger','cron','time', now())
) AS request_id;
      $cmd$,
      p_supabase_url || '/functions/v1/' || (v_target->>'fn'),
      v_headers
    );

    -- Unschedule existing job by name (idempotent), then reschedule with new command
    begin
      perform cron.unschedule(v_target->>'name');
    exception when others then
      -- ignore if not exists
      null;
    end;

    v_jobid := cron.schedule(v_target->>'name', v_target->>'schedule', v_cmd);

    v_results := v_results || jsonb_build_object(
      'name', v_target->>'name',
      'jobid', v_jobid,
      'schedule', v_target->>'schedule',
      'fn', v_target->>'fn'
    );
  end loop;

  return jsonb_build_object('ok', true, 'jobs', v_results);
end;
$$;

revoke all on function public.rebuild_slack_cron_jobs(text, text, text) from public, anon, authenticated;
grant execute on function public.rebuild_slack_cron_jobs(text, text, text) to service_role;