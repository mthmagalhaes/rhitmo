/**
 * Validates the x-cron-secret header against the CRON_SECRET environment variable.
 * Used to prevent external invocation of cron-triggered edge functions.
 */
export function validateCronSecret(req: Request): { valid: boolean; error?: Response } {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-cron-secret',
  };

  const expected = Deno.env.get('CRON_SECRET');
  if (!expected) {
    return {
      valid: false,
      error: new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  const provided = req.headers.get('x-cron-secret');
  if (provided !== expected) {
    return {
      valid: false,
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  return { valid: true };
}
