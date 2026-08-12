// One-shot admin: agenda o cron de sync do note taker (Granola) com o
// CRON_SECRET real do ambiente. Pode ser deletada após rodar com sucesso.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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
  const { data, error } = await admin.rpc('schedule_note_taker_cron', {
    p_cron_secret: CRON_SECRET,
    p_anon_key: ANON_KEY,
    p_supabase_url: SUPABASE_URL,
  });

  return new Response(JSON.stringify({ ok: !error, data, error: error?.message }), {
    status: error ? 500 : 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
