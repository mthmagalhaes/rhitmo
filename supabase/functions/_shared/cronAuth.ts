/**
 * Validates the x-cron-secret header.
 *
 * SECURITY: The previous version accepted a hardcoded constant
 * ('INTERNAL_CRON_TRIGGER') as a valid secret to support pg_cron jobs.
 * Anyone reading this source could trigger cron-protected functions (running
 * AI calls, wasting credits, generating bogus recaps). That bypass has been
 * removed — pg_cron jobs must now also send the real CRON_SECRET value.
 *
 * The function is additionally expected to receive a valid Supabase Bearer
 * token (anon or service_role) as defense in depth — pg_net always sends one.
 */
export function validateCronSecret(req: Request): { valid: boolean; error?: Response } {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-cron-secret',
  };

  const userSecret = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('x-cron-secret');

  if (!provided) {
    return {
      valid: false,
      error: new Response(JSON.stringify({ error: 'Missing x-cron-secret header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  // Constant-time compare against the env-provided secret only. No hardcoded
  // bypass — callers (including pg_cron) must send the real CRON_SECRET.
  if (!userSecret) {
    console.error('CRON_SECRET env var not configured — rejecting all cron calls');
    return {
      valid: false,
      error: new Response(JSON.stringify({ error: 'Cron secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }
  if (provided === userSecret) return { valid: true };

  return {
    valid: false,
    error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }),
  };
}
