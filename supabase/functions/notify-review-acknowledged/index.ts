import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendAppEmail } from '../_shared/appEmail.ts';

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

    const { data: review, error: reviewErr } = await supabaseAdmin
      .from('performance_reviews')
      .select('id, title, period_type, acknowledged_at, member_id')
      .eq('id', reviewId)
      .single();

    if (reviewErr || !review) {
      throw new Error(`Review não encontrada: ${reviewErr?.message}`);
    }

    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('name, team_id')
      .eq('id', review.member_id)
      .single();

    if (!member) throw new Error('Membro não encontrado');

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

    // Use transactional email system
    const emailResult = await sendAppEmail('review-acknowledged', managerEmail, {
      idempotencyKey: `review-ack-${reviewId}`,
      templateData: {
        managerName,
        memberName: member.name,
        acknowledgedDate: review.acknowledged_at
          ? new Date(review.acknowledged_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })
          : 'agora',
      }
    });

    console.log(emailResult.sent
      ? '✅ Email de confirmação enviado para o líder'
      : '⚠️ Destinatário suprimido — email não enviado');

    return new Response(
      JSON.stringify({ success: true }),
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
