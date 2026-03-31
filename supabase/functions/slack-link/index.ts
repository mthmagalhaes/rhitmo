import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
