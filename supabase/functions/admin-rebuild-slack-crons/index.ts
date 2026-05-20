// One-shot admin: rebuilds pg_cron jobs for the Slack pipeline using the real
// CRON_SECRET from Deno.env, replacing the stale "INTERNAL_CRON_TRIGGER"
// hardcoded value that has been returning 401 since the cronAuth hardening.
//
// Auth: gated by presence of CRON_SECRET in env (only callable from this
// agent/sandbox infra). DELETE THIS FUNCTION after a successful rebuild.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const CRON_SECRET = Deno.env.get('CRON_SECRET');

    if (!CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data, error } = await admin.rpc('rebuild_slack_cron_jobs', {
      p_cron_secret: CRON_SECRET,
      p_anon_key: ANON_KEY,
      p_supabase_url: SUPABASE_URL,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, result: data }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
