import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserRow {
  email: string;
  name: string;
  role: 'leader' | 'member' | 'hr_admin';
  workspace: string;
  team: string;
  leader_email?: string;
}

interface ResultRow {
  email: string;
  status: 'ok' | 'error' | 'skipped';
  message: string;
}

interface ExistingUserMetadataRow {
  email?: string | null;
  user_id?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { users } = await req.json() as { users: UserRow[] };

    if (!Array.isArray(users) || users.length === 0) {
      throw new Error('Lista de usuários vazia');
    }
    if (users.length > 100) {
      throw new Error('Máximo de 100 usuários por lote');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: isAdmin } = await supabaseUser.rpc('check_is_admin');
    if (!isAdmin) throw new Error('Apenas super admins podem importar em massa');

    // Pre-fetch workspaces and teams for matching
    const { data: allWorkspaces } = await supabaseAdmin.from('workspaces').select('id, name, owner_id, hr_admin_ids');
    const { data: allTeams } = await supabaseAdmin.from('teams').select('id, name, workspace_id, leader_user_id');

    const wsMap = new Map((allWorkspaces || []).map(w => [w.name.toLowerCase().trim(), w]));
    const teamsByWs = new Map<string, any[]>();
    for (const t of allTeams || []) {
      const list = teamsByWs.get(t.workspace_id) || [];
      list.push(t);
      teamsByWs.set(t.workspace_id, list);
    }

    // Pre-fetch existing users by email
    const { data: existingUsersData } = await supabaseAdmin.rpc('get_all_users_with_metadata');
    const existingByEmail = new Map(
      ((existingUsersData || []) as ExistingUserMetadataRow[]).map((u) => [u.email?.toLowerCase(), u])
    );

    const results: ResultRow[] = [];

    for (const row of users) {
      try {
        const email = row.email?.trim().toLowerCase();
        if (!email) {
          results.push({ email: row.email || '(vazio)', status: 'error', message: 'Email inválido' });
          continue;
        }

        // Find workspace
        const ws = wsMap.get(row.workspace?.toLowerCase().trim());
        if (!ws) {
          results.push({ email, status: 'error', message: `Workspace "${row.workspace}" não encontrado` });
          continue;
        }

        // Invite user if not existing
        let userId: string | null = null;
        const existing = existingByEmail.get(email);

        if (existing) {
          userId = existing.user_id ?? null;
          results.push({ email, status: 'skipped', message: 'Usuário já existe' });
        } else {
          // Silent mode: cria usuário SEM enviar email. O disparo é manual via dispatch-bulk-invites.
          const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: false,
            user_metadata: {
              full_name: row.name || null,
              bulk_onboarded_at: new Date().toISOString(),
              intended_role: row.role,
              intended_workspace: row.workspace,
              intended_team: row.team || null,
              intended_leader_email: row.leader_email || null,
            },
          });
          if (createError) {
            // Race condition: usuário pode ter sido criado em outro lote
            if (createError.message?.includes('already') || createError.message?.includes('registered')) {
              const { data: { users: foundUsers } } = await supabaseAdmin.auth.admin.listUsers();
              const found = foundUsers?.find((u: any) => u.email?.toLowerCase() === email);
              if (found) {
                userId = found.id;
              } else {
                results.push({ email, status: 'error', message: createError.message });
                continue;
              }
            } else {
              results.push({ email, status: 'error', message: createError.message });
              continue;
            }
          } else {
            userId = created?.user?.id || null;
            results.push({ email, status: 'ok', message: 'Usuário criado (sem email)' });
          }
        }

        if (!userId) {
          if (!results.find(r => r.email === email)) {
            results.push({ email, status: 'error', message: 'Não foi possível obter ID do usuário' });
          }
          continue;
        }

        // Process role-specific actions
        if (row.role === 'hr_admin') {
          try {
            await supabaseAdmin.rpc('manage_hr_admin', {
              _workspace_id: ws.id,
              _user_id: userId,
              _action: 'add',
            });
            // Update result message if exists
            const existingResult = results.find(r => r.email === email);
            if (existingResult) {
              existingResult.message += ' + HR Admin atribuído';
              existingResult.status = 'ok';
            }
          } catch (e: any) {
            const existingResult = results.find(r => r.email === email);
            if (existingResult) existingResult.message += ` (erro HR: ${e.message})`;
          }
        }

        if (row.role === 'leader') {
          const teamName = row.team?.trim();
          if (teamName) {
            const wsTeams = teamsByWs.get(ws.id) || [];
            let team = wsTeams.find(t => t.name.toLowerCase().trim() === teamName.toLowerCase());

            if (!team) {
              // Create team
              const { data: newTeam, error: teamErr } = await supabaseAdmin.from('teams').insert({
                name: teamName,
                workspace_id: ws.id,
                leader_user_id: userId,
              }).select().single();
              if (teamErr) {
                const existingResult = results.find(r => r.email === email);
                if (existingResult) existingResult.message += ` (erro time: ${teamErr.message})`;
              } else {
                team = newTeam;
                wsTeams.push(newTeam);
              }
            } else {
              // Update leader
              await supabaseAdmin.from('teams').update({ leader_user_id: userId }).eq('id', team.id);
            }
            const existingResult = results.find(r => r.email === email);
            if (existingResult) {
              existingResult.message += ` + Líder do time "${teamName}"`;
              existingResult.status = 'ok';
            }
          }
        }

        if (row.role === 'member') {
          const teamName = row.team?.trim();
          if (teamName) {
            const wsTeams = teamsByWs.get(ws.id) || [];
            const team = wsTeams.find(t => t.name.toLowerCase().trim() === teamName.toLowerCase());

            if (!team) {
              const existingResult = results.find(r => r.email === email);
              if (existingResult) existingResult.message += ` (time "${teamName}" não encontrado)`;
            } else {
              // Check if already a member
              const { data: existingMember } = await supabaseAdmin
                .from('team_members')
                .select('id')
                .eq('team_id', team.id)
                .eq('email', email)
                .maybeSingle();

              if (!existingMember) {
                const { error: memberErr } = await supabaseAdmin.from('team_members').insert({
                  name: row.name || email.split('@')[0],
                  email: email,
                  role: 'Liderado',
                  team_id: team.id,
                  linked_user_id: userId,
                });
                if (memberErr) {
                  const existingResult = results.find(r => r.email === email);
                  if (existingResult) existingResult.message += ` (erro membro: ${memberErr.message})`;
                } else {
                  const existingResult = results.find(r => r.email === email);
                  if (existingResult) {
                    existingResult.message += ` + Liderado no time "${teamName}"`;
                    existingResult.status = 'ok';
                  }
                }
              } else {
                const existingResult = results.find(r => r.email === email);
                if (existingResult) existingResult.message += ` + Já é membro do time "${teamName}"`;
              }
            }
          }
        }

        // Silent mode: NÃO enviamos email aqui. O admin dispara manualmente via
        // o botão "Disparar convites" em Admin → Estrutura (edge: dispatch-bulk-invites).

        // Ensure there's a result for this email
        if (!results.find(r => r.email === email)) {
          results.push({ email, status: 'ok', message: 'Processado' });
        }

      } catch (rowErr: any) {
        results.push({ email: row.email || '(vazio)', status: 'error', message: rowErr.message });
      }
    }

    const summary = {
      total: users.length,
      ok: results.filter(r => r.status === 'ok').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    console.log('📊 Bulk onboard summary:', summary);

    return new Response(JSON.stringify({ results, summary }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Bulk onboard error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
