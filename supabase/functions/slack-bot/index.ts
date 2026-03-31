import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ── Slack Signature Verification ──────────────────────────
async function verifySlackSignature(req: Request, body: string): Promise<boolean> {
  const signingSecret = Deno.env.get('SLACK_SIGNING_SECRET');
  console.log('[VERIFY] Signing secret exists:', !!signingSecret);
  if (!signingSecret) return false;

  const timestamp = req.headers.get('x-slack-request-timestamp');
  const slackSignature = req.headers.get('x-slack-signature');
  console.log('[VERIFY] Timestamp header:', timestamp);
  console.log('[VERIFY] Signature header present:', !!slackSignature);
  if (!timestamp || !slackSignature) return false;

  const now = Math.floor(Date.now() / 1000);
  const delta = Math.abs(now - parseInt(timestamp));
  console.log('[VERIFY] Timestamp delta (seconds):', delta);
  if (delta > 300) {
    console.log('[VERIFY] REJECTED: timestamp too old');
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sigBasestring));
  const hexDigest = 'v0=' + Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

  const match = hexDigest === slackSignature;
  console.log('[VERIFY] Calculated (first 20):', hexDigest.substring(0, 20));
  console.log('[VERIFY] Received   (first 20):', slackSignature.substring(0, 20));
  console.log('[VERIFY] Result:', match ? 'VALID' : 'INVALID');
  return match;
}

// ── Helper: Get User Persona ──────────────────────────────
interface PersonaResult {
  persona: 'leader' | 'direct_report' | 'hr_admin' | 'unauthenticated';
  userId?: string;
  workspaceId?: string;
  memberId?: string;
}

async function getUserPersona(slackUserId: string): Promise<PersonaResult> {
  console.log('[PERSONA] Looking up slack_user_id:', slackUserId);

  const { data: integration, error: intError } = await supabase
    .from('slack_integrations')
    .select('user_id, workspace_id')
    .eq('slack_user_id', slackUserId)
    .limit(1)
    .maybeSingle();

  console.log('[PERSONA] Integration found:', !!integration, 'error:', intError?.message || 'none');

  if (!integration) return { persona: 'unauthenticated' };

  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('owner_id, hr_admin_ids')
    .eq('id', integration.workspace_id)
    .single();

  console.log('[PERSONA] Workspace found:', !!workspace, 'error:', wsError?.message || 'none');

  if (workspace?.owner_id === integration.user_id) {
    console.log('[PERSONA] Result: leader (workspace owner)');
    return { persona: 'leader', userId: integration.user_id, workspaceId: integration.workspace_id };
  }

  if (workspace?.hr_admin_ids?.includes(integration.user_id)) {
    console.log('[PERSONA] Result: hr_admin');
    return { persona: 'hr_admin', userId: integration.user_id, workspaceId: integration.workspace_id };
  }

  const { data: member } = await supabase
    .from('team_members')
    .select('id')
    .eq('linked_user_id', integration.user_id)
    .limit(1)
    .maybeSingle();

  if (member) {
    console.log('[PERSONA] Result: direct_report, memberId:', member.id);
    return { persona: 'direct_report', userId: integration.user_id, workspaceId: integration.workspace_id, memberId: member.id };
  }

  console.log('[PERSONA] Result: leader (fallback)');
  return { persona: 'leader', userId: integration.user_id, workspaceId: integration.workspace_id };
}

// ── Slack API Helper ──────────────────────────────────────
async function slackApi(method: string, body: Record<string, unknown>) {
  const token = Deno.env.get('SLACK_BOT_TOKEN');
  console.log('[SLACK_API] Calling:', method, '| Token exists:', !!token, '| Body keys:', Object.keys(body).join(','));

  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log('[SLACK_API] Response:', method, '| ok:', json.ok, '| error:', json.error || 'none');
  return json;
}

// ── Command: /rhitmo ──────────────────────────────────────
async function handleRhitmoCommand(params: URLSearchParams) {
  const slackUserId = params.get('user_id')!;
  const channelId = params.get('channel_id')!;
  console.log('[CMD /rhitmo] user:', slackUserId, 'channel:', channelId);

  const persona = await getUserPersona(slackUserId);
  console.log('[CMD /rhitmo] persona:', persona.persona);

  if (persona.persona === 'unauthenticated') {
    await slackApi('chat.postEphemeral', {
      channel: channelId,
      user: slackUserId,
      text: '❌ Conecte sua conta Rhitmo primeiro nas configurações do app: https://rhitmo.lovable.app',
    });
    return;
  }

  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: '🎯 Rhitmo — O que você quer fazer?' } },
    { type: 'divider' },
  ];

  if (persona.persona === 'leader') {
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: '*📋 Gestão de Time*' } },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: '✍️ Adicionar nota' }, action_id: 'open_add_note', style: 'primary' },
          { type: 'button', text: { type: 'plain_text', text: '👏 Enviar kudos' }, action_id: 'open_send_kudos' },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '\n*💬 Comandos rápidos:*\n• `/nota @membro texto` — Feedback privado\n• `/kudos @membro texto` — Reconhecimento público\n• `/rhitmo` — Este menu',
        },
      }
    );
  } else if (persona.persona === 'direct_report') {
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: '*👤 Seu Desenvolvimento*' } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Acesse seu painel completo no Rhitmo para ver feedbacks, PDI e reviews.',
        },
      },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: '🚀 Abrir Rhitmo' }, url: 'https://rhitmo.lovable.app', action_id: 'open_app' },
        ],
      }
    );
  } else if (persona.persona === 'hr_admin') {
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: '*📈 Analytics Organizacional*' } },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: '📊 Abrir Dashboard HR' }, url: 'https://rhitmo.lovable.app/hr', action_id: 'open_hr', style: 'primary' },
        ],
      }
    );
  }

  blocks.push(
    { type: 'divider' },
    { type: 'context', elements: [{ type: 'mrkdwn', text: '💡 *Dica:* Você também receberá notificações automáticas antes de 1:1s.' }] }
  );

  await slackApi('chat.postEphemeral', { channel: channelId, user: slackUserId, blocks });
}

// ── Command: /nota ────────────────────────────────────────
async function handleNotaCommand(params: URLSearchParams) {
  const slackUserId = params.get('user_id')!;
  const channelId = params.get('channel_id')!;
  const text = params.get('text') || '';
  console.log('[CMD /nota] user:', slackUserId, 'channel:', channelId, 'textLen:', text.length);

  const persona = await getUserPersona(slackUserId);

  if (persona.persona !== 'leader') {
    await slackApi('chat.postEphemeral', {
      channel: channelId,
      user: slackUserId,
      text: '❌ Este comando é exclusivo para líderes.',
    });
    return;
  }

  const parts = text.match(/[@]?(\S+)\s+(.+)/s);
  if (!parts) {
    await slackApi('chat.postEphemeral', {
      channel: channelId,
      user: slackUserId,
      text: '❌ Formato: `/nota @membro texto da nota`\nExemplo: `/nota João Reunião produtiva sobre projeto X`',
    });
    return;
  }

  const [, memberName, content] = parts;
  console.log('[CMD /nota] Looking for member:', memberName);

  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('workspace_id', persona.workspaceId!);

  if (!teams?.length) {
    await slackApi('chat.postEphemeral', { channel: channelId, user: slackUserId, text: '❌ Nenhum time encontrado.' });
    return;
  }

  const teamIds = teams.map(t => t.id);
  const { data: member } = await supabase
    .from('team_members')
    .select('id, name')
    .in('team_id', teamIds)
    .ilike('name', `%${memberName.replace('@', '')}%`)
    .limit(1)
    .maybeSingle();

  console.log('[CMD /nota] Member found:', member?.name || 'NOT FOUND');

  if (!member) {
    await slackApi('chat.postEphemeral', {
      channel: channelId,
      user: slackUserId,
      text: `❌ Membro "${memberName}" não encontrado no seu time.`,
    });
    return;
  }

  const { error: insertError } = await supabase
    .from('feedbacks')
    .insert({
      manager_id: persona.userId,
      member_id: member.id,
      content,
      type: 'neutral',
      source: 'slack',
      visibility: 'private_leader',
      occurred_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('[CMD /nota] Insert error:', insertError);
    await slackApi('chat.postEphemeral', { channel: channelId, user: slackUserId, text: '❌ Erro ao salvar nota.' });
    return;
  }

  await supabase.rpc('update_feedback_streak', {
    p_user_id: persona.userId,
    p_workspace_id: persona.workspaceId,
  });

  const { data: streak } = await supabase
    .from('feedback_streaks')
    .select('current_streak')
    .eq('user_id', persona.userId!)
    .eq('workspace_id', persona.workspaceId!)
    .maybeSingle();

  let streakText = '';
  if (streak && streak.current_streak >= 2) {
    streakText = `\n🔥 Sequência de ${streak.current_streak} semanas de feedback!`;
  }

  await slackApi('chat.postEphemeral', {
    channel: channelId,
    user: slackUserId,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `✅ Nota registrada para *${member.name}*${streakText}` },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `_"${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"_` }],
      },
    ],
  });
}

// ── Command: /kudos ───────────────────────────────────────
async function handleKudosCommand(params: URLSearchParams) {
  const slackUserId = params.get('user_id')!;
  const channelId = params.get('channel_id')!;
  const text = params.get('text') || '';
  const userName = params.get('user_name') || 'alguém';
  console.log('[CMD /kudos] user:', slackUserId, 'channel:', channelId, 'textLen:', text.length);

  const persona = await getUserPersona(slackUserId);

  if (persona.persona === 'unauthenticated') {
    await slackApi('chat.postEphemeral', { channel: channelId, user: slackUserId, text: '❌ Conecte sua conta Rhitmo primeiro.' });
    return;
  }

  const parts = text.match(/[@]?(\S+)\s+(.+)/s);
  if (!parts) {
    await slackApi('chat.postEphemeral', {
      channel: channelId,
      user: slackUserId,
      text: '❌ Formato: `/kudos @membro mensagem`\nExemplo: `/kudos Maria Excelente apresentação! 🎯`',
    });
    return;
  }

  const [, memberName, message] = parts;
  console.log('[CMD /kudos] Looking for member:', memberName);

  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('workspace_id', persona.workspaceId!);

  const teamIds = teams?.map(t => t.id) || [];
  const { data: member } = await supabase
    .from('team_members')
    .select('id, name')
    .in('team_id', teamIds)
    .ilike('name', `%${memberName.replace('@', '')}%`)
    .limit(1)
    .maybeSingle();

  console.log('[CMD /kudos] Member found:', member?.name || 'NOT FOUND');

  if (!member) {
    await slackApi('chat.postEphemeral', {
      channel: channelId,
      user: slackUserId,
      text: `❌ Membro "${memberName}" não encontrado.`,
    });
    return;
  }

  const result = await slackApi('chat.postMessage', {
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `👏 *Kudos para ${member.name}!*\n\n${message}\n\n_Enviado por @${userName}_` },
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: '💜 Powered by Rhitmo' }] },
    ],
  });

  await supabase.from('kudos').insert({
    workspace_id: persona.workspaceId,
    from_user_id: persona.userId,
    to_member_id: member.id,
    message,
    slack_channel_id: channelId,
    slack_message_ts: result.ts,
  });
}

// ── Main Handler ──────────────────────────────────────────
Deno.serve(async (req) => {
  const url = new URL(req.url);
  console.log(`[MAIN] ${req.method} ${url.pathname} | content-type: ${req.headers.get('content-type')} | has-sig: ${!!req.headers.get('x-slack-signature')} | has-ts: ${!!req.headers.get('x-slack-request-timestamp')}`);

  // Health check
  if (req.method === 'GET') {
    const health = {
      status: 'alive',
      hasToken: !!Deno.env.get('SLACK_BOT_TOKEN'),
      hasSigningSecret: !!Deno.env.get('SLACK_SIGNING_SECRET'),
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      timestamp: new Date().toISOString(),
    };
    console.log('[HEALTH]', JSON.stringify(health));
    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    console.log('[MAIN] Body length:', body.length);

    const isValid = await verifySlackSignature(req, body);
    if (!isValid) {
      console.error('[MAIN] REJECTED: Invalid Slack signature');
      return new Response('Unauthorized', { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = JSON.parse(body);
      console.log('[MAIN] JSON payload type:', json.type);
      if (json.type === 'url_verification') {
        return new Response(JSON.stringify({ challenge: json.challenge }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response('ok', { headers: corsHeaders });
    }

    const params = new URLSearchParams(body);
    const command = params.get('command');
    const userId = params.get('user_id');
    const channelId = params.get('channel_id');
    const textLen = (params.get('text') || '').length;
    console.log(`[MAIN] Command: ${command} | user: ${userId} | channel: ${channelId} | textLen: ${textLen}`);

    switch (command) {
      case '/rhitmo':
        try {
          await handleRhitmoCommand(params);
        } catch (e) {
          console.error('[ERROR /rhitmo]', e);
        }
        break;
      case '/nota':
        try {
          await handleNotaCommand(params);
        } catch (e) {
          console.error('[ERROR /nota]', e);
        }
        break;
      case '/kudos':
        try {
          await handleKudosCommand(params);
        } catch (e) {
          console.error('[ERROR /kudos]', e);
        }
        break;
      default:
        console.log('[MAIN] Unknown command:', command);
        return new Response(JSON.stringify({ response_type: 'ephemeral', text: `Comando desconhecido: ${command}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log('[MAIN] Command processed successfully, returning 200');
    return new Response('', { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('[MAIN] Unhandled error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
