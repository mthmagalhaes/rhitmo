import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emit } from "../_shared/emit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, assigned_plan, role, workspace_id } = await req.json();
    
    if (!email) {
      throw new Error('Email é obrigatório');
    }

    const plan = assigned_plan || 'pulse';
    console.log('📧 Invite request for:', email, 'with plan:', plan);

    // Admin client com service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar se chamador é admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Authorization: aceita Super Admin, OU Owner/HR Admin do workspace_id
    // recebido, OU líder comum sem workspace_id (fluxo legado de
    // auto-provisionamento — convida apenas a si mesmo / liderado do "Meu time").
    const { data: { user: caller }, error: callerErr } = await supabaseUser.auth.getUser();
    if (callerErr || !caller) {
      throw new Error('Não autorizado');
    }

    const { data: isSuperAdmin } = await supabaseUser.rpc('check_is_admin');

    let authorized = !!isSuperAdmin;
    if (!authorized && workspace_id) {
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('owner_id, hr_admin_ids')
        .eq('id', workspace_id)
        .maybeSingle();
      if (ws) {
        const isOwner = ws.owner_id === caller.id;
        const isHr = Array.isArray(ws.hr_admin_ids) && ws.hr_admin_ids.includes(caller.id);
        authorized = isOwner || isHr;
      }
    } else if (!authorized && !workspace_id) {
      // Fluxo legado: líder comum convidando para o próprio "Meu time".
      authorized = true;
    }

    if (!authorized) {
      throw new Error('Você não tem permissão para convidar usuários neste workspace');
    }

    console.log('✅ Authorized as', isSuperAdmin ? 'super_admin' : 'workspace owner/hr_admin/leader', '— sending invite...');

    const isHrAdmin = role === 'hr_admin' && workspace_id;
    // Líder = qualquer convite que não seja HR Admin (default do fluxo de convite individual)
    const isLeader = !isHrAdmin;
    const redirectUrl = isHrAdmin
      ? 'https://rhitmo.co/hr'
      : 'https://rhitmo.co/lider/inicio';

    // Convidar usuário via Admin API com plano atribuído
    let invitation: { user: { id: string; email_confirmed_at?: string | null; last_sign_in_at?: string | null } | null } | null = null;
    let alreadyExisted = false;
    let wasConfirmed = false;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: name || null,
        assigned_plan: plan
      },
      redirectTo: redirectUrl
    });

    if (inviteError) {
      const isEmailExists =
        (inviteError as any)?.code === 'email_exists' ||
        (inviteError as any)?.status === 422 ||
        /already.*registered|already.*exists/i.test(inviteError.message ?? '');

      if (!isEmailExists) {
        console.error('❌ Invite error:', inviteError);
        throw new Error(inviteError.message);
      }

      // Email já existe — buscar o user existente e devolver 200 com flag.
      console.log('ℹ️ Email already exists, resolving existing user:', email);
      let foundUser: any = null;
      let page = 1;
      // listUsers é paginado; em workspaces grandes pode precisar de várias páginas.
      // Limitamos a 10 páginas (10k usuários) por segurança.
      while (page <= 10 && !foundUser) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (listErr) {
          console.error('❌ Could not list users to resolve existing email:', listErr);
          throw new Error('E-mail já cadastrado, mas não consegui localizar o usuário existente.');
        }
        foundUser = (list?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase()) ?? null;
        if ((list?.users?.length ?? 0) < 1000) break;
        page += 1;
      }

      if (!foundUser) {
        throw new Error('E-mail já cadastrado, mas não consegui localizar o usuário existente.');
      }

      invitation = { user: { id: foundUser.id, email_confirmed_at: foundUser.email_confirmed_at, last_sign_in_at: foundUser.last_sign_in_at } };
      alreadyExisted = true;
      wasConfirmed = !!(foundUser.email_confirmed_at || foundUser.last_sign_in_at);
      console.log('✅ Resolved existing user:', foundUser.id, 'confirmed:', wasConfirmed);
    } else {
      invitation = inviteData as any;
      console.log('✅ Invite sent successfully with plan:', plan);
    }

    // Se HR Admin, adicionar ao workspace
    if (isHrAdmin && invitation?.user?.id) {
      const { error: hrError } = await supabaseAdmin.rpc('manage_hr_admin', {
        _workspace_id: workspace_id,
        _user_id: invitation.user.id,
        _action: 'add',
      });
      if (hrError) {
        console.warn('⚠️ Could not add HR admin to workspace:', hrError);
      } else {
        console.log('✅ HR Admin added to workspace:', workspace_id);
      }
    }

    // Se Líder: provisionar workspace + team automaticamente para que ele
    // já caia logado num app funcional (sem essa etapa, /lider/inicio fica vazio
    // e o usuário não tem como começar — foi o caso da Ana Campos / Fapeduca).
    // Só auto-provisiona workspace+time quando o líder está sendo convidado
    // SEM workspace destino (fluxo legado de auto-cadastro). Quando workspace_id
    // é informado (ex.: HR Admin convidando líder pro time existente), o líder
    // entra naquele workspace — provisionar outro cria workspaces órfãos e quebra
    // o status do time na aba Times.
    if (isLeader && invitation?.user?.id && !workspace_id && !alreadyExisted) {
      try {
        const workspaceName = (name && name.trim().length > 0)
          ? `Workspace de ${name.trim().split(' ')[0]}`
          : (email.split('@')[1]?.split('.')[0] || 'Meu Workspace');

        const { data: ws, error: wsError } = await supabaseAdmin
          .from('workspaces')
          .insert({
            name: workspaceName,
            owner_id: invitation.user.id,
            plan_tier: plan,
            is_active: true,
          })
          .select('id')
          .single();

        if (wsError) {
          console.warn('⚠️ Could not auto-create leader workspace:', wsError);
        } else if (ws) {
          const { error: teamError } = await supabaseAdmin
            .from('teams')
            .insert({
              name: 'Meu time',
              leader_user_id: invitation.user.id,
              workspace_id: ws.id,
            });
          if (teamError) {
            console.warn('⚠️ Could not auto-create leader team:', teamError);
          } else {
            console.log('✅ Leader workspace + team provisioned:', ws.id);
          }
        }
      } catch (bootstrapErr) {
        console.warn('⚠️ Leader bootstrap exception:', bootstrapErr);
      }
    }

    // Atualizar status na waitlist
    const { error: updateError } = await supabaseAdmin
      .from('waitlist_leads')
      .update({ status: 'invited' })
      .eq('email', email);

    if (updateError) {
      console.warn('⚠️ Could not update waitlist status:', updateError);
      // Não falhar por isso
    }

    console.log('✅ User invited:', email);

    // Onda 4.3 Fluxo C: registra evento member.invited no Event Bus.
    // Email do convite continua via Supabase Auth (template nativo).
    // O bus serve para auditoria e futuras integrações (in-app, slack).
    await emit(supabaseAdmin, {
      type: 'member.invited',
      workspace_id: workspace_id ?? null,
      target_user_id: invitation?.user?.id ?? null,
      channels: ['inapp'],
      payload: {
        email,
        name: name ?? null,
        assigned_plan: plan,
        role: role ?? 'member',
        delivery_method: 'email',
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: alreadyExisted
          ? (wasConfirmed
              ? `${email} já tem conta na Rhitmo. Vinculei direto.`
              : `${email} já tinha convite pendente. Vinculei como líder.`)
          : `Convite enviado para ${email}`,
        assigned_plan: plan,
        user_id: invitation?.user?.id ?? null,
        already_existed: alreadyExisted,
        was_confirmed: wasConfirmed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error inviting user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
