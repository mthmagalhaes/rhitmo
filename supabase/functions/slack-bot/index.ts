import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ── Markdown → Slack mrkdwn converter ──────────────────────
// Slack's mrkdwn is NOT standard markdown:
// - No headings → degrade to bold
// - Single `*bold*` (not `**bold**`)
// - Single `_italic_` (not `__italic__`)
// - Bullets render better as `•` than `-`
function markdownToSlackMrkdwn(text: string): string {
  if (!text) return '';
  let out = text;
  // H1-H6 → bold + line break
  out = out.replace(/^#{1,6}\s+(.+)$/gm, '*$1*');
  // Bold: **text** or __text__ → *text*
  out = out.replace(/\*\*(.+?)\*\*/g, '*$1*');
  out = out.replace(/__(.+?)__/g, '*$1*');
  // Italic: keep single _text_ as-is. Convert *text* (single asterisk italic in CommonMark) — skip; risky.
  // Bullets: leading "- " or "* " → "• "
  out = out.replace(/^(\s*)[-*]\s+/gm, '$1• ');
  // Horizontal rules → blank line
  out = out.replace(/^---+$/gm, '');
  // Strip [doc:UUID] citations (don't render in Slack)
  out = out.replace(/\[doc:[a-f0-9-]+\]/gi, '');
  // Collapse 3+ blank lines
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

function smartTruncate(text: string, max = 2900): string {
  if (text.length <= max) return text;
  const slice = text.substring(0, max);
  const lastBreak = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'));
  return (lastBreak > max * 0.6 ? slice.substring(0, lastBreak) : slice) + '\n\n_…resposta truncada. Continue no Rhitmo._';
}


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ── Privacy Constants ────────────────────────────────────
const SENSITIVE_COMMANDS = ['/nota', '/brief', '/meu-pdi', '/mentor', '/meu-rhitmo'];
const DM_ONLY_COMMANDS: string[] = [];

// ── Conversational State Machine (Sprint 11.1) ───────────
// Looks up the active slack_conversations row for a given Slack user (or null).
// Returns null on any error to guarantee zero regression on the existing DM flow.
type SlackConversationRow = {
  id: string;
  workspace_id: string;
  slack_user_id: string;
  status: 'active' | 'completed' | 'expired';
  intent: string;
  state_data: Record<string, unknown>;
  last_message_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

async function getActiveConversation(slackUserId: string): Promise<SlackConversationRow | null> {
  try {
    const { data, error } = await supabase.rpc('get_active_slack_conversation', {
      p_slack_user_id: slackUserId,
    });
    if (error) {
      console.warn('[CONV] get_active_slack_conversation error:', error.message);
      return null;
    }
    // RPC returns a row composite or null. Some Postgrest versions return {} for empty composites.
    if (!data || (typeof data === 'object' && !(data as Record<string, unknown>).id)) {
      return null;
    }
    return data as SlackConversationRow;
  } catch (err) {
    console.warn('[CONV] getActiveConversation threw:', err);
    return null;
  }
}

async function appendConversationTurn(
  conversationId: string,
  turn: { role: 'user' | 'assistant' | 'system'; text: string; ts?: string },
): Promise<void> {
  try {
    const { error } = await supabase.rpc('append_slack_conversation_turn', {
      p_conversation_id: conversationId,
      p_turn: turn,
      p_ttl_minutes: 30,
    });
    if (error) {
      console.warn('[CONV] append_slack_conversation_turn error:', error.message);
    }
  } catch (err) {
    console.warn('[CONV] appendConversationTurn threw:', err);
  }
}

// ── Conversational LLM (Sprint 11.2) ─────────────────────
// System prompts per intent. Default = general_chat.
function buildSystemPromptForIntent(intent: string): string {
  switch (intent) {
    case 'pulse_survey':
      return 'Você é a Rhitmo conduzindo um Pulse Survey. Faça uma pergunta por vez, em português do Brasil, com tom acolhedor e breve. Use formatação Slack (*negrito*).';
    case '1v1_prep':
      return 'Você é a Rhitmo ajudando a preparar uma 1:1. Seja extremamente conciso, ofereça 2–3 tópicos práticos, em português do Brasil, formatação Slack (*negrito*, listas com •).';
    case 'self_review':
      return 'Você é a Rhitmo guiando uma autoavaliação. Faça perguntas reflexivas, uma por vez, em português do Brasil, formatação Slack (*negrito*).';
    case 'general_chat':
    default:
      return 'Você é a inteligência artificial da Rhitmo, atuando como um mentor de liderança. Seja extremamente conciso, amigável e direto ao ponto. Responda usando formatação nativa do Slack (*negrito*, _itálico_, listas com •). Responda sempre em português do Brasil. Não invente dados sobre o time se não estiverem no histórico desta conversa.';
  }
}

// Calls Lovable AI Gateway. Always returns a string — never throws.
async function callLovableAI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.error('[AI] LOVABLE_API_KEY missing');
    return '⚠️ A IA da Rhitmo não está configurada no momento.';
  }
  try {
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.6,
      }),
    });
    if (resp.status === 429) {
      console.warn('[AI] Rate limited (429)');
      return '⏳ A Rhitmo está sobrecarregada agora. Tente em instantes.';
    }
    if (resp.status === 402) {
      console.warn('[AI] No credits (402)');
      return '⚠️ Créditos de IA da workspace esgotados. Avise quem administra a Rhitmo.';
    }
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      console.error('[AI] Gateway error', resp.status, t.slice(0, 300));
      return '⚠️ Tive um problema para pensar agora. Pode tentar de novo?';
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim().length > 0) return content.trim();
    return '⚠️ Não consegui formular uma resposta agora.';
  } catch (err) {
    console.error('[AI] callLovableAI threw:', err);
    return '⚠️ Tive um problema para pensar agora. Pode tentar de novo?';
  }
}

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

// ── Helper: Welcome Throttle ──────────────────────────────
// Prevents flooding the user's DM when they re-open the app/Messages tab.
// - Authenticated users: max 1 welcome per 24h
// - Unauthenticated users: max 1 welcome per 7 days (avoid pestering)
async function shouldSendWelcome(
  slackUserId: string,
  slackTeamId: string,
  isAuthenticated: boolean,
  surface: 'app_home' | 'dm',
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('slack_app_home_throttle')
      .select('last_welcome_sent_at, last_dm_menu_sent_at')
      .eq('slack_user_id', slackUserId)
      .maybeSingle();

    const now = Date.now();
    const windowMs = isAuthenticated ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    if (data) {
      const last = surface === 'app_home'
        ? data.last_welcome_sent_at
        : (data.last_dm_menu_sent_at || data.last_welcome_sent_at);
      if (last && now - new Date(last).getTime() < windowMs) {
        console.log(`[THROTTLE] Skipping ${surface} welcome for ${slackUserId} (last sent ${last})`);
        return false;
      }
    }

    // Update timestamp (upsert)
    const updates: Record<string, string> = { slack_user_id: slackUserId, slack_team_id: slackTeamId };
    if (surface === 'app_home') updates.last_welcome_sent_at = new Date().toISOString();
    else updates.last_dm_menu_sent_at = new Date().toISOString();

    await supabase
      .from('slack_app_home_throttle')
      .upsert(updates, { onConflict: 'slack_user_id' });

    return true;
  } catch (err) {
    console.error('[THROTTLE] Error checking throttle, defaulting to allow:', err);
    return true;
  }
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

// ── Fuzzy Member Match Helper ─────────────────────────────
async function fuzzyMatchMember(
  db: any,
  teamIds: string[],
  name: string
): Promise<{ id: string; name: string } | null> {
  // Try direct ilike match
  const { data: member } = await db
    .from('team_members')
    .select('id, name')
    .in('team_id', teamIds)
    .ilike('name', `%${name}%`)
    .limit(1)
    .maybeSingle();
  if (member) return member;

  // Try first + last name parts
  const nameParts = name.split(' ').filter(Boolean);
  if (nameParts.length >= 2) {
    const { data: member2 } = await db
      .from('team_members')
      .select('id, name')
      .in('team_id', teamIds)
      .ilike('name', `%${nameParts[0]}%`)
      .ilike('name', `%${nameParts[nameParts.length - 1]}%`)
      .limit(1)
      .maybeSingle();
    if (member2) return member2;
  }

  return null;
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
  const mentionMatch = input.match(/^<@(U[A-Z0-9]+)(?:\|([^>]+))?>/);
  if (mentionMatch) {
    const slackMentionUserId = mentionMatch[1];
    const mentionDisplayName = mentionMatch[2] || '';
    console.log('[RESOLVE] Slack mention detected, user ID:', slackMentionUserId, '| display name:', mentionDisplayName);

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

    // Fallback 1: use display name from mention (e.g. "guilherme.cunha" → "guilherme cunha")
    if (mentionDisplayName) {
      const cleanDisplayName = mentionDisplayName.replace(/[._-]/g, ' ').trim();
      console.log('[RESOLVE] Trying display name from mention:', cleanDisplayName);
      const foundViaDisplay = await fuzzyMatchMember(supabase, teamIds, cleanDisplayName);
      if (foundViaDisplay) {
        console.log('[RESOLVE] Found via mention display name:', foundViaDisplay.name);
        return foundViaDisplay;
      }
    }

    // Fallback 2: try to get Slack user's real name and fuzzy match
    try {
      const slackUser = await slackApi('users.info', { user: slackMentionUserId });
      if (slackUser.ok) {
        const realName = slackUser.user?.real_name || slackUser.user?.profile?.display_name || '';
        console.log('[RESOLVE] Slack user real name:', realName);
        if (realName) {
          const foundViaReal = await fuzzyMatchMember(supabase, teamIds, realName);
          if (foundViaReal) {
            console.log('[RESOLVE] Found via real name fallback:', foundViaReal.name);
            return foundViaReal;
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
    const APP_URL = 'https://rhitmo.co';
    const connectUrl = stateToken
      ? `${APP_URL}/slack/connect?state=${encodeURIComponent(stateToken)}`
      : APP_URL;
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
        { type: 'button', text: { type: 'plain_text', text: '🌀 Conversar com a Rhitmo' }, action_id: 'start_rhitmo_chat' },
      ]},
      { type: 'section', text: { type: 'mrkdwn', text: '\n*💬 Comandos rápidos:*\n• `/nota @membro texto` — Feedback privado\n• `/kudos @membro texto` — Reconhecimento privado (DM + Diário)\n• `/brief @membro` — Resumo do membro\n• `/mentor <pergunta>` — Consultar mentor de IA\n• `/rhitmo` — Este menu' }},
      { type: 'section', text: { type: 'mrkdwn', text: '\n*📊 No Rhitmo Web:*\n• *Rhitmo Mensal & Trimestral* — recaps automáticos do time\n• *Avaliação Formal* — gerar com IA em 2 passos (briefing → revisão)\n→ <https://rhitmo.co|Abrir Rhitmo>' }},
    );
  } else if (persona.persona === 'direct_report') {
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: '*👤 Seu Desenvolvimento*' } },
      { type: 'section', text: { type: 'mrkdwn', text: 'Acesse seu PDI e suas avaliações compartilhadas diretamente pelo Slack ou no Rhitmo.' }},
      { type: 'actions', elements: [
        { type: 'button', text: { type: 'plain_text', text: '📋 Meu PDI' }, action_id: 'action_meu_pdi', style: 'primary' },
        { type: 'button', text: { type: 'plain_text', text: '📄 Minhas Avaliações' }, url: 'https://rhitmo.co/avaliacoes', action_id: 'open_my_reviews' },
        { type: 'button', text: { type: 'plain_text', text: '🌀 Conversar com a Rhitmo' }, action_id: 'start_rhitmo_chat' },
        { type: 'button', text: { type: 'plain_text', text: '🚀 Abrir Rhitmo' }, url: 'https://rhitmo.co', action_id: 'open_app' },
      ]},
      { type: 'section', text: { type: 'mrkdwn', text: '\n*💬 Comandos rápidos:*\n• `/meu-pdi` — Ver seu Plano de Desenvolvimento\n• `/meu-rhitmo` — Ver seu perfil e feedbacks\n• `/rhitmo` — Este menu' }},
    );
  } else if (persona.persona === 'hr_admin') {
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: '*📈 Analytics Organizacional*' } },
      { type: 'section', text: { type: 'mrkdwn', text: '• Health Score do workspace (0–100)\n• Alertas de risco (turnover, viés, silêncio de líder)\n• Visão consolidada de PDIs e avaliações' }},
      { type: 'actions', elements: [
        { type: 'button', text: { type: 'plain_text', text: '📊 Dashboard HR' }, url: 'https://rhitmo.co/hr', action_id: 'open_hr', style: 'primary' },
        { type: 'button', text: { type: 'plain_text', text: '🚨 Alertas de Risco' }, url: 'https://rhitmo.co/hr', action_id: 'open_hr_alerts' },
        { type: 'button', text: { type: 'plain_text', text: '📈 Analytics Avançado' }, url: 'https://rhitmo.co/hr/analytics', action_id: 'open_hr_analytics' },
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

// /kudos é PRIVADO: DM ao liderado + registro como nota de reconhecimento no Diário.
// Não posta nada no canal — Brasil tem cultura de baixo conforto com elogio público.
async function handleKudosCommand(payload: Record<string, string>, persona: PersonaResult): Promise<{ ephemeral: Record<string, unknown>; dmTo?: { slackUserId: string; blocks: unknown[] }; saveAs?: { managerId: string; memberId: string; message: string } }> {
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

  const senderName = payload.user_name || 'seu líder';

  const result = await resolveMember(memberInput, persona.workspaceId!);
  if ('error' in result) return { ephemeral: { text: `❌ ${result.error}` } };

  // Buscar slack_user_id do liderado para DM (se já conectou Slack)
  let dmTo: { slackUserId: string; blocks: unknown[] } | undefined;
  const { data: linkedIntegration } = await supabase
    .from('team_members')
    .select('linked_user_id')
    .eq('id', result.id)
    .maybeSingle();
  if (linkedIntegration?.linked_user_id) {
    const { data: integ } = await supabase
      .from('slack_integrations')
      .select('slack_user_id')
      .eq('user_id', linkedIntegration.linked_user_id)
      .maybeSingle();
    if (integ?.slack_user_id) {
      dmTo = {
        slackUserId: integ.slack_user_id,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `👏 *${senderName} reconheceu seu trabalho:*\n\n${message}` } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: 'Esta mensagem é privada. Também ficou registrada no seu Diário de Bordo.' }] },
        ],
      };
    }
  }

  return {
    ephemeral: { text: `✅ Kudos privado enviado para *${result.name}*${dmTo ? ' por DM' : ''} e registrado no Diário de Bordo.` },
    dmTo,
    saveAs: { managerId: persona.userId!, memberId: result.id, message },
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

// ── /brief Handler ────────────────────────────────────────
async function handleBriefCommand(payload: Record<string, string>, persona: PersonaResult): Promise<Record<string, unknown>> {
  if (persona.persona !== 'leader') {
    return { text: '❌ Este comando é exclusivo para líderes.' };
  }

  const text = (payload.text || '').trim();
  if (!text) {
    return { text: '❌ Formato: `/brief @membro`\nExemplo: `/brief @João`' };
  }

  const result = await resolveMember(text, persona.workspaceId!);
  if ('error' in result) return { text: `❌ ${result.error}` };

  return await buildBriefForMember(result.id, result.name, persona);
}

// Reusable brief builder — used by /brief and prep_1on1_brief button
async function buildBriefForMember(
  memberId: string,
  memberName: string,
  persona: PersonaResult,
): Promise<Record<string, unknown>> {
  const result = { id: memberId, name: memberName };

  // Fetch recent feedbacks
  const { data: recentFeedbacks } = await supabase
    .from('feedbacks')
    .select('content, summary, sentiment, type, occurred_at, tags')
    .eq('member_id', result.id)
    .order('occurred_at', { ascending: false })
    .limit(10);

  // Fetch active PDI
  const { data: activePlan } = await supabase
    .from('development_plans')
    .select('id, period_label, status')
    .eq('member_id', result.id)
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let pdiItems: any[] = [];
  if (activePlan) {
    const { data } = await supabase
      .from('development_items')
      .select('title, status, due_date')
      .eq('plan_id', activePlan.id);
    pdiItems = data || [];
  }

  // Fetch upcoming meeting
  const { data: nextMeeting } = await supabase
    .from('upcoming_meetings')
    .select('title, start_time')
    .eq('member_id', result.id)
    .eq('user_id', persona.userId!)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(1)
    .maybeSingle();

  // Build blocks
  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: `📊 Brief — ${result.name}` } },
    { type: 'divider' },
  ];

  // Sentiment summary
  if (recentFeedbacks?.length) {
    const sentiments = recentFeedbacks.map(f => f.sentiment).filter(Boolean);
    const sentimentCounts: Record<string, number> = {};
    sentiments.forEach(s => { sentimentCounts[s!] = (sentimentCounts[s!] || 0) + 1; });
    const topSentiment = Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0];
    const sentimentEmoji: Record<string, string> = { muito_positivo: '🟢', positivo: '🟢', neutro: '⚪', construtivo: '🟡', critico: '🔴' };

    const lastNote = recentFeedbacks[0];
    const lastDate = new Date(lastNote.occurred_at).toLocaleDateString('pt-BR');
    const summaryText = lastNote.summary || lastNote.content?.substring(0, 120) + '...';

    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: `*📝 Últimas Notas* (${recentFeedbacks.length} registros)\nSentimento predominante: ${sentimentEmoji[topSentiment?.[0] || 'neutro'] || '⚪'} ${topSentiment?.[0] || 'neutro'}\n\n_Última nota (${lastDate}):_ ${summaryText}` } },
    );
  } else {
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: '📝 *Nenhuma nota registrada ainda.* Comece com `/nota @membro texto`' } },
    );
  }

  // PDI section
  if (activePlan && pdiItems.length) {
    const pending = pdiItems.filter(i => i.status !== 'completed').length;
    const done = pdiItems.filter(i => i.status === 'completed').length;
    const nextDue = pdiItems.filter(i => i.due_date && i.status !== 'completed').sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0];
    let pdiText = `*📋 PDI Ativo* — ${activePlan.period_label || 'Sem período'}\n✅ ${done} concluídos | ⏳ ${pending} pendentes`;
    if (nextDue) pdiText += `\nPróximo prazo: ${new Date(nextDue.due_date!).toLocaleDateString('pt-BR')} — _${nextDue.title}_`;
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: pdiText } });
  } else {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '📋 *Sem PDI ativo.* Crie um no Rhitmo.' } });
  }

  // Next meeting
  if (nextMeeting) {
    const meetDate = new Date(nextMeeting.start_time).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*📅 Próxima 1:1:* ${meetDate} — _${nextMeeting.title || 'Reunião'}_` } });
  }

  blocks.push(
    { type: 'divider' },
    { type: 'context', elements: [{ type: 'mrkdwn', text: '💡 Use `/nota @membro texto` para registrar observações.' }] },
  );

  return { blocks };
}

// ── /meu-pdi Handler ──────────────────────────────────────
async function handleMeuPdiCommand(persona: PersonaResult): Promise<Record<string, unknown>> {
  if (persona.persona !== 'direct_report' || !persona.memberId) {
    return { text: '❌ Este comando é exclusivo para liderados vinculados ao Rhitmo.' };
  }

  const { data: plan } = await supabase
    .from('development_plans')
    .select('id, period_label, status, leader_comment')
    .eq('member_id', persona.memberId)
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) {
    return {
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: '📋 *Você ainda não tem um PDI ativo.*' } },
        { type: 'section', text: { type: 'mrkdwn', text: 'Converse com seu líder ou acesse o Rhitmo para criar um.' } },
        { type: 'actions', elements: [
          { type: 'button', text: { type: 'plain_text', text: '🚀 Abrir Rhitmo' }, url: 'https://rhitmo.co', action_id: 'open_app' },
        ]},
      ],
    };
  }

  const { data: items } = await supabase
    .from('development_items')
    .select('title, status, due_date, category')
    .eq('plan_id', plan.id)
    .order('due_date', { ascending: true, nullsFirst: false });

  const allItems = items || [];
  const pending = allItems.filter(i => i.status !== 'completed');
  const done = allItems.filter(i => i.status === 'completed');

  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: '📋 Meu Plano de Desenvolvimento' } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Período:* ${plan.period_label || 'Não definido'} | *Status:* ${plan.status || 'ativo'}` } },
    { type: 'divider' },
  ];

  if (pending.length) {
    let pendingText = '*⏳ Pendentes:*\n';
    pending.forEach(item => {
      const due = item.due_date ? ` (até ${new Date(item.due_date).toLocaleDateString('pt-BR')})` : '';
      const cat = item.category ? ` [${item.category}]` : '';
      pendingText += `• ${item.title}${cat}${due}\n`;
    });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: pendingText } });
  }

  if (done.length) {
    let doneText = `*✅ Concluídos (${done.length}):*\n`;
    done.slice(0, 5).forEach(item => { doneText += `• ~${item.title}~\n`; });
    if (done.length > 5) doneText += `_...e mais ${done.length - 5}_\n`;
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: doneText } });
  }

  if (!allItems.length) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '_Nenhum item de desenvolvimento cadastrado ainda._' } });
  }

  if (plan.leader_comment) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `💬 *Comentário do líder:* ${plan.leader_comment}` } });
  }

  blocks.push(
    { type: 'divider' },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `📊 ${done.length}/${allItems.length} itens concluídos` }] },
  );

  return { blocks };
}

// ── /mentor Handler (for leaders) ─────────────────────────
async function handleMentorCommand(payload: Record<string, string>, persona: PersonaResult): Promise<Record<string, unknown>> {
  if (persona.persona !== 'leader') {
    return { text: '❌ Este comando é exclusivo para líderes.' };
  }

  const text = (payload.text || '').trim();
  if (!text) {
    return { text: '❌ Formato: `/mentor <pergunta>`\nExemplo: `/mentor como preparar feedback construtivo para alguém que não entrega no prazo?`' };
  }

  // Check if there's a member mention for context
  let memberContext: { id: string; name: string } | null = null;
  let question = text;
  const mentionMatch = text.match(/^(<@U[A-Z0-9]+(?:\|[^>]*)?>)\s+(.+)/s);
  if (mentionMatch) {
    const result = await resolveMember(mentionMatch[1], persona.workspaceId!);
    if (!('error' in result)) {
      memberContext = result;
      question = mentionMatch[2];
    }
  }

  try {
    // Determine which member to fetch context for
    const targetMemberId = memberContext?.id;

    // Fetch recent feedbacks for context (like frontend MentorChat does)
    let feedbacks: any[] = [];
    let memberName = memberContext?.name || 'Meu time';
    let memberRole = '';
    let workStyleData: any = null;

    if (targetMemberId) {
      // Fetch member details
      const { data: memberData } = await supabase
        .from('team_members')
        .select('name, role, work_style_data')
        .eq('id', targetMemberId)
        .single();
      if (memberData) {
        memberName = memberData.name;
        memberRole = memberData.role;
        workStyleData = memberData.work_style_data;
      }

      // Fetch recent feedbacks for this member
      const { data: fbData } = await supabase
        .from('feedbacks')
        .select('id, content, summary, type, tags, sentiment, occurred_at, created_at, member_id')
        .eq('member_id', targetMemberId)
        .eq('manager_id', persona.userId!)
        .order('occurred_at', { ascending: false })
        .limit(15);
      feedbacks = fbData || [];
    } else {
      // No specific member — fetch all leader's recent feedbacks across team
      const { data: teams } = await supabase.from('teams').select('id').eq('workspace_id', persona.workspaceId!).eq('leader_user_id', persona.userId!);
      const teamIds = teams?.map(t => t.id) || [];
      if (teamIds.length > 0) {
        const { data: members } = await supabase
          .from('team_members')
          .select('id, name')
          .in('team_id', teamIds)
          .limit(50);
        const memberIds = members?.map(m => m.id) || [];
        if (memberIds.length > 0) {
          const { data: fbData } = await supabase
            .from('feedbacks')
            .select('id, content, summary, type, tags, sentiment, occurred_at, created_at, member_id')
            .in('member_id', memberIds)
            .eq('manager_id', persona.userId!)
            .order('occurred_at', { ascending: false })
            .limit(15);
          feedbacks = fbData || [];
          // Use first member's name as fallback context
          if (members?.length === 1) {
            memberName = members[0].name;
          }
        }
      }
    }

    // Fetch manager name
    const { data: managerProfile } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', persona.workspaceId!)
      .single();

    // Fetch leader sync data for leader profile
    const { data: wsData } = await supabase
      .from('workspaces')
      .select('leader_sync_data')
      .eq('id', persona.workspaceId!)
      .single();

    // Build the correct payload for chat-mentor
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const mentorPayload: Record<string, unknown> = {
      question,
      feedbacks: feedbacks.length > 0 ? feedbacks : [{ id: 'empty', content: 'Sem notas registradas ainda.', type: 'neutral', occurred_at: new Date().toISOString(), created_at: new Date().toISOString() }],
      memberName,
      memberRole: memberRole || 'Colaborador',
      managerName: 'Líder',
      workStyleData: workStyleData || null,
      leaderSyncData: wsData?.leader_sync_data || null,
      contextMode: 'auto',
    };

    console.log('[MENTOR] Calling chat-mentor with:', { question: question.substring(0, 50), feedbacksCount: feedbacks.length, memberName });

    const res = await fetch(`${supabaseUrl}/functions/v1/chat-mentor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mentorPayload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[MENTOR] Edge function error:', res.status, errBody);
      return { text: '❌ Erro ao consultar o mentor de IA. Tente novamente em alguns segundos.' };
    }

    const data = await res.json();
    const reply = data.response || data.reply || data.message || 'Sem resposta do mentor.';
    const slackReply = smartTruncate(markdownToSlackMrkdwn(reply), 2900);

    const blocks: unknown[] = [
      { type: 'section', text: { type: 'mrkdwn', text: `> _${question}_` } },
      { type: 'header', text: { type: 'plain_text', text: '🧠 Mentor Rhitmo' } },
    ];

    if (memberContext) {
      blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `Contexto: *${memberContext.name}*` }] });
    }

    blocks.push(
      { type: 'divider' },
      { type: 'section', text: { type: 'mrkdwn', text: slackReply } },
      { type: 'divider' },
      { type: 'context', elements: [{ type: 'mrkdwn', text: '💡 Continue a conversa no Rhitmo para manter o histórico completo.' }] },
    );

    return { blocks };
  } catch (err) {
    console.error('[MENTOR] Error:', err);
    return { text: '❌ Erro ao consultar o mentor de IA. Tente novamente.' };
  }
}

// ── /meu-rhitmo Handler (for direct reports) ──────────────
async function handleMeuRhitmoCommand(persona: PersonaResult): Promise<Record<string, unknown>> {
  if (persona.persona !== 'direct_report' || !persona.memberId) {
    return { text: '❌ Este comando é exclusivo para liderados vinculados ao Rhitmo.' };
  }

  // Fetch member data
  const { data: member } = await supabase
    .from('team_members')
    .select('name, role, work_style_data, skills_data, feedback_style, recognition_style, chronotype, motivators, user_manual')
    .eq('id', persona.memberId)
    .single();

  if (!member) {
    return { text: '❌ Perfil não encontrado.' };
  }

  // Fetch recent feedbacks (shared only)
  const { data: recentFeedbacks } = await supabase
    .from('feedbacks')
    .select('summary, sentiment, tags, occurred_at')
    .eq('member_id', persona.memberId)
    .eq('visibility', 'shared')
    .order('occurred_at', { ascending: false })
    .limit(5);

  // Fetch active PDI
  const { data: activePlan } = await supabase
    .from('development_plans')
    .select('id, period_label, status')
    .eq('member_id', persona.memberId)
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let pdiCount = 0;
  let pdiPending = 0;
  if (activePlan) {
    const { data: items } = await supabase
      .from('development_items')
      .select('status')
      .eq('plan_id', activePlan.id);
    pdiCount = items?.length || 0;
    pdiPending = items?.filter(i => i.status !== 'completed').length || 0;
  }

  // Build profile blocks
  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: `🎯 Meu Rhitmo — ${member.name}` } },
    { type: 'divider' },
  ];

  // Work style summary
  const workStyle = member.work_style_data as Record<string, unknown> | null;
  if (workStyle) {
    const disc = workStyle.disc_profile as Record<string, unknown> | undefined;
    const discText = disc ? `DISC: *${disc.primary || '—'}*${disc.secondary ? ` / ${disc.secondary}` : ''}` : '';
    const chronoEmoji: Record<string, string> = { morning: '🌅', afternoon: '☀️', evening: '🌙' };
    const chronoText = member.chronotype ? `${chronoEmoji[member.chronotype] || '⏰'} ${member.chronotype}` : '';
    
    let profileParts = [discText, chronoText].filter(Boolean).join(' | ');
    if (member.feedback_style) profileParts += `\nEstilo de feedback: *${member.feedback_style}*`;
    if (member.recognition_style) profileParts += `\nReconhecimento: *${member.recognition_style}*`;

    if (profileParts) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*🧬 Meu Perfil*\n${profileParts}` } });
    }
  }

  // Skills
  const skills = member.skills_data as Record<string, unknown> | null;
  if (skills) {
    const topSkills = (skills.top_skills as string[]) || [];
    const growthAreas = (skills.growth_areas as string[]) || [];
    let skillsText = '';
    if (topSkills.length) skillsText += `💪 Forças: ${topSkills.slice(0, 3).join(', ')}\n`;
    if (growthAreas.length) skillsText += `📈 Desenvolvimento: ${growthAreas.slice(0, 3).join(', ')}`;
    if (skillsText) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*🗺️ Career Compass*\n${skillsText}` } });
    }
  }

  // Recent shared feedbacks
  if (recentFeedbacks?.length) {
    const sentimentEmoji: Record<string, string> = { muito_positivo: '🟢', positivo: '🟢', neutro: '⚪', construtivo: '🟡', critico: '🔴' };
    let fbText = '*📝 Feedbacks Recentes*\n';
    recentFeedbacks.forEach(f => {
      const date = new Date(f.occurred_at).toLocaleDateString('pt-BR');
      const emoji = sentimentEmoji[f.sentiment || 'neutro'] || '⚪';
      fbText += `${emoji} ${date}: ${f.summary || '(sem resumo)'}\n`;
    });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: fbText } });
  } else {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '📝 *Nenhum feedback compartilhado ainda.*' } });
  }

  // PDI status
  if (activePlan) {
    const done = pdiCount - pdiPending;
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*📋 PDI:* ${activePlan.period_label || 'Ativo'} — ✅ ${done}/${pdiCount} concluídos` } });
  }

  blocks.push(
    { type: 'divider' },
    { type: 'actions', elements: [
      { type: 'button', text: { type: 'plain_text', text: '🚀 Ver completo no Rhitmo' }, url: 'https://app-rhitmo.lovable.app', action_id: 'open_app' },
    ]},
  );

  return { blocks };
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
      // DM privada ao liderado (se conectado ao Slack)
      if (result.dmTo) {
        await slackApi('chat.postMessage', { channel: result.dmTo.slackUserId, blocks: result.dmTo.blocks });
      }
      // Registra como nota de reconhecimento no Diário de Bordo do liderado
      if (result.saveAs) {
        await supabase.from('feedbacks').insert({
          manager_id: result.saveAs.managerId,
          member_id: result.saveAs.memberId,
          content: result.saveAs.message,
          type: 'positive',
          source: 'slack_kudos',
          visibility: 'shared',
          tags: ['kudo'],
        });
        await supabase.from('kudos').insert({
          workspace_id: persona.workspaceId,
          from_user_id: persona.userId,
          to_member_id: result.saveAs.memberId,
          message: result.saveAs.message,
        });
      }
      await sendDelayedResponse(responseUrl, result.ephemeral);
      break;
    }
    case '/brief': {
      const payload: Record<string, string> = {};
      for (const [k, v] of params.entries()) payload[k] = v;
      const msg = await handleBriefCommand(payload, persona);
      await sendDelayedResponse(responseUrl, msg);
      break;
    }
    case '/meu-pdi': {
      const msg = await handleMeuPdiCommand(persona);
      await sendDelayedResponse(responseUrl, msg);
      break;
    }
    case '/mentor': {
      const payload: Record<string, string> = {};
      for (const [k, v] of params.entries()) payload[k] = v;
      const msg = await handleMentorCommand(payload, persona);
      await sendDelayedResponse(responseUrl, msg);
      break;
    }
    case '/meu-rhitmo': {
      const msg = await handleMeuRhitmoCommand(persona);
      await sendDelayedResponse(responseUrl, msg);
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
          case '/brief': {
            const p2: Record<string, string> = {};
            for (const [k, v] of originalParams.entries()) p2[k] = v;
            const briefMsg = await handleBriefCommand(p2, persona);
            await sendDelayedResponse(origResponseUrl, briefMsg);
            break;
          }
          case '/meu-pdi': {
            const pdiMsg = await handleMeuPdiCommand(persona);
            await sendDelayedResponse(origResponseUrl, pdiMsg);
            break;
          }
          case '/mentor': {
            const p3: Record<string, string> = {};
            for (const [k, v] of originalParams.entries()) p3[k] = v;
            const mentorMsg = await handleMentorCommand(p3, persona);
            await sendDelayedResponse(origResponseUrl, mentorMsg);
            break;
          }
          case '/meu-rhitmo': {
            const rhitmoMsg = await handleMeuRhitmoCommand(persona);
            await sendDelayedResponse(origResponseUrl, rhitmoMsg);
            break;
          }
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
      case 'action_meu_pdi': {
        console.log('[INTERACT] Meu PDI button clicked');
        const pdiPersona = await getUserPersona(slackUserId);
        const pdiMsg = await handleMeuPdiCommand(pdiPersona);
        if (responseUrl) await sendDelayedResponse(responseUrl, pdiMsg);
        break;
      }
      case 'prep_1on1_brief': {
        console.log('[INTERACT] prep_1on1_brief clicked, value:', action.value);
        const briefPersona = await getUserPersona(slackUserId);
        if (briefPersona.persona !== 'leader' || !briefPersona.userId) {
          if (responseUrl) await sendDelayedResponse(responseUrl, { text: '❌ Apenas líderes podem gerar pautas.' });
          break;
        }
        const [meetingId] = (action.value || '').split(':');
        if (!meetingId) {
          if (responseUrl) await sendDelayedResponse(responseUrl, { text: '❌ Reunião inválida.' });
          break;
        }
        try {
          const { generateBriefForMeeting, briefToSlackBlocks } = await import('../_shared/briefGenerator.ts');
          const result = await generateBriefForMeeting(
            meetingId,
            briefPersona.userId,
            supabase,
            Deno.env.get('LOVABLE_API_KEY'),
          );
          const blocks = briefToSlackBlocks(result.brief, {
            memberName: result.member_name,
            meetingId,
            meetingTitle: result.meeting_title,
            meetLink: result.meet_link,
          });
          console.log(`[INTERACT] prep_1on1_brief: brief ${result.cached ? 'cached' : 'generated'} for member=${result.member_id}`);
          if (responseUrl) await sendDelayedResponse(responseUrl, { blocks, response_type: 'ephemeral' });
        } catch (err) {
          console.error('[INTERACT] prep_1on1_brief failed, falling back:', err);
          // Fallback: legacy summary so user gets something
          const { data: meeting } = await supabase
            .from('upcoming_meetings')
            .select('member_id')
            .eq('id', meetingId)
            .eq('user_id', briefPersona.userId)
            .maybeSingle();
          if (!meeting?.member_id) {
            if (responseUrl) await sendDelayedResponse(responseUrl, { text: '❌ Reunião não encontrada.' });
            break;
          }
          const { data: m } = await supabase
            .from('team_members')
            .select('name')
            .eq('id', meeting.member_id)
            .maybeSingle();
          const fallback = await buildBriefForMember(meeting.member_id, m?.name ?? 'Liderado', briefPersona);
          if (responseUrl) {
            await sendDelayedResponse(responseUrl, {
              text: '⚠ Não consegui gerar a pauta com IA agora. Veja um resumo:',
              ...fallback,
            });
          }
        }
        break;
      }
      case 'peer_fb_open': {
        const reqId = action.value;
        if (!reqId) break;
        const { data: pfr } = await supabase
          .from('peer_feedback_requests')
          .select('id, subject_member_id, peer_user_id, status, team_members:subject_member_id(name)')
          .eq('id', reqId)
          .maybeSingle();
        if (!pfr) {
          await slackApi('chat.postMessage', { channel: slackUserId, text: '⚠️ Solicitação não encontrada.' });
          break;
        }
        if (pfr.status !== 'pending') {
          await slackApi('chat.postMessage', { channel: slackUserId, text: 'Esta solicitação já foi respondida 🙌' });
          break;
        }
        const subjName = (pfr as any).team_members?.name ?? 'esse colega';
        const modalRes = await slackApi('views.open', {
          trigger_id: triggerId,
          view: {
            type: 'modal',
            callback_id: 'peer_feedback_submission',
            private_metadata: reqId,
            title: { type: 'plain_text', text: '✍️ Feedback de par' },
            submit: { type: 'plain_text', text: 'Enviar' },
            close: { type: 'plain_text', text: 'Cancelar' },
            blocks: [
              {
                type: 'section',
                text: { type: 'mrkdwn', text: `Sua nota sobre *${subjName}* será compartilhada apenas com a liderança dele(a). Seja específico e gentil 🌀` },
              },
              {
                type: 'input',
                block_id: 'fb_block',
                element: {
                  type: 'plain_text_input',
                  action_id: 'fb_text',
                  multiline: true,
                  min_length: 10,
                  max_length: 1000,
                  placeholder: { type: 'plain_text', text: 'Algo que ele(a) fez bem? Algo a melhorar?' },
                },
                label: { type: 'plain_text', text: 'Feedback' },
              },
            ],
          },
        });
        if (!modalRes.ok) console.error('[INTERACT] peer_fb_open views.open failed:', modalRes.error);
        break;
      }
      case 'peer_fb_skip': {
        const reqId = action.value;
        if (reqId) {
          await supabase
            .from('peer_feedback_requests')
            .update({ status: 'declined', responded_at: new Date().toISOString() })
            .eq('id', reqId)
            .eq('peer_user_id', (await supabase
              .from('slack_integrations')
              .select('user_id')
              .eq('slack_user_id', slackUserId)
              .maybeSingle()).data?.user_id ?? '00000000-0000-0000-0000-000000000000');
        }
        if (responseUrl) {
          await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replace_original: true, text: 'Sem problema 🙏 Vou perguntar de novo daqui um tempo.' }),
          });
        }
        break;
      }
      case 'start_rhitmo_chat': {
        console.log('[INTERACT] Start Rhitmo chat clicked by:', slackUserId);
        try {
          const chatPersona = await getUserPersona(slackUserId);
          if (chatPersona.persona === 'unauthenticated' || !chatPersona.workspaceId) {
            await slackApi('chat.postMessage', {
              channel: slackUserId,
              text: '🔗 Conecte sua conta Rhitmo primeiro. Use `/rhitmo` para começar.',
            });
            break;
          }

          // Idempotency: if already in an active conversation, just nudge.
          const existing = await getActiveConversation(slackUserId);
          if (existing) {
            await slackApi('chat.postMessage', {
              channel: slackUserId,
              text: 'Já estamos numa conversa ativa 🌀 — é só me responder por aqui.',
            });
            break;
          }

          const { error: insertErr } = await supabase.from('slack_conversations').insert({
            workspace_id: chatPersona.workspaceId,
            slack_user_id: slackUserId,
            intent: 'general_chat',
            status: 'active',
            state_data: { turns: [] },
          });
          if (insertErr) {
            console.error('[INTERACT] Failed to insert slack_conversation:', insertErr.message);
            await slackApi('chat.postMessage', {
              channel: slackUserId,
              text: '⚠️ Não consegui abrir nossa conversa agora. Tente em instantes.',
            });
            break;
          }

          await slackApi('chat.postMessage', {
            channel: slackUserId,
            text: 'Olá! Eu sou o Mentor da Rhitmo 🌀, conectado ao seu Context Graph. Sobre o que você quer falar ou refletir hoje?',
          });
        } catch (err) {
          console.error('[INTERACT] start_rhitmo_chat error:', err);
        }
        break;
      }
      case 'open_quarterly_in_app':
        console.log('[INTERACT] URL button clicked:', action.action_id);
        break;
      case 'generate_quarterly_dismiss': {
        const memberId = action.value;
        // Push cooldown 30 days into the past-future (so next nudge is ~30d away)
        const future = new Date(Date.now() - (14 - 30) * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('team_members').update({ last_anniversary_nudge_at: future }).eq('id', memberId);
        // Close conversation if any
        await supabase.from('slack_conversations')
          .update({ status: 'completed' })
          .eq('slack_user_id', slackUserId)
          .eq('intent', 'awaiting_quarterly_confirmation')
          .eq('status', 'active');
        if (responseUrl) {
          await fetch(responseUrl, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replace_original: true, text: 'Tranquilo 🙏 Eu te lembro de novo em algumas semanas.' }),
          });
        }
        break;
      }
      case 'generate_quarterly_confirm': {
        let parsed: { member_id: string; period_start: string; period_end: string; period_label?: string };
        try { parsed = JSON.parse(action.value || '{}'); }
        catch { console.error('[INTERACT] Invalid quarterly value'); break; }
        await runQuarterlyGenerationFromSlack({
          slackUserId,
          channelId: payload.channel?.id || slackUserId,
          responseUrl,
          memberId: parsed.member_id,
          periodStart: parsed.period_start,
          periodEnd: parsed.period_end,
          periodLabel: parsed.period_label,
        });
        break;
      }
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

      // Kudos PRIVADO: DM ao liderado (se conectado) + registro no Diário de Bordo
      const { data: linkedTM } = await supabase
        .from('team_members')
        .select('linked_user_id')
        .eq('id', result.id)
        .maybeSingle();
      if (linkedTM?.linked_user_id) {
        const { data: integ } = await supabase
          .from('slack_integrations')
          .select('slack_user_id')
          .eq('user_id', linkedTM.linked_user_id)
          .maybeSingle();
        if (integ?.slack_user_id) {
          await slackApi('chat.postMessage', {
            channel: integ.slack_user_id,
            blocks: [
              { type: 'section', text: { type: 'mrkdwn', text: `👏 *${senderName} reconheceu seu trabalho:*\n\n${kudosText}` } },
              { type: 'context', elements: [{ type: 'mrkdwn', text: 'Esta mensagem é privada. Também ficou registrada no seu Diário de Bordo.' }] },
            ],
          });
    }

    else if (callbackId === 'peer_feedback_submission') {
      const reqId = payload.view?.private_metadata;
      const fbText = values.fb_block?.fb_text?.value;
      if (!reqId || !fbText) {
        console.error('[INTERACT] peer_feedback_submission missing fields');
        return;
      }
      const { error: updErr } = await supabase
        .from('peer_feedback_requests')
        .update({
          status: 'answered',
          response_text: fbText,
          responded_at: new Date().toISOString(),
        })
        .eq('id', reqId)
        .eq('peer_user_id', persona.userId!);
      if (updErr) {
        console.error('[INTERACT] peer_feedback update failed:', updErr.message);
        await slackApi('chat.postMessage', {
          channel: slackUserId,
          text: '⚠️ Não consegui salvar agora. Tente em instantes.',
        });
        return;
      }
      await slackApi('chat.postMessage', {
        channel: slackUserId,
        text: '✅ Obrigada! Seu feedback foi registrado para a liderança 🌀',
      });
    }
  }

      await supabase.from('feedbacks').insert({
        manager_id: persona.userId,
        member_id: result.id,
        content: kudosText,
        type: 'positive',
        source: 'slack_kudos',
        visibility: 'shared',
        tags: ['kudo'],
      });
      await supabase.from('kudos').insert({
        workspace_id: persona.workspaceId,
        from_user_id: persona.userId,
        to_member_id: result.id,
        message: kudosText,
      });

      // Confirma para quem enviou
      await slackApi('chat.postMessage', {
        channel: slackUserId,
        text: `✅ Kudos privado enviado para *${result.name}* e registrado no Diário de Bordo.`,
      });
    }
  }

  // ── Handle message_action (shortcut from message ⋯ menu) ──
  else if (interactionType === 'message_action') {
    const callbackId = payload.callback_id;
    const slackUserId = payload.user?.id;
    const triggerId = payload.trigger_id;
    const message = payload.message;
    const channel = payload.channel;
    const team = payload.team;
    console.log('[INTERACT] message_action callback:', callbackId, '| user:', slackUserId, '| msg_ts:', message?.ts);

    if (callbackId === 'save_as_evidence') {
      const persona = await getUserPersona(slackUserId);

      // Only leaders/HR/owners can capture evidence
      if (persona.persona === 'unauthenticated' || persona.persona === 'direct_report') {
        await slackApi('chat.postEphemeral', {
          channel: channel?.id,
          user: slackUserId,
          text: '🔒 Apenas líderes e HR Admins podem salvar evidências. Conecte sua conta em rhitmo.co.',
        });
        return;
      }

      const messageText = message?.text || '';
      const messageTs = message?.ts;
      const channelId = channel?.id;
      const authorSlackId = message?.user;

      if (!messageText || !messageTs || !channelId || !authorSlackId) {
        console.error('[EVIDENCE] Missing required fields', { messageText: !!messageText, messageTs, channelId, authorSlackId });
        await slackApi('chat.postEphemeral', {
          channel: channelId,
          user: slackUserId,
          text: '❌ Não consegui capturar essa mensagem. Pode ser uma mensagem de bot ou sistema.',
        });
        return;
      }

      // Resolve author: Slack user → email → team_member
      const authorInfo = await slackApi('users.info', { user: authorSlackId });
      const authorEmail = authorInfo.ok ? authorInfo.user?.profile?.email : null;

      let memberId: string | null = null;
      if (authorEmail) {
        // Try by cached slack_user_id first
        const { data: byCached } = await supabase
          .from('team_members')
          .select('id, name, leader_id')
          .eq('slack_user_id', authorSlackId)
          .maybeSingle();

        if (byCached) {
          memberId = byCached.id;
        } else {
          // Try by email + cache slack_user_id
          const { data: byEmail } = await supabase
            .from('team_members')
            .select('id, name, leader_id')
            .ilike('email', authorEmail)
            .maybeSingle();

          if (byEmail) {
            memberId = byEmail.id;
            // Cache for next time
            await supabase
              .from('team_members')
              .update({ slack_user_id: authorSlackId })
              .eq('id', byEmail.id);
          }
        }
      }

      if (!memberId) {
        await slackApi('chat.postEphemeral', {
          channel: channelId,
          user: slackUserId,
          text: '⚠️ Não consegui identificar quem escreveu essa mensagem. Verifique se a pessoa está cadastrada como liderado em rhitmo.co com o mesmo email do Slack.',
        });
        return;
      }

      // Build permalink
      let permalink: string | null = null;
      const linkRes = await slackApi('chat.getPermalink', {
        channel: channelId,
        message_ts: messageTs,
      });
      if (linkRes.ok) permalink = linkRes.permalink;

      // Insert evidence as pending — leader reviews on /evidence and decides to convert or dismiss
      const { data: inserted, error: insErr } = await supabase
        .from('slack_ambient_evidence')
        .upsert({
          workspace_id: persona.workspaceId,
          manager_id: persona.userId,
          member_id: memberId,
          slack_channel_id: channelId,
          slack_message_ts: messageTs,
          message_text: messageText.substring(0, 4000),
          permalink,
          category: 'outro',
          relevance_score: 1.0,
          summary: messageText.substring(0, 200),
          status: 'pending',
          captured_at: new Date().toISOString(),
        }, {
          onConflict: 'slack_channel_id,slack_message_ts,member_id',
        })
        .select('id')
        .single();

      if (insErr) {
        console.error('[EVIDENCE] Insert error:', insErr);
        await slackApi('chat.postEphemeral', {
          channel: channelId,
          user: slackUserId,
          text: '❌ Erro ao salvar evidência. Tente novamente em instantes.',
        });
        return;
      }

      console.log('[EVIDENCE] Saved id:', inserted?.id);

      // Get member name for confirmation
      const { data: memberData } = await supabase
        .from('team_members')
        .select('name')
        .eq('id', memberId)
        .single();

      await slackApi('chat.postEphemeral', {
        channel: channelId,
        user: slackUserId,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ Evidência sobre *${memberData?.name || 'liderado'}* enviada para revisão.`,
            },
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `<https://rhitmo.co/evidence|Revisar no Rhitmo →>` },
            ],
          },
        ],
        text: `✅ Evidência sobre ${memberData?.name || 'liderado'} enviada para revisão.`,
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

    // JSON payloads (url_verification + event_callback)
    if (contentType.includes('application/json')) {
      const json = JSON.parse(body);
      if (json.type === 'url_verification') {
        return new Response(JSON.stringify({ challenge: json.challenge }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Event API: message.im and app_home_opened
      if (json.type === 'event_callback') {
        // Verify signature for event callbacks
        const sigValid = await verifySlackSignature(body, timestamp, slackSignature);
        if (!sigValid) {
          console.log('[EVENT] Invalid signature — ignoring');
          return new Response('', { status: 200, headers: corsHeaders });
        }

        const event = json.event;
        console.log('[EVENT] type:', event?.type, '| subtype:', event?.subtype, '| bot_id:', event?.bot_id);

        // Ignore bot messages to prevent infinite loops
        if (event?.bot_id || event?.subtype === 'bot_message') {
          console.log('[EVENT] Bot message — ignoring');
          return new Response('', { status: 200, headers: corsHeaders });
        }

        // Handle DM messages
        if (event?.type === 'message' && event?.channel_type === 'im') {
          // Fire-and-forget async processing
          (async () => {
            try {
              const slackUserId = event.user;
              console.log('[DM] Message from:', slackUserId, '| text:', event.text?.substring(0, 50));

              const persona = await getUserPersona(slackUserId);
              console.log('[DM] Persona:', persona.persona);

              // ── Conversational State Machine hook (Sprint 11.1) ─────────
              // If the user has an active multi-turn conversation, persist the
              // turn and acknowledge. Short-circuits the welcome menu path.
              // Conversations are CREATED elsewhere (slash commands / buttons)
              // in later sprints — this hook is read/append only.
              if (persona.persona !== 'unauthenticated' && persona.workspaceId) {
                const conv = await getActiveConversation(slackUserId);
                if (conv) {
                  console.log('[CONV] Active conversation found:', conv.id, '| intent:', conv.intent);
                  await appendConversationTurn(conv.id, {
                    role: 'user',
                    text: event.text ?? '',
                    ts: event.ts,
                  });

                  // ── LLM turn (Sprint 11.2) ──────────────────────────
                  // Build messages from updated state. We re-read state_data after
                  // appending to include the user's latest turn.
                  const llmTask = (async () => {
                    try {
                      const turns = Array.isArray((conv.state_data as any)?.turns)
                        ? ((conv.state_data as any).turns as Array<{ role: string; text: string }>)
                        : [];
                      // Append the just-added user turn locally (RPC already persisted it)
                      const allTurns = [...turns, { role: 'user', text: event.text ?? '' }];
                      const recent = allTurns.slice(-20);
                      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
                        { role: 'system', content: buildSystemPromptForIntent(conv.intent) },
                        ...recent
                          .filter((t) => t.role === 'user' || t.role === 'assistant')
                          .map((t) => ({ role: t.role as 'user' | 'assistant', content: t.text || '' })),
                      ];

                      const assistantText = await callLovableAI(messages);

                      await appendConversationTurn(conv.id, {
                        role: 'assistant',
                        text: assistantText,
                        ts: String(Date.now() / 1000),
                      });

                      await slackApi('chat.postMessage', {
                        channel: event.channel,
                        text: assistantText,
                        mrkdwn: true,
                      });
                    } catch (err) {
                      console.error('[CONV] LLM turn failed:', err);
                      await slackApi('chat.postMessage', {
                        channel: event.channel,
                        text: '⚠️ Tive um problema agora. Pode repetir?',
                      }).catch(() => {});
                    }
                  })();

                  // Use EdgeRuntime.waitUntil when available so the runtime
                  // does not terminate the LLM task after we return 200 to Slack.
                  // @ts-ignore - EdgeRuntime is provided by Supabase/Deno Deploy
                  if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any)?.waitUntil) {
                    // @ts-ignore
                    (EdgeRuntime as any).waitUntil(llmTask);
                  } else {
                    // Fallback: fire-and-forget (already inside an IIFE)
                    llmTask.catch(() => {});
                  }

                  return; // do NOT fall through to the welcome menu
                }
              }

              // Throttle: only respond with full menu once per window per user.
              // Subsequent messages in the same window are silently ignored to avoid flooding the DM.
              const isAuthenticated = persona.persona !== 'unauthenticated';
              const allow = await shouldSendWelcome(
                slackUserId,
                json.team_id || '',
                isAuthenticated,
                'dm',
              );
              if (!allow) {
                console.log('[DM] Throttled — not re-sending menu');
                return;
              }

              let stateToken: string | undefined;
              if (!isAuthenticated) {
                stateToken = await generateStateToken(slackUserId, json.team_id || '');
              }

              const menu = buildRhitmoMenu(persona, stateToken);

              const introText = !isAuthenticated
                ? undefined
                : '👋 Olá! Aqui estão suas ações disponíveis. Use os comandos `/rhitmo`, `/nota`, `/kudos`, `/brief` ou `/mentor` a qualquer momento.';

              await slackApi('chat.postMessage', {
                channel: event.channel,
                ...(introText ? { text: introText } : {}),
                ...menu,
              });
            } catch (err) {
              console.error('[DM] Error processing message:', err);
            }
          })();

          return new Response('', { status: 200, headers: corsHeaders });
        }

        // Handle app_home_opened (messages tab) — send welcome (throttled)
        if (event?.type === 'app_home_opened' && event?.tab === 'messages') {
          (async () => {
            try {
              const slackUserId = event.user;
              console.log('[HOME] Messages tab opened by:', slackUserId);

              const persona = await getUserPersona(slackUserId);
              const isAuthenticated = persona.persona !== 'unauthenticated';

              // Throttle: prevent flooding when user toggles tabs.
              // Authenticated: 1x / 24h. Unauthenticated: 1x / 7 days.
              const allow = await shouldSendWelcome(
                slackUserId,
                json.team_id || '',
                isAuthenticated,
                'app_home',
              );
              if (!allow) {
                console.log('[HOME] Throttled — not re-sending welcome');
                return;
              }

              let stateToken: string | undefined;
              if (!isAuthenticated) {
                stateToken = await generateStateToken(slackUserId, json.team_id || '');
              }

              const menu = buildRhitmoMenu(persona, stateToken);

              await slackApi('chat.postMessage', {
                channel: event.channel,
                text: '👋 Bem-vindo ao Rhitmo! Envie qualquer mensagem para ver suas opções.',
                ...menu,
              });
            } catch (err) {
              console.error('[HOME] Error sending welcome:', err);
            }
          })();

          return new Response('', { status: 200, headers: corsHeaders });
        }
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
