import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewId } = await req.json();
    if (!reviewId) {
      return new Response(
        JSON.stringify({ error: 'reviewId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch review
    const { data: review, error: reviewErr } = await supabaseAdmin
      .from('performance_reviews')
      .select('id, title, period_type, acknowledged_at, member_id')
      .eq('id', reviewId)
      .single();

    if (reviewErr || !review) {
      throw new Error(`Review não encontrada: ${reviewErr?.message}`);
    }

    // Fetch member name
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('name, team_id')
      .eq('id', review.member_id)
      .single();

    if (!member) {
      throw new Error('Membro não encontrado');
    }

    // Fetch manager email via workspace owner
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('workspace_id')
      .eq('id', member.team_id)
      .single();

    if (!team) throw new Error('Time não encontrado');

    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('owner_id')
      .eq('id', team.workspace_id)
      .single();

    if (!workspace) throw new Error('Workspace não encontrado');

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(workspace.owner_id);
    if (!authUser?.user?.email) {
      throw new Error('Email do líder não encontrado');
    }

    const managerName = authUser.user.user_metadata?.full_name || 'Líder';
    const managerEmail = authUser.user.email;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    const acknowledgedDate = review.acknowledged_at
      ? new Date(review.acknowledged_at).toLocaleDateString('pt-BR', {
          day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : 'agora';

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Rhitmo <noreply@rhitmo.co>',
        to: [managerEmail],
        subject: `${member.name} confirmou leitura da avaliação`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4F46E5; font-size: 32px; margin: 0;">🎵 <strong>Rhitmo</strong></h1>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">Olá, ${managerName}! 👋</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 20px;">
              <strong>${member.name}</strong> confirmou a leitura da avaliação de desempenho em <strong>${acknowledgedDate}</strong>.
            </p>
            
            <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 30px; border-left: 4px solid #22c55e;">
              <p style="margin: 0; color: #15803d; font-size: 14px;">
                ✅ Leitura confirmada com sucesso
              </p>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://rhitmo.lovable.app/dashboard" 
                 style="background-color: #7C3AED; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                Ver avaliação e comentários →
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              Atenciosamente,<br>
              <strong>Equipe Rhitmo</strong>
            </p>
          </div>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('❌ Erro Resend:', errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailData = await resendResponse.json();
    console.log('✅ Email de confirmação enviado ao líder:', emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro ao enviar notificação de acknowledged:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
