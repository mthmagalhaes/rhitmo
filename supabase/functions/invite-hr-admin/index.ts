// Convida, reenvia ou promove um HR Admin para um workspace.
// Autorização: caller precisa ser super admin OU Owner do workspace OU HR Admin existente do workspace.
// action = 'invite' (default) | 'resend'
//   invite: cria conta (se não existir) + envia convite via Supabase Auth Admin.
//   resend: gera novo link de convite via generateLink (não falha se já existe).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { findUserByEmail } from '../_shared/findUserByEmail.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const body = await req.json();
    const { email, name, workspace_id } = body;
    const action: 'invite' | 'resend' = body.action === 'resend' ? 'resend' : 'invite';
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

    // 3) Procura usuário existente via helper paginado compartilhado.
    let targetUserId: string | null = null;
    {
      const found = await findUserByEmail(supabaseAdmin, normalizedEmail);
      targetUserId = found?.id ?? null;
    }


    let invited = false;
    let resent = false;
    let actionLink: string | null = null;

    if (action === 'resend') {
      // Reenvia gerando um novo link de invite + dispara e-mail transacional próprio.
      // `generateLink` apenas cria a URL — precisamos enviar o e-mail nós mesmos via send-transactional-email.
      const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: normalizedEmail,
        options: { redirectTo: 'https://rhitmo.co/hr' },
      } as any);
      if (linkError) throw new Error(linkError.message);
      targetUserId = targetUserId ?? link?.user?.id ?? null;
      actionLink = (link as any)?.properties?.action_link ?? null;

      if (!actionLink) throw new Error('Não foi possível gerar o link de convite');

      const { error: sendError } = await supabaseAdmin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'hr-admin-welcome',
          recipientEmail: normalizedEmail,
          idempotencyKey: `hr-admin-resend-${targetUserId ?? normalizedEmail}-${Date.now()}`,
          templateData: {
            adminName: name ?? null,
            workspaceName: ws.name,
            dashboardUrl: actionLink,
          },
        },
      });
      if (sendError) throw new Error(`Falha ao enviar e-mail: ${sendError.message}`);
      resent = true;
    } else if (!targetUserId) {
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

    // 4) Promove a HR Admin (idempotente — não falha se já está na lista).
    const { error: promoteError } = await supabaseUser.rpc('manage_hr_admin', {
      _workspace_id: workspace_id,
      _user_id: targetUserId,
      _action: 'add',
    });
    if (promoteError && action !== 'resend') throw new Error(promoteError.message);

    return new Response(
      JSON.stringify({ ok: true, invited, resent, user_id: targetUserId, workspace: ws.name }),
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
