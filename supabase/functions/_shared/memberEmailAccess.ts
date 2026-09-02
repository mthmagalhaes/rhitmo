// Verificação de propriedade antes de qualquer envio de e-mail disparado pelo app.
// O destinatário SEMPRE vem do banco — nunca do corpo da requisição.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface MemberEmailTarget {
  id: string
  name: string
  email: string | null
  teamName: string
  workspaceName: string
  inviteToken: string | null
  leaderName: string
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

export async function getCallerId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data } = await anon.auth.getUser()
  return data.user?.id ?? null
}

/**
 * Carrega o liderado e garante que o chamador é líder do time, dono do
 * workspace ou HR Admin. Retorna null quando não autorizado ou inexistente.
 */
export async function loadMemberForEmail(
  admin: SupabaseClient,
  memberId: string,
  callerId: string,
): Promise<MemberEmailTarget | null> {
  const { data: member } = await admin
    .from('team_members')
    .select('id, name, email, team_id, invite_token')
    .eq('id', memberId)
    .maybeSingle()
  if (!member) return null

  const { data: team } = await admin
    .from('teams')
    .select('id, name, leader_user_id, workspace_id')
    .eq('id', member.team_id)
    .maybeSingle()
  if (!team) return null

  const { data: workspace } = await admin
    .from('workspaces')
    .select('id, name, owner_id, hr_admin_ids')
    .eq('id', team.workspace_id)
    .maybeSingle()
  if (!workspace) return null

  const allowed =
    team.leader_user_id === callerId ||
    workspace.owner_id === callerId ||
    (workspace.hr_admin_ids ?? []).includes(callerId)
  if (!allowed) return null

  let leaderName = 'Seu líder'
  const leaderId = team.leader_user_id ?? workspace.owner_id
  if (leaderId) {
    const { data: authUser } = await admin.auth.admin.getUserById(leaderId)
    leaderName =
      (authUser?.user?.user_metadata?.full_name as string | undefined) ||
      authUser?.user?.email ||
      leaderName
  }

  return {
    id: member.id,
    name: member.name,
    email: member.email,
    teamName: team.name,
    workspaceName: workspace.name,
    inviteToken: member.invite_token,
    leaderName,
  }
}

export const APP_URL = Deno.env.get('PUBLIC_APP_URL') ?? 'https://rhitmo.co'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
