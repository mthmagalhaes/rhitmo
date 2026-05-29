// ============================================================================
// admin-test-orchestrator — smoke test ponta-a-ponta do Slack orchestrator
//
// Permite que o líder (ou super_admin) dispare AGORA um brief DM de teste,
// ignorando a janela 12-36h. Reusa a mesma Block Kit / Slack API do
// slack-rhitmo-orchestrator. Se o líder não tem reunião agendada, envia um
// "ping" DM informando que o orquestrador está online.
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

function buildBriefDmBlocks(memberName: string, meetingId: string, memberId: string) {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🧪 *Teste do orquestrador da Rhitmo*\n\n👋 Esse é o brief que você receberia automaticamente antes da 1:1 com *${memberName}*.\nQuer que eu monte uma sugestão de pauta agora?`,
      },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '⚙️ Disparado manualmente em /lider/configuracoes' }],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          style: 'primary',
          text: { type: 'plain_text', text: '🧠 Gerar Pauta' },
          action_id: 'prep_1on1_brief',
          value: `${meetingId}:${memberId}`,
        },
      ],
    },
  ];
}

function buildPingBlocks() {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '🧪 *Teste do orquestrador da Rhitmo*\n\n✅ O orquestrador está online e consegue te enviar DMs.\n\nVocê ainda não tem uma 1:1 agendada nas próximas 20h, por isso não há brief para gerar agora. Assim que tiver, você receberá automaticamente ~18h antes.',
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

    // Próxima reunião na janela de 20h (mesma do orquestrador real)
    const nowIso = new Date().toISOString();
    const nowPlus20 = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();
    const { data: meeting } = await supabase
      .from('upcoming_meetings')
      .select('id, member_id, title, start_time, team_members:member_id ( name )')
      .eq('user_id', targetUserId)
      .gte('start_time', nowIso)
      .lte('start_time', nowPlus20)
      .not('member_id', 'is', null)
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    const memberName = (meeting as any)?.team_members?.name;
    const blocks =
      meeting && memberName
        ? buildBriefDmBlocks(memberName, (meeting as any).id, (meeting as any).member_id)
        : buildPingBlocks();

    const result = await slackApi('chat.postMessage', {
      channel: slackUserId,
      text: meeting ? `Teste: brief de 1:1 com ${memberName}` : 'Teste do orquestrador Rhitmo',
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
        scenario: meeting ? 'brief' : 'ping',
        member_name: memberName ?? null,
        meeting_id: (meeting as any)?.id ?? null,
        start_time: (meeting as any)?.start_time ?? null,
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
