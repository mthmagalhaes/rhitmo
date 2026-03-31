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
  // Clean expired cache entries
  const now = Date.now();
  for (const [k, v] of channelCache) {
    if (now - v.ts > CACHE_TTL) channelCache.delete(k);
  }

  const cached = channelCache.get(channelId);
  if (cached) return cached.isPublic;

  // Fallback heuristic based on channel ID prefix
  // D = DM, G = group DM / private channel
  if (channelId.startsWith('D')) {
    channelCache.set(channelId, { isPublic: false, ts: now });
    return false;
  }

  try {
    const token = Deno.env.get('SLACK_BOT_TOKEN');
    console.log('[CHANNEL] Checking channel:', channelId);
    const res = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    console.log('[CHANNEL] API response ok:', json.ok, 'error:', json.error || 'none');

    if (!json.ok) {
      // If API fails (e.g. channel_not_found for DMs), use prefix heuristic
      // C-prefix channels that we can't look up → assume public (safer for privacy)
      const assumePublic = channelId.startsWith('C');
      console.log('[CHANNEL] API failed, assuming public:', assumePublic);
      channelCache.set(channelId, { isPublic: assumePublic, ts: now });
      return assumePublic;
    }

    const isPublic = !json.channel.is_private && !json.channel.is_im && !json.channel.is_mpim;
    console.log('[CHANNEL] is_private:', json.channel.is_private, 'is_im:', json.channel.is_im, 'result isPublic:', isPublic);
    channelCache.set(channelId, { isPublic, ts: now });
    return isPublic;
  } catch (err) {
    console.error('[CHANNEL] Error checking channel:', err);
    // Fallback: C-prefix = assume public
    const assumePublic = channelId.startsWith('C');
    channelCache.set(channelId, { isPublic: assumePublic, ts: now });
    return assumePublic;
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

// ── Slack API Helper ──────────────────────────────────────
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

// ── Member Resolution ─────────────────────────────────────
// Resolves a Slack mention (<@U12345>) or plain text name to a team member
async function resolveMember(
  input: string,
  workspaceId: string
): Promise<{ id: string; name: string } | { error: string }> {
  console.log('[RESOLVE] Input:', input, '| workspace:', workspaceId);

  const { data: teams } = await supabase.from('teams').select('id').eq('workspace_id', workspaceId);
  if (!teams?.length) return { error: 'Nenhum time encontrado.' };
  const teamIds = teams.map(t => t.id);

  // Case 1: Slack mention format <@U12345> or <@U12345|display_name>
  const mentionMatch = input.match(/^<@(U[A-Z0-9]+)(?:\|[^>]*)?>/);
  if (mentionMatch) {
    const slackMentionUserId = mentionMatch[1];
    console.log('[RESOLVE] Slack mention detected, user ID:', slackMentionUserId);

    // Look up via slack_integrations → linked_user_id → team_members
    const { data: integration } = await supabase
      .from('slack_integrations')
      .select('user_id')
      .eq('slack_user_id', slackMentionUserId)
      .limit(1)
      .maybeSingle();

    if (integration) {
      const { data: member } = await supabase
        .from('team_members')
        .select('id, name')
        .eq('linked_user_id', integration.user_id)
        .in('team_id', teamIds)
        .limit(1)
        .maybeSingle();

      if (member) {
        console.log('[RESOLVE] Found via Slack integration:', member.name);
        return member;
      }
    }

    // Fallback: try to get Slack user's real name and fuzzy match
    try {
      const slackUser = await slackApi('users.info', { user: slackMentionUserId });
      if (slackUser.ok) {
        const realName = slackUser.user?.real_name || slackUser.user?.profile?.display_name || '';
        console.log('[RESOLVE] Slack user real name:', realName);
        if (realName) {
          const { data: member } = await supabase
            .from('team_members')
            .select('id, name')
            .in('team_id', teamIds)
            .ilike('name', `%${realName}%`)
            .limit(1)
            .maybeSingle();
          if (member) {
            console.log('[RESOLVE] Found via real name fallback:', member.name);
            return member;
          }
          // Try first + last name parts
          const nameParts = realName.split(' ');
          if (nameParts.length >= 2) {
            const { data: member2 } = await supabase
              .from('team_members')
              .select('id, name')
              .in('team_id', teamIds)
              .ilike('name', `%${nameParts[0]}%`)
              .ilike('name', `%${nameParts[nameParts.length - 1]}%`)
              .limit(1)
              .maybeSingle();
            if (member2) {
              console.log('[RESOLVE] Found via name parts:', member2.name);
              return member2;
            }
          }
        }
      }
    } catch (err) {
      console.error('[RESOLVE] Error fetching Slack user info:', err);
    }

    return { error: `Membro com Slack ID ${slackMentionUserId} não encontrado no seu time. Verifique se a pessoa já conectou a conta Rhitmo.` };
  }

  // Case 2: Plain text name (strip @ if present)
  const cleanName = input.replace(/^@/, '').trim();
  console.log('[RESOLVE] Plain text search:', cleanName);

  const { data: members } = await supabase
    .from('team_members')
    .select('id, name')
    .in('team_id', teamIds)
    .ilike('name', `%${cleanName}%`)
    .limit(5);

  if (!members?.length) {
    return { error: `Membro "${cleanName}" não encontrado. Dica: use @menção do Slack para maior precisão.` };
  }

  if (members.length === 1) {
    console.log('[RESOLVE] Single match:', members[0].name);
    return members[0];
  }

  // Multiple matches
  const names = members.map(m => `• ${m.name}`).join('\n');
  return { error: `Múltiplos membros encontrados:\n${names}\n\nSeja mais específico ou use @menção do Slack.` };
}

// ── Privacy Check ─────────────────────────────────────────
async function checkPrivacy(command: string, channelType: string, channelId: string, _responseUrl: string, originalParams: string): Promise<Record<string, unknown> | null> {
  // DM-only enforcement (hard block)
  if (DM_ONLY_COMMANDS.includes(command) && channelType !== 'im') {
    console.log('[PRIVACY] Hard block:', command, 'in channel type:', channelType);
    return {
      text: '❌ *Este comando só funciona em DM direto com @Rhitmo.*\n\nAbra uma conversa privada comigo e execute lá para manter suas informações seguras.',
    };
  }

  // Sensitive command in public channel (soft warning)
  if (SENSITIVE_COMMANDS.includes(command) && channelType !== 'im') {
    console.log('[PRIVACY] Checking if channel', channelId, 'is public (channelType:', channelType, ')');
    const pubCheck = await isPublicChannel(channelId);
    console.log('[PRIVACY] isPublicChannel result:', pubCheck);
    if (pubCheck) {
      console.log('[PRIVACY] Public channel warning for:', command);
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

  return null;
}

// ── Command Handlers ──────────────────────────────────────

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
  // Match: <@U12345|name> rest OR <@U12345> rest OR @name rest OR name rest
  const mentionMatch = text.match(/^(<@U[A-Z0-9]+(?:\|[^>]*)?>)\s+(.+)/s);
  const plainMatch = text.match(/^[@]?(\S+)\s+(.+)/s);

  let memberInput: string;
  let content: string;

  if (mentionMatch) {
    memberInput = mentionMatch[1];
    content = mentionMatch[2];
  } else if (plainMatch) {
    memberInput = plainMatch[1];
    content = plainMatch[2];
  } else {
    return { text: '❌ Formato: `/nota @membro texto da nota`\nExemplo: `/nota @João Reunião produtiva sobre projeto X`' };
  }

  const result = await resolveMember(memberInput, persona.workspaceId!);
  if ('error' in result) return { text: `❌ ${result.error}` };

  const { error: insertError } = await supabase.from('feedbacks').insert({
    manager_id: persona.userId,
    member_id: result.id,
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
      { type: 'section', text: { type: 'mrkdwn', text: `✅ Nota registrada para *${result.name}*${streakText}` } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `_"${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"_` }] },
    ],
  };
}

async function handleKudosCommand(payload: Record<string, string>, persona: PersonaResult): Promise<{ ephemeral: Record<string, unknown>; publicMsg?: { channel: string; blocks: unknown[] } }> {
  if (persona.persona === 'unauthenticated') {
    return { ephemeral: { text: '❌ Conecte sua conta Rhitmo primeiro.' } };
  }

  const text = payload.text || '';
  const mentionMatch = text.match(/^(<@U[A-Z0-9]+(?:\|[^>]*)?>)\s+(.+)/s);
  const plainMatch = text.match(/^[@]?(\S+)\s+(.+)/s);

  let memberInput: string;
  let message: string;

  if (mentionMatch) {
    memberInput = mentionMatch[1];
    message = mentionMatch[2];
  } else if (plainMatch) {
    memberInput = plainMatch[1];
    message = plainMatch[2];
  } else {
    return { ephemeral: { text: '❌ Formato: `/kudos @membro mensagem`\nExemplo: `/kudos @Maria Excelente apresentação! 🎯`' } };
  }

  const userName = payload.user_name || 'alguém';
  const channelId = payload.channel_id;

  const result = await resolveMember(memberInput, persona.workspaceId!);
  if ('error' in result) return { ephemeral: { text: `❌ ${result.error}` } };

  const publicBlocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `👏 *Kudos para ${result.name}!*\n\n${message}\n\n_Enviado por @${userName}_` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: '💜 Powered by Rhitmo' }] },
  ];

  return {
    ephemeral: { text: `✅ Kudos enviado para *${result.name}*!` },
    publicMsg: { channel: channelId, blocks: publicBlocks },
  };
}

// ── Modal Definitions ─────────────────────────────────────

function buildNoteModal(triggerId: string): Record<string, unknown> {
  return {
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'note_submission',
      title: { type: 'plain_text', text: '✍️ Nova Nota' },
      submit: { type: 'plain_text', text: 'Salvar' },
      close: { type: 'plain_text', text: 'Cancelar' },
      blocks: [
        {
          type: 'input',
          block_id: 'member_block',
          element: {
            type: 'users_select',
            action_id: 'member_select',
            placeholder: { type: 'plain_text', text: 'Selecione um membro' },
          },
          label: { type: 'plain_text', text: 'Para quem?' },
        },
        {
          type: 'input',
          block_id: 'note_block',
          element: {
            type: 'plain_text_input',
            action_id: 'note_text',
            multiline: true,
            placeholder: { type: 'plain_text', text: 'Escreva sua observação, feedback ou nota...' },
          },
          label: { type: 'plain_text', text: 'Feedback' },
        },
        {
          type: 'input',
          block_id: 'type_block',
          element: {
            type: 'static_select',
            action_id: 'note_type',
            initial_option: { text: { type: 'plain_text', text: '😊 Positivo' }, value: 'positive' },
            options: [
              { text: { type: 'plain_text', text: '😊 Positivo' }, value: 'positive' },
              { text: { type: 'plain_text', text: '🔧 Construtivo' }, value: 'constructive' },
              { text: { type: 'plain_text', text: '📝 Neutro' }, value: 'neutral' },
            ],
          },
          label: { type: 'plain_text', text: 'Tipo de feedback' },
        },
      ],
    },
  };
}

function buildKudosModal(triggerId: string): Record<string, unknown> {
  return {
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'kudos_submission',
      title: { type: 'plain_text', text: '👏 Enviar Kudos' },
      submit: { type: 'plain_text', text: 'Enviar' },
      close: { type: 'plain_text', text: 'Cancelar' },
      blocks: [
        {
          type: 'input',
          block_id: 'member_block',
          element: {
            type: 'users_select',
            action_id: 'member_select',
            placeholder: { type: 'plain_text', text: 'Selecione a pessoa' },
          },
          label: { type: 'plain_text', text: 'Para quem?' },
        },
        {
          type: 'input',
          block_id: 'message_block',
          element: {
            type: 'plain_text_input',
            action_id: 'kudos_text',
            multiline: true,
            placeholder: { type: 'plain_text', text: 'Escreva o reconhecimento...' },
          },
          label: { type: 'plain_text', text: 'Mensagem' },
        },
      ],
    },
  };
}

// ── Async Command Processor ──────────────────────────────
async function processCommand(body: string, timestamp: string, signature: string, params: URLSearchParams) {
  const command = params.get('command');
  const slackUserId = params.get('user_id')!;
  const responseUrl = params.get('response_url')!;
  const channelType = params.get('channel_type') || '';
  const channelId = params.get('channel_id') || '';
  console.log('[PROCESS] command:', command, '| user:', slackUserId, '| channelType:', channelType, '| channelId:', channelId);

  const isValid = await verifySlackSignature(body, timestamp, signature);
  if (!isValid) { console.error('[PROCESS] Invalid signature — aborting'); return; }

  // Privacy check before persona lookup
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
        // Use resolved member for kudos insert
        const text = params.get('text') || '';
        const mentionMatch2 = text.match(/^(<@U[A-Z0-9]+(?:\|[^>]*)?>)\s+(.+)/s);
        const plainMatch2 = text.match(/^[@]?(\S+)\s+(.+)/s);
        const memberInput = mentionMatch2 ? mentionMatch2[1] : (plainMatch2 ? plainMatch2[1] : '');
        const resolvedMember = await resolveMember(memberInput, persona.workspaceId!);
        if (!('error' in resolvedMember)) {
          await supabase.from('kudos').insert({
            workspace_id: persona.workspaceId,
            from_user_id: persona.userId,
            to_member_id: resolvedMember.id,
            message: mentionMatch2 ? mentionMatch2[2] : (plainMatch2 ? plainMatch2[2] : text),
            slack_channel_id: result.publicMsg.channel,
            slack_message_ts: apiResult.ts,
          });
        }
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
  const interactionType = payload.type;
  console.log('[INTERACT] Type:', interactionType);

  // ── Handle block_actions (button clicks) ──
  if (interactionType === 'block_actions') {
    const action = payload.actions?.[0];
    const responseUrl = payload.response_url;
    const triggerId = payload.trigger_id;
    const slackUserId = payload.user?.id;

    if (!action) { console.error('[INTERACT] No action found'); return; }
    console.log('[INTERACT] action_id:', action.action_id, '| trigger_id:', triggerId);

    switch (action.action_id) {
      case 'open_add_note': {
        console.log('[INTERACT] Opening note modal');
        const result = await slackApi('views.open', buildNoteModal(triggerId));
        if (!result.ok) console.error('[INTERACT] Failed to open note modal:', result.error);
        break;
      }
      case 'open_send_kudos': {
        console.log('[INTERACT] Opening kudos modal');
        const result = await slackApi('views.open', buildKudosModal(triggerId));
        if (!result.ok) console.error('[INTERACT] Failed to open kudos modal:', result.error);
        break;
      }
      case 'privacy_continue': {
        const encodedParams = action.value;
        const originalBody = atob(encodedParams.replace(/-/g, '+').replace(/_/g, '/'));
        const originalParams = new URLSearchParams(originalBody);

        // Delete the warning message
        if (responseUrl) {
          await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delete_original: true }),
          });
        }

        // Re-process command skipping privacy check
        const command = originalParams.get('command');
        const origSlackUserId = originalParams.get('user_id')!;
        const origResponseUrl = originalParams.get('response_url')!;

        const persona = await getUserPersona(origSlackUserId);

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
        break;
      }
      case 'privacy_cancel': {
        if (responseUrl) {
          await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delete_original: true }),
          });
          await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              response_type: 'ephemeral',
              text: '✅ Comando cancelado. Execute novamente em DM ou canal privado para maior segurança.',
            }),
          });
        }
        break;
      }
      case 'connect_account':
      case 'open_app':
      case 'open_hr':
        // These are URL buttons — Slack handles them, nothing to do server-side
        console.log('[INTERACT] URL button clicked:', action.action_id);
        break;
      default:
        console.log('[INTERACT] Unhandled action:', action.action_id);
    }
  }

  // ── Handle view_submission (modal submit) ──
  else if (interactionType === 'view_submission') {
    const callbackId = payload.view?.callback_id;
    const slackUserId = payload.user?.id;
    const values = payload.view?.state?.values || {};
    console.log('[INTERACT] view_submission callback:', callbackId, '| user:', slackUserId);

    const persona = await getUserPersona(slackUserId);
    if (persona.persona === 'unauthenticated') {
      console.log('[INTERACT] Unauthenticated user submitted modal');
      // Return error to Slack
      return; // Slack will show a generic error
    }

    if (callbackId === 'note_submission') {
      const selectedUserId = values.member_block?.member_select?.selected_user;
      const noteText = values.note_block?.note_text?.value;
      const noteType = values.type_block?.note_type?.selected_option?.value || 'neutral';

      console.log('[INTERACT] Note submission: user:', selectedUserId, 'type:', noteType, 'text length:', noteText?.length);

      if (!selectedUserId || !noteText) {
        console.error('[INTERACT] Missing required fields');
        return;
      }

      // Resolve the Slack user to a team member
      const result = await resolveMember(`<@${selectedUserId}>`, persona.workspaceId!);
      if ('error' in result) {
        console.error('[INTERACT] Could not resolve member:', result.error);
        // Post error as DM to the user
        await slackApi('chat.postMessage', {
          channel: slackUserId,
          text: `❌ ${result.error}`,
        });
        return;
      }

      const { error: insertError } = await supabase.from('feedbacks').insert({
        manager_id: persona.userId,
        member_id: result.id,
        content: noteText,
        type: noteType,
        source: 'slack',
        visibility: 'private_leader',
        occurred_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('[INTERACT] Insert error:', insertError);
        await slackApi('chat.postMessage', {
          channel: slackUserId,
          text: '❌ Erro ao salvar nota. Tente novamente.',
        });
        return;
      }

      await supabase.rpc('update_feedback_streak', { p_user_id: persona.userId, p_workspace_id: persona.workspaceId });

      // Confirm via DM
      await slackApi('chat.postMessage', {
        channel: slackUserId,
        text: `✅ Nota registrada para *${result.name}*!\n_"${noteText.substring(0, 100)}${noteText.length > 100 ? '...' : ''}"_`,
      });
    }

    else if (callbackId === 'kudos_submission') {
      const selectedUserId = values.member_block?.member_select?.selected_user;
      const kudosText = values.message_block?.kudos_text?.value;

      console.log('[INTERACT] Kudos submission: user:', selectedUserId, 'text length:', kudosText?.length);

      if (!selectedUserId || !kudosText) {
        console.error('[INTERACT] Missing required fields');
        return;
      }

      const result = await resolveMember(`<@${selectedUserId}>`, persona.workspaceId!);
      if ('error' in result) {
        await slackApi('chat.postMessage', {
          channel: slackUserId,
          text: `❌ ${result.error}`,
        });
        return;
      }

      // Get Slack user info for display name
      const slackUserInfo = await slackApi('users.info', { user: slackUserId });
      const senderName = slackUserInfo.ok ? (slackUserInfo.user?.real_name || slackUserInfo.user?.name || 'alguém') : 'alguém';

      // Post public message (to the user's DM channel for now, or a default channel)
      const publicBlocks = [
        { type: 'section', text: { type: 'mrkdwn', text: `👏 *Kudos para ${result.name}!*\n\n${kudosText}\n\n_Enviado por ${senderName}_` } },
        { type: 'context', elements: [{ type: 'mrkdwn', text: '💜 Powered by Rhitmo' }] },
      ];

      // Save to kudos table
      await supabase.from('kudos').insert({
        workspace_id: persona.workspaceId,
        from_user_id: persona.userId,
        to_member_id: result.id,
        message: kudosText,
      });

      // Confirm via DM
      await slackApi('chat.postMessage', {
        channel: slackUserId,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `✅ Kudos enviado para *${result.name}*!` } },
          ...publicBlocks,
        ],
      });
    }
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
    console.log(`[MAIN] ${req.method} | body length: ${body.length} | has signature: ${!!req.headers.get('x-slack-signature')}`);

    // Handle retries
    const retryNum = req.headers.get('X-Slack-Retry-Num');
    if (retryNum) {
      console.log('[MAIN] Retry #' + retryNum + ' — ignoring');
      return new Response('', { status: 200, headers: corsHeaders });
    }

    const contentType = req.headers.get('content-type') || '';
    const timestamp = req.headers.get('x-slack-request-timestamp') || '';
    const slackSignature = req.headers.get('x-slack-signature') || '';

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

    // Form-urlencoded payloads (slash commands + interactive components)
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(body);

      if (params.has('payload')) {
        // Interactive component (button click or modal submission)
        const payloadStr = params.get('payload')!;
        const parsed = JSON.parse(payloadStr);
        console.log('[MAIN] Interactive component:', parsed.type, '| action:', parsed.actions?.[0]?.action_id || parsed.view?.callback_id || 'unknown');

        // For view_submission, Slack expects a response to close the modal
        if (parsed.type === 'view_submission') {
          // Fire async processing
          processInteraction(body, timestamp, slackSignature).catch(err => {
            console.error('[INTERACT] Unhandled error:', err);
          });
          // Return empty 200 to close the modal
          return new Response('', { status: 200, headers: corsHeaders });
        }

        // For block_actions, return 200 immediately
        processInteraction(body, timestamp, slackSignature).catch(err => {
          console.error('[INTERACT] Unhandled error:', err);
        });
        return new Response('', { status: 200, headers: corsHeaders });
      }

      // Slash command
      console.log('[MAIN] Slash command:', params.get('command'));
      processCommand(body, timestamp, slackSignature, params).catch(err => {
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
