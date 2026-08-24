// ============================================================================
// admin-test-orchestrator — smoke test ponta-a-ponta do Slack orchestrator
//
// Permite que o líder (ou super_admin) valide AGORA se o bot consegue lhe
// enviar DMs. Envia apenas um "ping" — DMs proativas de pauta foram removidas.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function slackApi(method: string, body: Record<string, unknown>) {
  const token = Deno.env.get('SLACK_BOT_TOKEN');
  if (!token) return { ok: false, error: 'missing_slack_bot_token' };
  try {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error('[TEST_ORCH] slackApi threw', method, err);
    return { ok: false, error: 'fetch_failed' };
  }
}

function buildPingBlocks() {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '🧪 *Teste do orquestrador da Rhitmo*\n\n✅ O orquestrador está online e consegue te enviar DMs.\n\nPara gerar a pauta de uma 1:1, use o comando `/rhitmo` ou me mande uma mensagem por aqui.',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '⚙️ Disparado manualmente em /lider/configuracoes',
        },
      ],
    },
  ];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user: caller } } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId: string = body.targetUserId || caller.id;

    // Super admin pode mirar outro líder; usuário comum só em si próprio
    if (targetUserId !== caller.id) {
      const { data: roleCheck } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      if (!roleCheck) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Resolve slack user id
    const { data: integration } = await supabase
      .from('slack_integrations')
      .select('slack_user_id')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const slackUserId = integration?.slack_user_id;
    if (!slackUserId) {
      return new Response(
        JSON.stringify({
          ok: false,
          stage: 'no_slack_integration',
          message: 'Esse usuário ainda não conectou o Slack.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const blocks = buildPingBlocks();

    const result = await slackApi('chat.postMessage', {
      channel: slackUserId,
      text: 'Teste do orquestrador Rhitmo',
      blocks,
    });

    if (!result.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          stage: 'slack_post_failed',
          slack_error: result.error,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent_to_slack_user: slackUserId,
        scenario: 'ping',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[TEST_ORCH] threw', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
