import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { slack_user_id, slack_team_id } = await req.json();

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
