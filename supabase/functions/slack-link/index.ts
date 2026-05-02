import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { commandsForAudience } from '../_shared/slackCommands.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Verify HMAC State Token ───────────────────────────────
async function verifyStateToken(state: string): Promise<{ slackUserId: string; slackTeamId: string } | null> {
  const secret = Deno.env.get('SLACK_SIGNING_SECRET');
  if (!secret) { console.error('[STATE] No signing secret'); return null; }

  const parts = state.split('.');
  if (parts.length !== 2) { console.error('[STATE] Invalid format'); return null; }

  // base64url decode
  const b64Decode = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  
  let payload: string;
  let providedHex: string;
  try {
    payload = b64Decode(parts[0]);
    providedHex = b64Decode(parts[1]);
  } catch {
    console.error('[STATE] Base64 decode failed');
    return null;
  }

  // Verify HMAC
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (expectedHex !== providedHex) {
    console.error('[STATE] HMAC mismatch');
    return null;
  }

  // Parse payload: slack_user_id:slack_team_id:timestamp
  const segments = payload.split(':');
  if (segments.length !== 3) { console.error('[STATE] Invalid payload segments'); return null; }

  const [slackUserId, slackTeamId, timestampStr] = segments;
  const timestamp = parseInt(timestampStr);
  const now = Math.floor(Date.now() / 1000);
  
  if (now - timestamp > 600) { // 10 minutes
    console.error('[STATE] Token expired:', now - timestamp, 'seconds old');
    return null;
  }

  return { slackUserId, slackTeamId };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    let slack_user_id: string;
    let slack_team_id: string;

    // Support both modes: direct IDs or HMAC state token
    if (body.state) {
      const verified = await verifyStateToken(body.state);
      if (!verified) {
        return new Response(JSON.stringify({ error: 'Invalid or expired state token' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      slack_user_id = verified.slackUserId;
      slack_team_id = verified.slackTeamId;
      console.log('[LINK] State token verified for:', slack_user_id);
    } else {
      slack_user_id = body.slack_user_id;
      slack_team_id = body.slack_team_id;
    }

    if (!slack_user_id || !slack_team_id) {
      return new Response(JSON.stringify({ error: 'slack_user_id and slack_team_id are required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Get user's workspace
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: workspace } = await serviceClient
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    // Also check if user is a linked member
    let workspaceId = workspace?.id;
    if (!workspaceId) {
      const { data: member } = await serviceClient
        .from('team_members')
        .select('team_id')
        .eq('linked_user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (member) {
        const { data: team } = await serviceClient
          .from('teams')
          .select('workspace_id')
          .eq('id', member.team_id)
          .single();
        workspaceId = team?.workspace_id;
      }
    }

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: 'No workspace found for user' }), {
        status: 404, headers: corsHeaders,
      });
    }

    // Upsert slack integration
    const { error: upsertError } = await serviceClient
      .from('slack_integrations')
      .upsert(
        {
          user_id: user.id,
          workspace_id: workspaceId,
          slack_user_id,
          slack_team_id,
        },
        { onConflict: 'user_id,slack_team_id' }
      );

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to link account' }), {
        status: 500, headers: corsHeaders,
      });
    }

    // Mark any pending invite as accepted
    const { error: inviteUpdateError } = await serviceClient
      .from('pending_slack_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('slack_user_id', slack_user_id)
      .eq('status', 'sent');

    if (inviteUpdateError) {
      console.warn('Failed to update pending invite:', inviteUpdateError);
    } else {
      console.log('[LINK] Pending invite marked as accepted for:', slack_user_id);
    }

    // Fire-and-forget: send welcome DM if not yet sent for this integration.
    // We don't block the response — frontend can show the success screen immediately.
    // @ts-ignore EdgeRuntime is provided by Supabase Edge runtime
    EdgeRuntime.waitUntil(
      maybeSendWelcomeDM(serviceClient, user.id, slack_user_id, slack_team_id).catch(err => {
        console.error('[WELCOME_DM] Unhandled error:', err);
      })
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Slack link error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Welcome DM
// ──────────────────────────────────────────────────────────────────────────────

async function maybeSendWelcomeDM(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  slackUserId: string,
  slackTeamId: string,
): Promise<void> {
  // Idempotency check
  const { data: integration } = await serviceClient
    .from('slack_integrations')
    .select('welcome_dm_sent_at')
    .eq('user_id', userId)
    .eq('slack_team_id', slackTeamId)
    .maybeSingle();

  if (integration?.welcome_dm_sent_at) {
    console.log('[WELCOME_DM] Already sent for user:', userId, '— skipping');
    return;
  }

  const botToken = Deno.env.get('SLACK_BOT_TOKEN');
  if (!botToken) {
    console.warn('[WELCOME_DM] SLACK_BOT_TOKEN not configured — skipping');
    return;
  }

  // Detect audience: leader > member
  const audience = await detectAudience(serviceClient, userId);
  console.log('[WELCOME_DM] Audience for user', userId, '=', audience);

  // Fetch first name from profile
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('full_name')
    .eq('user_id', userId)
    .maybeSingle();
  const firstName = (profile?.full_name?.split(' ')[0] ?? '').trim();
  const greeting = firstName ? `Olá, ${firstName} 👋` : 'Olá 👋';

  const cmds = commandsForAudience(audience);
  const cmdLines = cmds.map(c => `• \`${c.cmd}\` — ${c.desc}`).join('\n');

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${greeting}*\nSua conta Rhitmo está conectada ao Slack. Tudo pronto pra começar.`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Comandos disponíveis pra você:*\n${cmdLines}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '🌀 Conversar com a Rhitmo' },
          action_id: 'start_rhitmo_chat',
          style: 'primary',
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '🔒 Suas conversas comigo aqui são privadas. Em canais públicos, eu só processo mensagens onde sou mencionado.',
        },
      ],
    },
  ];

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel: slackUserId,
      text: `${greeting} Sua conta Rhitmo está conectada ao Slack.`,
      blocks,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error('[WELCOME_DM] chat.postMessage failed:', data.error, data);
    return; // Don't mark as sent — let it retry on next reconnect
  }

  console.log('[WELCOME_DM] Sent successfully to', slackUserId);

  // Mark as sent (idempotency)
  const { error: updErr } = await serviceClient
    .from('slack_integrations')
    .update({ welcome_dm_sent_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('slack_team_id', slackTeamId);

  if (updErr) {
    console.error('[WELCOME_DM] Failed to mark as sent:', updErr);
  }
}

async function detectAudience(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<'leader' | 'member'> {
  // Leader if: owns an active workspace OR is leader_user_id of any team
  const { data: ownedWs } = await serviceClient
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (ownedWs) return 'leader';

  const { data: ledTeam } = await serviceClient
    .from('teams')
    .select('id')
    .eq('leader_user_id', userId)
    .limit(1)
    .maybeSingle();

  if (ledTeam) return 'leader';

  return 'member';
}
