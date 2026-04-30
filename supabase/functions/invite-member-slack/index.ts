import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { emit } from '../_shared/emit.ts';
import { flag } from '../_shared/featureFlags.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateStateToken(payload: string): Promise<string> {
  const secret = Deno.env.get('SLACK_SIGNING_SECRET');
  if (!secret) throw new Error('No signing secret configured');

  const b64Encode = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const hexSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${b64Encode(payload)}.${b64Encode(hexSig)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { member_id, member_name, member_email } = body;

    if (!member_id || !member_name || !member_email) {
      return new Response(JSON.stringify({ error: 'member_id, member_name, member_email are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Step 1: Check if member email exists in auth.users
    const { data: authUsers } = await serviceClient.auth.admin.listUsers();
    const existingUser = authUsers?.users?.find(u => u.email?.toLowerCase() === member_email.toLowerCase());
    const hasExistingAccount = !!existingUser;
    console.log(`[INVITE] Account exists for ${member_email}: ${hasExistingAccount}`);

    // Step 2: Lookup Slack user by email
    const botToken = Deno.env.get('SLACK_BOT_TOKEN');
    if (!botToken) {
      return new Response(JSON.stringify({ error: 'Slack bot token not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slackRes = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(member_email)}`, {
      headers: { 'Authorization': `Bearer ${botToken}` },
    });
    const slackData = await slackRes.json();

    if (!slackData.ok) {
      console.log(`[INVITE] Slack lookup failed: ${slackData.error}`);
      if (slackData.error === 'users_not_found') {
        return new Response(JSON.stringify({ success: false, reason: 'not_in_workspace' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: false, reason: 'slack_error', detail: slackData.error }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slackUserId = slackData.user.id;
    console.log(`[INVITE] Slack user found: ${slackUserId}`);

    // Step 3: Generate HMAC state token
    const timestamp = Math.floor(Date.now() / 1000);
    const hasAccountFlag = hasExistingAccount ? '1' : '0';
    const payload = `${slackUserId}:${member_id}:${hasAccountFlag}:${timestamp}`;
    const stateToken = await generateStateToken(payload);

    // Step 4: Get manager name
    const managerName = user.user_metadata?.full_name || user.email || 'Seu líder';

    // Step 5: Build connect URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // Extract project ref from URL for building the app URL
    const connectUrl = `https://rhitmo.co/slack/connect?state=${encodeURIComponent(stateToken)}&member_id=${member_id}`;

    // Step 6: Send DM via Slack
    const blocks = hasExistingAccount
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `👋 Olá ${member_name}! *${managerName}* te adicionou ao time no Rhitmo.`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Conecte sua conta Rhitmo existente ao Slack para:\n✅ Receber notificações de feedbacks e 1:1s\n✅ Usar comandos do Rhitmo direto no Slack\n✅ Ver seu Career Compass e metas',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '🔗 Conectar Conta Rhitmo', emoji: true },
                url: connectUrl,
                style: 'primary',
              },
            ],
          },
        ]
      : [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `👋 Olá ${member_name}! *${managerName}* te adicionou ao Rhitmo.`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Crie sua conta e conecte ao Slack para:\n✅ Receber feedbacks estruturados\n✅ Acessar seu Career Compass personalizado\n✅ Acompanhar metas e PDI\n✅ Notificações inteligentes antes de 1:1s',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '🚀 Criar Conta e Conectar (1min)', emoji: true },
                url: connectUrl,
                style: 'primary',
              },
            ],
          },
        ];

    const dmRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: slackUserId,
        text: `${managerName} te adicionou ao Rhitmo. Clique para conectar sua conta.`,
        blocks,
      }),
    });

    const dmData = await dmRes.json();
    if (!dmData.ok) {
      console.error(`[INVITE] DM failed: ${dmData.error}`);
      return new Response(JSON.stringify({ success: false, reason: 'dm_failed', detail: dmData.error }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[INVITE] DM sent successfully to ${slackUserId}`);

    // Step 7: Insert into pending_slack_invites
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await serviceClient.from('pending_slack_invites').upsert(
      {
        member_id,
        slack_user_id: slackUserId,
        invited_by: user.id,
        member_has_account: hasExistingAccount,
        status: 'sent',
        expires_at: expiresAt,
        reminded_at: null,
        accepted_at: null,
      },
      { onConflict: 'member_id' }
    );

    // Onda 4.5: registra member.invited no Event Bus (auditoria + futuras integrações).
    // Default ON. Para reverter, setar USE_EVENT_BUS_FOR_SLACK_INVITE=false.
    if (flag('USE_EVENT_BUS_FOR_SLACK_INVITE', true)) {
      await emit(serviceClient, {
        type: 'member.invited',
        actor_user_id: user.id,
        target_user_id: hasExistingAccount && existingUser ? existingUser.id : null,
        channels: ['inapp'],
        payload: {
          member_id,
          member_name,
          member_email,
          slack_user_id: slackUserId,
          delivery_method: 'slack',
          has_existing_account: hasExistingAccount,
        },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      has_existing_account: hasExistingAccount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[INVITE] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
