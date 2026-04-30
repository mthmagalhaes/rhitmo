import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { emit } from "../_shared/emit.ts";
import { createLogger, getOrCreateRequestId } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ functionName: 'notify-review-shared', requestId });

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

    // Fetch review + member
    const { data: review, error: reviewErr } = await supabaseAdmin
      .from('performance_reviews')
      .select('id, title, period_type, created_at, member_id')
      .eq('id', reviewId)
      .single();

    if (reviewErr || !review) {
      throw new Error(`Review não encontrada: ${reviewErr?.message}`);
    }

    // Fetch member info
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('team_members')
      .select('name, email, team_id')
      .eq('id', review.member_id)
      .single();

    if (memberErr || !member || !member.email) {
      throw new Error(`Membro não encontrado ou sem email: ${memberErr?.message}`);
    }

    // Fetch manager name via workspace owner
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('workspace_id')
      .eq('id', member.team_id)
      .single();

    let managerName = 'Seu líder';
    if (team) {
      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .select('owner_id')
        .eq('id', team.workspace_id)
        .single();

      if (workspace) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(workspace.owner_id);
        if (authUser?.user) {
          managerName = authUser.user.user_metadata?.full_name || authUser.user.email || 'Seu líder';
        }
      }
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    const periodLabel = review.period_type === 'manual' ? review.title : review.period_type;
    const formattedDate = new Date(review.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const reviewLink = `https://rhitmo.co/review/${reviewId}`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Rhitmo <noreply@rhitmo.co>',
        to: [member.email],
        subject: `${managerName} compartilhou sua avaliação de desempenho`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4F46E5; font-size: 32px; margin: 0;">🎵 <strong>Rhitmo</strong></h1>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">Olá, ${member.name}! 👋</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 20px;">
              Seu líder <strong>${managerName}</strong> compartilhou sua avaliação formal de desempenho no Rhitmo.
            </p>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 2; list-style: none;">
                <li>📝 <strong>${periodLabel}</strong></li>
                <li>📅 Gerada em ${formattedDate}</li>
                <li>🔓 Disponível no seu portal do colaborador</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${reviewLink}" 
                 style="background-color: #7C3AED; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                Ver minha avaliação →
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center;">
              Você pode adicionar comentários e confirmar a leitura diretamente no Rhitmo.
            </p>
            
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
    log.info('email_sent', { resend_id: emailData.id });

    // Onda 4.3: emit shadow event for in-app + slack notification.
    // Email continues via Resend (existing template). Dispatcher fan-out adds in-app + slack.
    const { data: memberLink } = await supabaseAdmin
      .from('team_members')
      .select('linked_user_id')
      .eq('id', review.member_id)
      .single();

    await emit(supabaseAdmin, {
      type: 'review.shared',
      workspace_id: team?.workspace_id ?? null,
      target_user_id: memberLink?.linked_user_id ?? null,
      channels: ['inapp', 'slack'],
      payload: {
        review_id: reviewId,
        review_title: review.title,
        period: periodLabel,
        manager_name: managerName,
        member_name: member.name,
        review_url: reviewLink,
      },
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id, requestId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
    );
  } catch (error: any) {
    log.error('failed', error);
    return new Response(
      JSON.stringify({ error: error.message, requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
    );
  } finally {
    await log.flush();
  }
};

serve(handler);
