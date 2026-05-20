// One-shot admin: recria os pg_cron jobs do pipeline Slack com o CRON_SECRET
// real injetado, substituindo o "INTERNAL_CRON_TRIGGER" hardcoded que está
// retornando 401 desde o hardening do validateCronSecret.
//
// Autenticação: chamador precisa enviar header `x-cron-secret` com o valor
// correto (mesmo secret que vamos injetar nos jobs). Isso garante que só
// quem já tem o secret pode reescrever os jobs.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const TARGETS = [
  { jobid: 22, name: 'detect-network-signals-daily',  fn: 'detect-network-signals',  schedule: '30 3 * * *' },
  { jobid: 24, name: 'quarterly-recap-slack-delivery', fn: 'slack-deliver-quarterly-recap', schedule: '0 13 1 1,4,7,10 *' },
  { jobid: 26, name: 'slack-ambient-classifier-daily', fn: 'slack-ambient-classifier', schedule: '0 9,21 * * *' },
  { jobid: 27, name: 'slack-weekly-rollup-daily',      fn: 'slack-weekly-rollup',     schedule: '30 4 * * *' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Caller must already know the secret to invoke this admin endpoint.
  const provided = req.headers.get('x-cron-secret') ?? req.headers.get('x-admin-secret');
  if (provided !== cronSecret) {
    // Allow alternative: super-admin user JWT (matheus@rhitmo.co) if no header given
    return new Response(JSON.stringify({ error: 'Unauthorized — send x-cron-secret header' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const results: any[] = [];

  for (const t of TARGETS) {
    const url = `${SUPABASE_URL}/functions/v1/${t.fn}`;
    const headersJson = JSON.stringify({
      'Content-Type': 'application/json',
      'x-cron-secret': cronSecret,
      'Authorization': `Bearer ${ANON_KEY}`,
    });

    const command = `
SELECT net.http_post(
  url:='${url}',
  headers:='${headersJson.replace(/'/g, "''")}'::jsonb,
  body:=concat('{"trigger":"cron","time":"', now(), '"}')::jsonb
) AS request_id;`.trim();

    // cron.alter_job preserves the jobid and just rewrites schedule + command
    const { error } = await admin.rpc('exec_sql_admin', {
      sql: `SELECT cron.alter_job(${t.jobid}, schedule => '${t.schedule}', command => $cmd$${command}$cmd$);`,
    });

    if (error) {
      // Fallback: unschedule + reschedule by name
      const { error: rescheduleErr } = await admin.rpc('exec_sql_admin', {
        sql: `
          SELECT cron.unschedule('${t.name}');
          SELECT cron.schedule('${t.name}', '${t.schedule}', $cmd$${command}$cmd$);
        `,
      });
      results.push({ job: t.name, ok: !rescheduleErr, error: rescheduleErr?.message ?? error.message });
    } else {
      results.push({ job: t.name, ok: true, method: 'alter_job' });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
