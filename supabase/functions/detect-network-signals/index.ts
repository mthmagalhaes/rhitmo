/**
 * detect-network-signals — camada de rede (ONA passivo).
 *
 * Cron diário. Reconstrói `team_network_edges` (30/60/90 dias) a partir das
 * threads já capturadas em `slack_ambient_evidence` e roda a detecção de
 * sinais (isolate / super_connector / pattern_drop) em `network_signals`.
 *
 * Toda a lógica pesada mora no banco (`rebuild_team_network` /
 * `detect_network_signals`, ambas SECURITY DEFINER e só executáveis pelo
 * service_role). Aqui só orquestramos e logamos.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { validateCronSecret } from '../_shared/cronAuth.ts';
import { createLogger } from '../_shared/logger.ts';
import { tryRpc } from '../_shared/safeSupabase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const WINDOWS = [30, 60, 90] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = validateCronSecret(req);
  if (!auth.valid) return auth.error!;

  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = createLogger({ functionName: 'detect-network-signals', requestId });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const result: Record<string, number | string> = {};

  try {
    log.info('start');

    for (const w of WINDOWS) {
      const rebuilt = await tryRpc<number>(supabase, 'rebuild_team_network', {
        _window_days: w,
      });
      if (rebuilt === null) {
        log.error(`rebuild_team_network(${w}) failed`);
        result[`edges_${w}`] = 'error';
      } else {
        result[`edges_${w}`] = rebuilt;
      }
    }

    const sig = await tryRpc<number>(supabase, 'detect_network_signals', {
      _window_days: 30,
    });
    if (sig === null) {
      log.error('detect_network_signals failed');
      result.signals = 'error';
    } else {
      result.signals = sig;
    }


    log.info('done', result);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    log.error('unexpected failure', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } finally {
    await log.flush();
  }
});
