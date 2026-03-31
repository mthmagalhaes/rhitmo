import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ── Privacy Constants ────────────────────────────────────
const SENSITIVE_COMMANDS = ['/nota', '/brief', '/review', '/meu-pdi'];
const DM_ONLY_COMMANDS = ['/review'];

// ── Channel Type Cache (5min TTL) ────────────────────────
const channelCache = new Map<string, { isPublic: boolean; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function isPublicChannel(channelId: string): Promise<boolean> {
  const cached = channelCache.get(channelId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.isPublic;

  try {
    const token = Deno.env.get('SLACK_BOT_TOKEN');
    const res = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.ok) {
      console.log('[CHANNEL] conversations.info error:', json.error);
      return false; // assume private on error (safer)
    }
    const isPublic = !json.channel.is_private && !json.channel.is_im && !json.channel.is_mpim;
    channelCache.set(channelId, { isPublic, ts: Date.now() });
    return isPublic;
  } catch (err) {
    console.error('[CHANNEL] Error checking channel:', err);
    return false;
  }
}

// ── Slack Signature Verification ──────────────────────────
async function verifySlackSignature(body: string, timestamp: string, slackSignature: string): Promise<boolean> {
  const signingSecret = Deno.env.get('SLACK_SIGNING_SECRET');
  if (!signingSecret) { console.log('[VERIFY] No signing secret'); return false; }

  const delta = Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp));
  if (delta > 300) { console.log('[VERIFY] Timestamp too old:', delta); return false; }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(signingSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sigBasestring));
  const hexDigest = 'v0=' + Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

  const match = hexDigest === slackSignature;
  console.log('[VERIFY]', match ? 'VALID' : 'INVALID');
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
  const { data: integration } = await supabase
    .from('slack_integrations')
    .select('user_id, workspace_id')
    .eq('slack_user_id', slackUserId)
    .limit(1)
    .maybeSingle();

  if (!integration) return { persona: 'unauthenticated' };

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id, hr_admin_ids')
    .eq('id', integration.workspace_id)
    .single();

  if (workspace?.owner_id === integration.user_id)
    return { persona: 'leader', userId: integration.user_id, workspaceId: integration.workspace_id };

  if (workspace?.hr_admin_ids?.includes(integration.user_id))
    return { persona: 'hr_admin', userId: integration.user_id, workspaceId: integration.workspace_id };

  const { data: member } = await supabase
    .from('team_members')
    .select('id')
    .eq('linked_user_id', integration.user_id)
    .limit(1)
    .maybeSingle();

  if (member)
    return { persona: 'direct_report', userId: integration.user_id, workspaceId: integration.workspace_id, memberId: member.id };

  return { persona: 'leader', userId: integration.user_id, workspaceId: integration.workspace_id };
}

// ── Slack API Helper (for public messages only) ───────────
async function slackApi(method: string, body: Record<string, unknown>) {
  const token = Deno.env.get('SLACK_BOT_TOKEN');
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log('[SLACK_API]', method, '| ok:', json.ok, '| error:', json.error || 'none');
  return json;
}

// ── Send Delayed Response via response_url ────────────────
async function sendDelayedResponse(responseUrl: string, message: Record<string, unknown>, responseType = 'ephemeral') {
  const res = await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response_type: responseType, ...message }),
  });
  console.log('[DELAYED] Status:', res.status);
}

// ── HMAC State Token Generator ────────────────────────────
async function generateStateToken(slackUserId: string, slackTeamId: string): Promise<string> {
  const secret = Deno.env.get('SLACK_SIGNING_SECRET')!;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${slackUserId}:${slackTeamId}:${timestamp}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const hexSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  const b64Payload = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64Sig = btoa(hexSig).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64Payload}.${b64Sig}`;
}

// ── Privacy Check: Returns message if blocked, null if OK ─
async function checkPrivacy(command: string, channelType: string, channelId: string, responseUrl: string, originalParams: string): Promise<Record<string, unknown> | null> {
  // DM-only enforcement (hard block)
  if (DM_ONLY_COMMANDS.includes(command) && channelType !== 'im') {
    console.log('[PRIVACY] Hard block:', command, 'in channel type:', channelType);
    return {
      text: '❌ *Este comando só funciona em DM direto com @Rhitmo.*\n\nAbra uma conversa privada comigo e execute lá para manter suas informações seguras.',
    };
  }

  // Sensitive command in public channel (soft warning)
  if (SENSITIVE_COMMANDS.includes(command) && channelType !== 'im') {
    const pubCheck = await isPublicChannel(channelId);
    if (pubCheck) {
      console.log('[PRIVACY] Public channel warning for:', command);
      // Encode original params in action value for replay
      const encodedParams = btoa(originalParams).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return {
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '⚠️ *Atenção: Canal Público Detectado*' } },
          { type: 'section', text: { type: 'mrkdwn', text: `Você está executando \`${command}\` em um canal público. Recomendamos usar em:\n• DM direto com @Rhitmo\n• Canais privados do seu time\n\nDeseja continuar mesmo assim?` } },
          { type: 'actions', block_id: 'privacy_check', elements: [
            { type: 'button', text: { type: 'plain_text', text: '✅ Continuar' }, action_id: 'privacy_continue', value: encodedParams, style: 'primary' },
            { type: 'button', text: { type: 'plain_text', text: '❌ Cancelar' }, action_id: 'privacy_cancel', value: 'cancel', style: 'danger' },
          ]},
        ],
      };
    }
  }

  return null; // No privacy issue
}

// ── Command Handlers (return message objects) ─────────────

function buildRhitmoMenu(persona: PersonaResult, stateToken?: string): Record<string, unknown> {
  if (persona.persona === 'unauthenticated') {
    const connectUrl = stateToken
      ? `https://rhitmo.lovable.app/slack/connect?state=${encodeURIComponent(stateToken)}`
      : 'https://rhitmo.lovable.app';
    return {
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: '🔗 *Conecte sua conta Rhitmo* para usar os comandos do Slack.' } },
        { type: 'actions', elements: [
          { type: 'button', text: { type: 'plain_text', text: '🔗 Conectar Conta' }, url: connectUrl, action_id: 'connect_account', style: 'primary' },
        ]},
        { type: 'context', elements: [{ type: 'mrkdwn', text: 'Você será redirecionado para o Rhitmo para vincular sua conta.' }] },
      ],
    };
  }

  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: '🎯 Rhitmo — O que você quer fazer?' } },
    { type: 'divider' },
  ];

  if (persona.persona === 'leader') {
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: '*📋 Gestão de Time*' } },
      { type: 'actions', elements: [
        { type: 'button', text: { type: 'plain_text', text: '✍️ Adicionar nota' }, action_id: 'open_add_note', style: 'primary' },
        { type: 'button', text: { type: 'plain_text', text: '👏 Enviar kudos' }, action_id: 'open_send_kudos' },
      ]},
      { type: 'section', text: { type: 'mrkdwn', text: '\n*💬 Comandos rápidos:*\n• `/nota @membro texto` — Feedback privado\n• `/kudos @membro texto` — Reconhecimento público\n• `/rhitmo` — Este menu' }},
    );
  } else if (persona.persona === 'direct_report') {
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: '*👤 Seu Desenvolvimento*' } },
      { type: 'section', text: { type: 'mrkdwn', text: 'Acesse seu painel completo no Rhitmo para ver feedbacks, PDI e reviews.' }},
      { type: 'actions', elements: [
        { type: 'button', text: { type: 'plain_text', text: '🚀 Abrir Rhitmo' }, url: 'https://rhitmo.lovable.app', action_id: 'open_app' },
      ]},
    );
  } else if (persona.persona === 'hr_admin') {
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: '*📈 Analytics Organizacional*' } },
      { type: 'actions', elements: [
        { type: 'button', text: { type: 'plain_text', text: '📊 Abrir Dashboard HR' }, url: 'https://rhitmo.lovable.app/hr', action_id: 'open_hr', style: 'primary' },
      ]},
    );
  }

  blocks.push(
    { type: 'divider' },
    { type: 'context', elements: [{ type: 'mrkdwn', text: '💡 *Dica:* Você também receberá notificações automáticas antes de 1:1s.' }] }
  );

  return { blocks };
}

async function handleNotaCommand(payload: Record<string, string>, persona: PersonaResult): Promise<Record<string, unknown>> {
  if (persona.persona !== 'leader') {
    return { text: '❌ Este comando é exclusivo para líderes.' };
  }

  const text = payload.text || '';
  const parts = text.match(/[@]?(\S+)\s+(.+)/s);
  if (!parts) {
    return { text: '❌ Formato: `/nota @membro texto da nota`\nExemplo: `/nota João Reunião produtiva sobre projeto X`' };
  }

  const [, memberName, content] = parts;

  const { data: teams } = await supabase.from('teams').select('id').eq('workspace_id', persona.workspaceId!);
  if (!teams?.length) return { text: '❌ Nenhum time encontrado.' };

  const teamIds = teams.map(t => t.id);
  const { data: member } = await supabase
    .from('team_members')
    .select('id, name')
    .in('team_id', teamIds)
    .ilike('name', `%${memberName.replace('@', '')}%`)
    .limit(1)
    .maybeSingle();

  if (!member) return { text: `❌ Membro "${memberName}" não encontrado no seu time.` };

  const { error: insertError } = await supabase.from('feedbacks').insert({
    manager_id: persona.userId,
    member_id: member.id,
    content,
    type: 'neutral',
    source: 'slack',
    visibility: 'private_leader',
    occurred_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('[NOTA] Insert error:', insertError);
    return { text: '❌ Erro ao salvar nota.' };
  }

  await supabase.rpc('update_feedback_streak', { p_user_id: persona.userId, p_workspace_id: persona.workspaceId });

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

  return {
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `✅ Nota registrada para *${member.name}*${streakText}` } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `_"${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"_` }] },
    ],
  };
}

async function handleKudosCommand(payload: Record<string, string>, persona: PersonaResult): Promise<{ ephemeral: Record<string, unknown>; publicMsg?: { channel: string; blocks: unknown[] } }> {
  if (persona.persona === 'unauthenticated') {
    return { ephemeral: { text: '❌ Conecte sua conta Rhitmo primeiro.' } };
  }

  const text = payload.text || '';
  const parts = text.match(/[@]?(\S+)\s+(.+)/s);
  if (!parts) {
    return { ephemeral: { text: '❌ Formato: `/kudos @membro mensagem`\nExemplo: `/kudos Maria Excelente apresentação! 🎯`' } };
  }

  const [, memberName, message] = parts;
  const userName = payload.user_name || 'alguém';
  const channelId = payload.channel_id;

  const { data: teams } = await supabase.from('teams').select('id').eq('workspace_id', persona.workspaceId!);
  const teamIds = teams?.map(t => t.id) || [];
  const { data: member } = await supabase
    .from('team_members')
    .select('id, name')
    .in('team_id', teamIds)
    .ilike('name', `%${memberName.replace('@', '')}%`)
    .limit(1)
    .maybeSingle();

  if (!member) return { ephemeral: { text: `❌ Membro "${memberName}" não encontrado.` } };

  const publicBlocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `👏 *Kudos para ${member.name}!*\n\n${message}\n\n_Enviado por @${userName}_` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: '💜 Powered by Rhitmo' }] },
  ];

  return {
    ephemeral: { text: `✅ Kudos enviado para *${member.name}*!` },
    publicMsg: { channel: channelId, blocks: publicBlocks },
  };
}

// ── Async Command Processor ──────────────────────────────
async function processCommand(body: string, timestamp: string, signature: string, params: URLSearchParams) {
  const command = params.get('command');
  const slackUserId = params.get('user_id')!;
  const responseUrl = params.get('response_url')!;
  const channelType = params.get('channel_type') || '';
  const channelId = params.get('channel_id') || '';
  console.log('[PROCESS] command:', command, '| user:', slackUserId, '| channelType:', channelType);

  const isValid = await verifySlackSignature(body, timestamp, signature);
  if (!isValid) { console.error('[PROCESS] Invalid signature — aborting'); return; }

  // Privacy check before persona lookup (saves time if blocked)
  if (command && (SENSITIVE_COMMANDS.includes(command) || DM_ONLY_COMMANDS.includes(command))) {
    const privacyMsg = await checkPrivacy(command, channelType, channelId, responseUrl, body);
    if (privacyMsg) {
      await sendDelayedResponse(responseUrl, privacyMsg);
      return;
    }
  }

  const persona = await getUserPersona(slackUserId);
  console.log('[PROCESS] persona:', persona.persona);

  switch (command) {
    case '/rhitmo': {
      let stateToken: string | undefined;
      if (persona.persona === 'unauthenticated') {
        stateToken = await generateStateToken(slackUserId, params.get('team_id') || '');
      }
      const msg = buildRhitmoMenu(persona, stateToken);
      await sendDelayedResponse(responseUrl, msg);
      break;
    }
    case '/nota': {
      const payload: Record<string, string> = {};
      for (const [k, v] of params.entries()) payload[k] = v;
      const msg = await handleNotaCommand(payload, persona);
      await sendDelayedResponse(responseUrl, msg);
      break;
    }
    case '/kudos': {
      const payload: Record<string, string> = {};
      for (const [k, v] of params.entries()) payload[k] = v;
      const result = await handleKudosCommand(payload, persona);
      if (result.publicMsg) {
        const apiResult = await slackApi('chat.postMessage', { channel: result.publicMsg.channel, blocks: result.publicMsg.blocks });
        await supabase.from('kudos').insert({
          workspace_id: persona.workspaceId,
          from_user_id: persona.userId,
          to_member_id: params.get('text')!.match(/[@]?(\S+)/)?.[1] || '',
          message: params.get('text')!.replace(/[@]?\S+\s+/, ''),
          slack_channel_id: result.publicMsg.channel,
          slack_message_ts: apiResult.ts,
        });
      }
      await sendDelayedResponse(responseUrl, result.ephemeral);
      break;
    }
    default:
      await sendDelayedResponse(responseUrl, { text: `❌ Comando desconhecido: ${command}` });
  }
  console.log('[PROCESS] Done:', command);
}

// ── Interactive Component Handler ─────────────────────────
async function processInteraction(body: string, timestamp: string, signature: string) {
  const isValid = await verifySlackSignature(body, timestamp, signature);
  if (!isValid) { console.error('[INTERACT] Invalid signature'); return; }

  const params = new URLSearchParams(body);
  const payloadStr = params.get('payload');
  if (!payloadStr) { console.error('[INTERACT] No payload'); return; }

  const payload = JSON.parse(payloadStr);
  const action = payload.actions?.[0];
  const responseUrl = payload.response_url;

  if (!action || !responseUrl) { console.error('[INTERACT] Missing action or response_url'); return; }

  console.log('[INTERACT] action_id:', action.action_id, '| value:', action.value?.substring(0, 20));

  if (action.action_id === 'privacy_continue') {
    // Decode original command params and re-execute
    const encodedParams = action.value;
    const originalBody = atob(encodedParams.replace(/-/g, '+').replace(/_/g, '/'));
    const originalParams = new URLSearchParams(originalBody);

    // Delete the warning message
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delete_original: true }),
    });

    // Re-process command skipping privacy check
    const command = originalParams.get('command');
    const slackUserId = originalParams.get('user_id')!;
    const origResponseUrl = originalParams.get('response_url')!;

    const persona = await getUserPersona(slackUserId);

    switch (command) {
      case '/nota': {
        const p: Record<string, string> = {};
        for (const [k, v] of originalParams.entries()) p[k] = v;
        const msg = await handleNotaCommand(p, persona);
        await sendDelayedResponse(origResponseUrl, msg);
        break;
      }
      case '/brief':
      case '/meu-pdi':
        await sendDelayedResponse(origResponseUrl, { text: `✅ Processando \`${command}\`...` });
        break;
      default:
        await sendDelayedResponse(origResponseUrl, { text: `Comando ${command} processado.` });
    }
  } else if (action.action_id === 'privacy_cancel') {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delete_original: true,
      }),
    });
    // Send cancellation as new ephemeral
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: '✅ Comando cancelado. Execute novamente em DM ou canal privado para maior segurança.',
      }),
    });
  }

  console.log('[INTERACT] Done');
}

// ── Main Handler ──────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'alive',
        hasToken: !!Deno.env.get('SLACK_BOT_TOKEN'),
        hasSigningSecret: !!Deno.env.get('SLACK_SIGNING_SECRET'),
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.text();
    console.log(`[MAIN] ${req.method} | body:${body.length} | sig:${!!req.headers.get('x-slack-signature')}`);

    // Handle retries
    const retryNum = req.headers.get('X-Slack-Retry-Num');
    if (retryNum) {
      console.log('[MAIN] Retry #' + retryNum + ' — ignoring');
      return new Response('', { status: 200, headers: corsHeaders });
    }

    const contentType = req.headers.get('content-type') || '';

    // JSON payloads (url_verification)
    if (contentType.includes('application/json')) {
      const json = JSON.parse(body);
      if (json.type === 'url_verification') {
        return new Response(JSON.stringify({ challenge: json.challenge }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response('ok', { headers: corsHeaders });
    }

    // Check if this is an interactive component payload
    const timestamp = req.headers.get('x-slack-request-timestamp') || '';
    const signature = req.headers.get('x-slack-signature') || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(body);
      
      if (params.has('payload')) {
        // Interactive component (button click)
        console.log('[MAIN] Interactive component detected');
        processInteraction(body, timestamp, signature).catch(err => {
          console.error('[INTERACT] Unhandled error:', err);
        });
        return new Response('', { status: 200, headers: corsHeaders });
      }

      // Slash command
      console.log('[MAIN] Firing async for:', params.get('command'));
      processCommand(body, timestamp, signature, params).catch(err => {
        console.error('[PROCESS] Unhandled error:', err);
      });
      return new Response('', { status: 200, headers: corsHeaders });
    }

    return new Response('', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('[MAIN] Error:', error);
    return new Response('', { status: 200, headers: corsHeaders });
  }
});
