// Slack List Channels — gerencia canais monitorados pelo Ambient Mode
// Endpoints (POST único, action no body):
//  - list:  retorna canais combinados com excluded_channel_ids
//  - join:  bot entra em canal público
//  - leave: bot sai de canal

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SLACK_API = 'https://slack.com/api';

async function slackCall(token: string, method: string, params: Record<string, string> = {}) {
  const url = new URL(`${SLACK_API}/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function listAllChannels(token: string) {
  const all: any[] = [];
  let cursor = '';
  do {
    const params: Record<string, string> = {
      limit: '200',
      types: 'public_channel,private_channel',
      exclude_archived: 'true',
    };
    if (cursor) params.cursor = cursor;
    const json = await slackCall(token, 'conversations.list', params);
    if (!json.ok) break;
    all.push(...(json.channels ?? []));
    cursor = json.response_metadata?.next_cursor ?? '';
  } while (cursor);
  return all;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');

    if (!SLACK_BOT_TOKEN) {
      return new Response(JSON.stringify({ error: 'SLACK_BOT_TOKEN not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar JWT do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolver workspace do usuário (owner OU hr_admin)
    const { data: workspaces, error: wsErr } = await admin
      .from('workspaces')
      .select('id, owner_id, hr_admin_ids')
      .or(`owner_id.eq.${userId},hr_admin_ids.cs.{${userId}}`);

    if (wsErr) throw wsErr;
    const workspace = workspaces?.[0];
    if (!workspace) {
      return new Response(JSON.stringify({ error: 'No workspace found for user' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const workspaceId = workspace.id;

    const body = await req.json();
    const action = body?.action ?? 'list';

    if (action === 'list') {
      // Settings atuais
      const { data: settings } = await admin
        .from('workspace_slack_settings')
        .select('autojoin_public_channels, excluded_channel_ids, ambient_mode_enabled')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      const excluded = new Set<string>(settings?.excluded_channel_ids ?? []);
      const channels = await listAllChannels(SLACK_BOT_TOKEN);

      const enriched = channels.map((c) => ({
        id: c.id,
        name: c.name,
        is_private: !!c.is_private,
        is_member: !!c.is_member,
        num_members: c.num_members ?? 0,
        topic: c.topic?.value ?? '',
        is_excluded: excluded.has(c.id),
      }));

      return new Response(
        JSON.stringify({
          channels: enriched,
          settings: {
            autojoin_public_channels: settings?.autojoin_public_channels ?? true,
            ambient_mode_enabled: settings?.ambient_mode_enabled ?? false,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'join') {
      const channelId = body?.channel_id;
      if (!channelId) {
        return new Response(JSON.stringify({ error: 'channel_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const result = await slackCall(SLACK_BOT_TOKEN, 'conversations.join', { channel: channelId });
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'leave') {
      const channelId = body?.channel_id;
      if (!channelId) {
        return new Response(JSON.stringify({ error: 'channel_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const result = await slackCall(SLACK_BOT_TOKEN, 'conversations.leave', { channel: channelId });
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[slack-list-channels] error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
