import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { emit } from "../_shared/emit.ts";
import { createLogger, getOrCreateRequestId } from "../_shared/logger.ts";
import { flag } from "../_shared/featureFlags.ts";

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

  // Onda 4.5: USE_EVENT_BUS_FOR_REVIEW_SHARED (default true)
  // = true  → email vai pelo bus (template review-shared via send-transactional-email)
  // = false → mantém Resend direto (rollback de emergência)
  const useEventBus = flag('USE_EVENT_BUS_FOR_REVIEW_SHARED', true);

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
      .select('id, title, period_type, created_at, member_id')
      .eq('id', reviewId)
      .single();

    if (reviewErr || !review) {
      throw new Error(`Review não encontrada: ${reviewErr?.message}`);
    }

    const { data: member, error: memberErr } = await supabaseAdmin
      .from('team_members')
      .select('name, email, team_id, linked_user_id')
      .eq('id', review.member_id)
      .single();

    if (memberErr || !member || !member.email) {
      throw new Error(`Membro não encontrado ou sem email: ${memberErr?.message}`);
    }

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

    const periodLabel = review.period_type === 'manual' ? review.title : review.period_type;
    const formattedDate = new Date(review.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const reviewLink = `https://rhitmo.co/review/${reviewId}`;

    const channels: Array<'inapp' | 'slack' | 'email'> = ['inapp', 'slack'];
    if (useEventBus) channels.push('email');

    await emit(supabaseAdmin, {
      type: 'review.shared',
      workspace_id: team?.workspace_id ?? null,
      target_user_id: member.linked_user_id ?? null,
      channels,
      payload: {
        review_id: reviewId,
        review_title: review.title,
        period: periodLabel,
        // Campos consumidos pelo template review-shared.tsx:
        memberName: member.name,
        managerName,
        periodLabel,
        formattedDate,
        reviewLink,
        // Garantia: dispatcher pode resolver o destinatário sem buscar auth
        recipient_email: member.email,
      },
    });

    // Rollback path — mantém Resend direto se a flag estiver desligada.
    let emailId: string | null = null;
    if (!useEventBus) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        throw new Error('RESEND_API_KEY não configurada (flag USE_EVENT_BUS_FOR_REVIEW_SHARED=false)');
      }
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
          html: `<p>Olá ${member.name}, ${managerName} compartilhou sua avaliação. <a href="${reviewLink}">Ver avaliação</a></p>`,
        }),
      });
      if (!resendResponse.ok) {
        const errorData = await resendResponse.json();
        throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
      }
      const emailData = await resendResponse.json();
      emailId = emailData.id;
      log.info('email_sent_legacy', { resend_id: emailData.id });
    } else {
      log.info('email_via_bus', { event_type: 'review.shared' });
    }

    return new Response(
      JSON.stringify({ success: true, emailId, requestId, channel: useEventBus ? 'bus' : 'resend' }),
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
