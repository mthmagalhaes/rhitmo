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

  // O e-mail sempre sai pelo bus de eventos (template review-shared),
  // entregue pela infraestrutura de e-mail gerenciada da Lovable.

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

    const channels: Array<'inapp' | 'slack' | 'email'> = ['inapp', 'slack', 'email'];

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

    log.info('email_via_bus', { event_type: 'review.shared' });

    return new Response(
      JSON.stringify({ success: true, requestId, channel: 'bus' }),
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
