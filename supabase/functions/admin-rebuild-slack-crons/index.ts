// One-shot admin: rebuilds pg_cron jobs for the Slack pipeline using the real
// CRON_SECRET from Deno.env, replacing the stale "INTERNAL_CRON_TRIGGER"
// hardcoded value that has been returning 401 since the cronAuth hardening.
//
// Auth: caller must be authenticated as super-admin (matheus@rhitmo.co).
// The CRON_SECRET never leaves the server.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const SUPER_ADMIN_EMAIL = 'matheus@rhitmo.co';

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

    // Verify caller identity via their JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    console.log('[auth] has_header:', !!authHeader, 'token_len:', token.length);

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized — no auth header', headers_seen: [...req.headers.keys()] }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized — invalid token', detail: userErr?.message }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Forbidden — super-admin only', email: user.email }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call SECURITY DEFINER function via service role
    // (admin client already created above)
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
