-- Sprint Support: incluir slack-rhitmo-orchestrator no rebuild de crons do Slack.
-- Job 'rhitmo-orchestrator-every-30min' (id 20) ainda envia o literal
-- 'INTERNAL_CRON_TRIGGER' como x-cron-secret e por isso recebe 401 em todo
-- tick desde o hardening do cronAuth, bloqueando 100% das DMs proativas
-- (brief de 1:1 e lembrete de Pulse).
-- Aqui só atualizamos a RPC pra contemplar o orquestrador. A reconstrução
-- efetiva do job é feita ao chamar a edge function `admin-rebuild-slack-crons`,
-- que injeta o CRON_SECRET real do Deno.env (nunca commitado).

CREATE OR REPLACE FUNCTION public.rebuild_slack_cron_jobs(
  p_cron_secret text,
  p_anon_key text,
  p_supabase_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'cron', 'net'
AS $function$
declare
  v_targets jsonb := '[
    {"name":"detect-network-signals-daily","fn":"detect-network-signals","schedule":"30 3 * * *"},
    {"name":"quarterly-recap-slack-delivery","fn":"slack-deliver-quarterly-recap","schedule":"0 13 1 1,4,7,10 *"},
    {"name":"slack-ambient-classifier-daily","fn":"slack-ambient-classifier","schedule":"0 9,21 * * *"},
    {"name":"slack-weekly-rollup-daily","fn":"slack-weekly-rollup","schedule":"30 4 * * *"},
    {"name":"rhitmo-orchestrator-every-30min","fn":"slack-rhitmo-orchestrator","schedule":"*/30 * * * *"}
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

    begin
      perform cron.unschedule(v_target->>'name');
    exception when others then
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
$function$;