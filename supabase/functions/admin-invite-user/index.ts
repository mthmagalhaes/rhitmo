import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { email, name } = await req.json();
    
    if (!email) {
      throw new Error('Email é obrigatório');
    }

    console.log('📧 Invite request for:', email);

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

    // Convidar usuário via Admin API
    const { data: invitation, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name || null },
      redirectTo: 'https://rhitmo.lovable.app/dashboard'
    });

    if (inviteError) {
      console.error('❌ Invite error:', inviteError);
      throw new Error(inviteError.message);
    }

    console.log('✅ Invite sent successfully');

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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Convite enviado para ${email}` 
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
