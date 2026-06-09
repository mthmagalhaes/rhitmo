import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DispatchBody {
  workspace_id: string;
  include_already_sent?: boolean;
  dry_run?: boolean;
}

interface PendingUser {
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'leader' | 'member' | 'hr_admin' | 'owner';
  team_name: string | null;
  workspace_name: string;
  invite_dispatched_at: string | null;
}

const REDIRECT_URL = 'https://rhitmo.co/auth/callback';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as DispatchBody;
    const { workspace_id, include_already_sent = false, dry_run = false } = body;

    if (!workspace_id) throw new Error('workspace_id obrigatório');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is super admin OR HR Admin / Owner of the target workspace
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) throw new Error('Não autorizado');

    const { data: isAdmin } = await supabaseUser.rpc('check_is_admin');

    // Load workspace (needed for both gate + dispatch)
    const { data: workspace, error: wsErr } = await supabaseAdmin
      .from('workspaces')
      .select('id, name, owner_id, hr_admin_ids')
      .eq('id', workspace_id)
      .single();
    if (wsErr || !workspace) throw new Error('Workspace não encontrado');

    const isOwner = workspace.owner_id === user.id;
    const isHRAdmin = (workspace.hr_admin_ids || []).includes(user.id);

    if (!isAdmin && !isOwner && !isHRAdmin) {
      throw new Error('Apenas super admins, Owner ou HR Admin do workspace podem disparar convites');
    }

    // Workspace already loaded above for permission check

    // Load teams + members for context
    const { data: teamsData } = await supabaseAdmin
      .from('teams')
      .select('id, name, leader_user_id')
      .eq('workspace_id', workspace_id);

    const { data: membersData } = await supabaseAdmin
      .from('team_members')
      .select('id, name, email, linked_user_id, team_id')
      .in('team_id', (teamsData || []).map(t => t.id));

    // Collect candidate user_ids and roles
    const candidates = new Map<string, { role: PendingUser['role']; team_name: string | null }>();

    if (workspace.owner_id) {
      candidates.set(workspace.owner_id, { role: 'owner', team_name: null });
    }
    for (const hrId of (workspace.hr_admin_ids || [])) {
      if (!candidates.has(hrId)) candidates.set(hrId, { role: 'hr_admin', team_name: null });
    }
    for (const team of teamsData || []) {
      if (team.leader_user_id && !candidates.has(team.leader_user_id)) {
        candidates.set(team.leader_user_id, { role: 'leader', team_name: team.name });
      }
    }
    for (const m of membersData || []) {
      if (m.linked_user_id && !candidates.has(m.linked_user_id)) {
        const team = teamsData?.find(t => t.id === m.team_id);
        candidates.set(m.linked_user_id, { role: 'member', team_name: team?.name || null });
      }
    }

    // Fetch auth.users for these candidates
    const candidateIds = Array.from(candidates.keys());
    const { data: { users: allAuthUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const usersById = new Map((allAuthUsers || []).map(u => [u.id, u]));

    const pending: PendingUser[] = [];
    for (const uid of candidateIds) {
      const u = usersById.get(uid);
      if (!u || !u.email) continue;

      const meta = (u.user_metadata || {}) as Record<string, any>;
      const dispatchedAt: string | null = meta.invite_dispatched_at || null;
      const hasSignedIn = !!u.last_sign_in_at;

      // Skip users who already signed in (they have set their password)
      if (hasSignedIn) continue;
      // Skip users who already received invite (unless include_already_sent)
      if (dispatchedAt && !include_already_sent) continue;

      const ctx = candidates.get(uid)!;
      pending.push({
        user_id: uid,
        email: u.email,
        full_name: meta.full_name || null,
        role: ctx.role,
        team_name: ctx.team_name,
        workspace_name: workspace.name,
        invite_dispatched_at: dispatchedAt,
      });
    }

    if (dry_run) {
      return new Response(JSON.stringify({
        pending_count: pending.length,
        pending,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Dispatch invites
    const results: Array<{ email: string; status: 'sent' | 'error' | 'skipped'; message: string }> = [];

    for (const p of pending) {
      try {
        // Generate invite link
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: p.email,
          options: { redirectTo: REDIRECT_URL },
        });
        if (linkErr) throw linkErr;
        const inviteUrl = linkData?.properties?.action_link || REDIRECT_URL;

        // Pick template + data per role
        const templateMap: Record<PendingUser['role'], { templateName: string; data: Record<string, any> }> = {
          leader: {
            templateName: 'leader-welcome',
            data: {
              leaderName: p.full_name || undefined,
              teamName: p.team_name || undefined,
              workspaceName: p.workspace_name,
              dashboardUrl: inviteUrl,
            },
          },
          member: {
            templateName: 'member-welcome',
            data: {
              memberName: p.full_name || undefined,
              teamName: p.team_name || undefined,
              syncUrl: inviteUrl,
            },
          },
          hr_admin: {
            templateName: 'hr-admin-welcome',
            data: {
              adminName: p.full_name || undefined,
              workspaceName: p.workspace_name,
              dashboardUrl: inviteUrl,
            },
          },
          owner: {
            // Owners receive the leader template (they're typically leaders too)
            templateName: 'leader-welcome',
            data: {
              leaderName: p.full_name || undefined,
              workspaceName: p.workspace_name,
              dashboardUrl: inviteUrl,
            },
          },
        };

        const cfg = templateMap[p.role];

        const { error: emailErr } = await supabaseAdmin.functions.invoke('send-transactional-email', {
          body: {
            templateName: cfg.templateName,
            recipientEmail: p.email,
            idempotencyKey: `dispatch-invite-${workspace_id}-${p.user_id}-${Date.now()}`,
            templateData: cfg.data,
          },
        });

        if (emailErr) {
          results.push({ email: p.email, status: 'error', message: emailErr.message || 'Falha ao enfileirar email' });
          continue;
        }

        // Mark dispatched
        const u = usersById.get(p.user_id)!;
        const newMeta = { ...(u.user_metadata || {}), invite_dispatched_at: new Date().toISOString() };
        await supabaseAdmin.auth.admin.updateUserById(p.user_id, { user_metadata: newMeta });

        results.push({ email: p.email, status: 'sent', message: `Convite enviado (${p.role})` });
      } catch (err: any) {
        results.push({ email: p.email, status: 'error', message: err.message || 'Erro desconhecido' });
      }
    }

    const summary = {
      total_candidates: candidateIds.length,
      pending_count: pending.length,
      sent: results.filter(r => r.status === 'sent').length,
      errors: results.filter(r => r.status === 'error').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    };

    console.log('📧 Dispatch summary:', summary);

    return new Response(JSON.stringify({ summary, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ dispatch-bulk-invites error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
