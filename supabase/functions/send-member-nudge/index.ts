import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { sendAppEmail } from '../_shared/appEmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RequestBody {
  memberId: string;
  memberName: string;
  topic: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate JWT and get user
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!body.memberId || !body.topic || body.topic.length > 500) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service-role client to bypass RLS for cross-user nudge insert
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve member → leader
    const { data: member, error: memberErr } = await adminClient
      .from('team_members')
      .select('id, name, team_id, linked_user_id, teams(leader_user_id)')
      .eq('id', body.memberId)
      .maybeSingle();
    if (memberErr || !member) {
      return new Response(JSON.stringify({ error: 'Member not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorization: requesting user must be the linked member
    if (member.linked_user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const teamRel = (member.teams as unknown as { leader_user_id: string | null } | null) ?? null;
    const leaderId = teamRel?.leader_user_id;
    if (!leaderId) {
      return new Response(JSON.stringify({ error: 'No leader assigned' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = `${body.memberName || member.name}: ${body.topic}`;

    // 1) Always insert in_app nudge
    const { error: insertErr } = await adminClient.from('leader_nudges').insert({
      leader_id: leaderId,
      member_id: body.memberId,
      nudge_type: 'member_request_1on1',
      message,
      severity: 'info',
      action_url: `/member/${body.memberId}`,
    });
    if (insertErr) {
      console.error('[send-member-nudge] Insert nudge error:', insertErr);
    }

    // 2) Resolve preferred channel from user_notification_preferences
    const { data: pref } = await adminClient
      .from('user_notification_preferences')
      .select('channel')
      .eq('user_id', leaderId)
      .eq('notification_type', 'member_request_1on1')
      .maybeSingle();

    const channel = pref?.channel ?? 'in_app';

    // 3) Channel-specific dispatch (best-effort, non-blocking failures)
    if (channel === 'email') {
      try {
        const { data: leader } = await adminClient.auth.admin.getUserById(leaderId);
        const leaderEmail = leader?.user?.email;
        if (leaderEmail) {
          await sendAppEmail('member-conversation-request', leaderEmail, {
            idempotencyKey: `conv-${body.memberId}-${Date.now()}`,
            templateData: {
              memberName: body.memberName || member.name,
              topic: body.topic,
              memberUrl: `${Deno.env.get('PUBLIC_APP_URL') ?? 'https://rhitmo.co'}/member/${body.memberId}`,
            },
          });
        }
      } catch (err) {
        console.warn('[send-member-nudge] Email dispatch failed:', err);
      }
    } else if (channel === 'slack') {
      try {
        await adminClient.functions.invoke('slack-bot', {
          body: {
            type: 'direct_message',
            user_id: leaderId,
            text: `:speech_balloon: *${body.memberName || member.name}* quer conversar com você:\n> ${body.topic}`,
          },
        });
      } catch (err) {
        console.warn('[send-member-nudge] Slack dispatch failed:', err);
      }
    }

    return new Response(JSON.stringify({ success: true, channel }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-member-nudge] fatal error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
