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

    const { data: isAdmin, error: adminError } = await supabaseUser.rpc('check_is_admin');
    if (adminError) {
      console.error('❌ Admin check error:', adminError);
      throw new Error('Erro ao verificar permissões');
    }
    
    if (!isAdmin) {
      throw new Error('Apenas administradores podem convidar usuários');
    }

    console.log('✅ Admin verified, sending invite...');

    const isHrAdmin = role === 'hr_admin' && workspace_id;
    // Líder = qualquer convite que não seja HR Admin (default do fluxo de convite individual)
    const isLeader = !isHrAdmin;
    const redirectUrl = isHrAdmin
      ? 'https://rhitmo.co/hr'
      : 'https://rhitmo.co/lider/inicio';

    // Convidar usuário via Admin API com plano atribuído
    const { data: invitation, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        full_name: name || null,
        assigned_plan: plan 
      },
      redirectTo: redirectUrl
    });

    if (inviteError) {
      console.error('❌ Invite error:', inviteError);
      throw new Error(inviteError.message);
    }

    console.log('✅ Invite sent successfully with plan:', plan);

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
        message: `Convite enviado para ${email}`,
        assigned_plan: plan
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
