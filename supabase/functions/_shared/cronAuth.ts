/**
 * Validates the x-cron-secret header.
 * Accepts either:
 *  - the CRON_SECRET env var (manual triggers / external systems)
 *  - the internal pg_cron trigger constant (jobs scheduled in the database)
 *
 * The function is also expected to receive a valid Supabase Bearer token
 * (anon or service_role) as defense in depth — pg_net always sends one.
 */
const INTERNAL_CRON_TRIGGER = 'INTERNAL_CRON_TRIGGER';

export function validateCronSecret(req: Request): { valid: boolean; error?: Response } {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-cron-secret',
  };

  const userSecret = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('x-cron-secret');

  console.log('[cronAuth] provided header present:', !!provided, 'len:', provided?.length, 'userSecret present:', !!userSecret);

  if (!provided) {
    return {
      valid: false,
      error: new Response(JSON.stringify({ error: 'Missing x-cron-secret header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  // Accept either the user-defined secret OR the internal cron trigger constant.
  if (provided === INTERNAL_CRON_TRIGGER) return { valid: true };
  if (userSecret && provided === userSecret) return { valid: true };

  return {
    valid: false,
    error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }),
  };
}
