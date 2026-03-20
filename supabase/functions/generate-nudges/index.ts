import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface NudgeInput {
  leader_id: string;
  member_id: string;
  nudge_type: string;
  message: string;
  action_url: string;
  severity: 'info' | 'warning' | 'urgent';
}

async function generateNoFeedbackNudges(): Promise<NudgeInput[]> {
  const nudges: NudgeInput[] = [];

  // Get all active members with their leader (workspace owner) and last feedback date
  const { data: members, error } = await supabase.rpc('get_all_members_feedback_status');
  
  // Fallback: raw query if RPC doesn't exist
  if (error) {
    console.log('RPC not found, using direct query');
    const { data: rawMembers, error: rawError } = await supabase
      .from('team_members')
      .select(`
        id,
        name,
        team_id,
        teams!inner (
          workspace_id,
          workspaces!inner (
            owner_id,
            is_active
          )
        )
      `);

    if (rawError || !rawMembers) {
      console.error('Error fetching members:', rawError);
      return nudges;
    }

    for (const member of rawMembers) {
      const workspace = (member as any).teams?.workspaces;
      if (!workspace?.is_active) continue;

      const leaderId = workspace.owner_id;

      // Get last feedback for this member
      const { data: lastFeedback } = await supabase
        .from('feedbacks')
        .select('occurred_at')
        .eq('member_id', member.id)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastFeedbackDate = lastFeedback?.occurred_at;
      
      if (!lastFeedbackDate) {
        // Never received feedback — check if member was created > 14 days ago
        const { data: memberDetail } = await supabase
          .from('team_members')
          .select('created_at')
          .eq('id', member.id)
          .single();
        
        const daysSinceCreated = memberDetail
          ? Math.floor((Date.now() - new Date(memberDetail.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        if (daysSinceCreated >= 14) {
          nudges.push({
            leader_id: leaderId,
            member_id: member.id,
            nudge_type: 'no_feedback_ever',
            message: `${member.name} ainda não recebeu nenhum feedback`,
            action_url: `/member/${member.id}`,
            severity: 'warning',
          });
        }
        continue;
      }

      const daysSince = Math.floor(
        (Date.now() - new Date(lastFeedbackDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSince >= 60) {
        nudges.push({
          leader_id: leaderId,
          member_id: member.id,
          nudge_type: 'no_feedback_60d',
          message: `Faz ${daysSince} dias sem feedback para ${member.name}`,
          action_url: `/member/${member.id}`,
          severity: 'urgent',
        });
      } else if (daysSince >= 30) {
        nudges.push({
          leader_id: leaderId,
          member_id: member.id,
          nudge_type: 'no_feedback_30d',
          message: `Faz ${daysSince} dias sem feedback para ${member.name}`,
          action_url: `/member/${member.id}`,
          severity: 'info',
        });
      }
    }

    return nudges;
  }

  return nudges;
}

async function generateNoPDINudges(): Promise<NudgeInput[]> {
  const nudges: NudgeInput[] = [];

  const { data: members, error } = await supabase
    .from('team_members')
    .select(`
      id,
      name,
      created_at,
      teams!inner (
        workspace_id,
        workspaces!inner (
          owner_id,
          is_active
        )
      )
    `);

  if (error || !members) {
    console.error('Error fetching members for PDI:', error);
    return nudges;
  }

  for (const member of members) {
    const workspace = (member as any).teams?.workspaces;
    if (!workspace?.is_active) continue;

    // Only check members created > 30 days ago
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(member.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreated < 30) continue;

    const leaderId = workspace.owner_id;

    // Check if member has any development plan
    const { count } = await supabase
      .from('development_plans')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', member.id);

    if (!count || count === 0) {
      nudges.push({
        leader_id: leaderId,
        member_id: member.id,
        nudge_type: 'pending_pdi',
        message: `${member.name} ainda não tem PDI definido`,
        action_url: `/member/${member.id}`,
        severity: 'info',
      });
    }
  }

  return nudges;
}

async function saveNudges(nudges: NudgeInput[]): Promise<number> {
  let created = 0;

  for (const nudge of nudges) {
    // Deduplicate: skip if active nudge of same type+member exists
    const { data: existing } = await supabase
      .from('leader_nudges')
      .select('id')
      .eq('leader_id', nudge.leader_id)
      .eq('nudge_type', nudge.nudge_type)
      .eq('member_id', nudge.member_id)
      .is('dismissed_at', null)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase
      .from('leader_nudges')
      .insert({
        leader_id: nudge.leader_id,
        member_id: nudge.member_id,
        nudge_type: nudge.nudge_type,
        message: nudge.message,
        action_url: nudge.action_url,
        severity: nudge.severity,
      });

    if (error) {
      console.error('Error creating nudge:', error);
    } else {
      created++;
    }
  }

  return created;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating nudges...');

    const [feedbackNudges, pdiNudges] = await Promise.all([
      generateNoFeedbackNudges(),
      generateNoPDINudges(),
    ]);

    const allNudges = [...feedbackNudges, ...pdiNudges];
    console.log(`Found ${allNudges.length} potential nudges`);

    const created = await saveNudges(allNudges);

    return new Response(
      JSON.stringify({
        success: true,
        nudges_found: allNudges.length,
        nudges_created: created,
        breakdown: {
          no_feedback: feedbackNudges.length,
          pending_pdi: pdiNudges.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error generating nudges:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
