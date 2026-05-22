// Convida (ou promove) um HR Admin para um workspace.
// Autorização: caller precisa ser super admin OU Owner do workspace OU HR Admin existente do workspace.
// Caso o e-mail ainda não tenha conta, dispara convite via Supabase Auth Admin com redirect /hr.
// Caso o usuário já exista, apenas adiciona ao array hr_admin_ids via RPC manage_hr_admin.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const { email, name, workspace_id } = await req.json();
    if (!email || !workspace_id) throw new Error('email e workspace_id são obrigatórios');

    const normalizedEmail = String(email).trim().toLowerCase();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1) Verifica usuário autenticado.
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) throw new Error('Não autorizado');
    const callerId = userData.user.id;

    // 2) Autorização: super admin OU owner OU hr_admin do workspace.
    const { data: ws, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .select('id, name, owner_id, hr_admin_ids')
      .eq('id', workspace_id)
      .maybeSingle();
    if (wsError || !ws) throw new Error('Workspace não encontrado');

    const { data: isSuperAdmin } = await supabaseUser.rpc('check_is_admin');
    const isOwner = ws.owner_id === callerId;
    const isExistingHR = Array.isArray(ws.hr_admin_ids) && ws.hr_admin_ids.includes(callerId);

    if (!isSuperAdmin && !isOwner && !isExistingHR) {
      throw new Error('Sem permissão para gerenciar HR Admins deste workspace');
    }

    // 3) Procura usuário existente por e-mail.
    const { data: existing } = await supabaseAdmin
      .from('auth_users_view' as any)
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle()
      .then((r) => r, () => ({ data: null }));

    let targetUserId: string | null = (existing as { id?: string } | null)?.id ?? null;

    if (!targetUserId) {
      // Fallback: busca via admin.listUsers (mais robusto).
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);
      targetUserId = match?.id ?? null;
    }

    let invited = false;
    if (!targetUserId) {
      // Cria conta + envia convite com redirect para /hr.
      const { data: invitation, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
          data: { full_name: name ?? null, assigned_plan: 'enterprise' },
          redirectTo: 'https://rhitmo.co/hr',
        });
      if (inviteError) throw new Error(inviteError.message);
      targetUserId = invitation.user?.id ?? null;
      invited = true;
    }

    if (!targetUserId) throw new Error('Não foi possível resolver o usuário-alvo');

    // 4) Promove a HR Admin (RPC com autorização espelhada).
    const { error: promoteError } = await supabaseUser.rpc('manage_hr_admin', {
      _workspace_id: workspace_id,
      _user_id: targetUserId,
      _action: 'add',
    });
    if (promoteError) throw new Error(promoteError.message);

    return new Response(
      JSON.stringify({ ok: true, invited, user_id: targetUserId, workspace: ws.name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
