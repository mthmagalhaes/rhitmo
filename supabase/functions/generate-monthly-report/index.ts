import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import jsPDF from 'https://esm.sh/jspdf@2.5.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  workspace_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.workspace_id) {
      return new Response(JSON.stringify({ error: 'workspace_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorization: must be owner OR HR admin of workspace
    const { data: ws } = await admin
      .from('workspaces')
      .select('id, name, owner_id, hr_admin_ids')
      .eq('id', body.workspace_id)
      .maybeSingle();
    if (!ws) {
      return new Response(JSON.stringify({ error: 'Workspace not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const hrIds = (ws.hr_admin_ids as string[] | null) ?? [];
    if (ws.owner_id !== user.id && !hrIds.includes(user.id)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gather metrics
    const { data: metrics } = await admin.rpc('get_hr_dashboard_metrics', {
      _workspace_id: body.workspace_id,
    });
    const m = (metrics ?? {}) as Record<string, any>;

    const monthLabel = new Date().toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });

    // Build PDF with brand styling
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth();

    // Cover — purple band
    pdf.setFillColor(124, 58, 237);
    pdf.rect(0, 0, W, 140, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.text('Rhitmo', 40, 70);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(13);
    pdf.text('Relatório Mensal de Liderança', 40, 96);
    pdf.setFontSize(11);
    pdf.text(monthLabel, 40, 116);

    // Body
    pdf.setTextColor(26, 16, 53);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(ws.name ?? 'Workspace', 40, 180);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(107, 103, 132);
    pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 40, 198);

    // Metrics block
    let y = 240;
    pdf.setTextColor(26, 16, 53);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('Indicadores-chave', 40, y);
    y += 24;

    const rows: Array<[string, string]> = [
      ['Total de líderes', String(m.total_leaders ?? 0)],
      ['Total de liderados', String(m.total_members ?? 0)],
      ['Liderados sem nota recente (30d)', String(m.members_without_recent_feedback ?? 0)],
      ['Liderados sem avaliação recente', String(m.members_without_recent_review ?? 0)],
      ['Cobertura de PDI', `${m.pdi_coverage_percentage ?? 0}%`],
      ['Detecções de viés (7d)', String(m.bias_detected_last_7d ?? 0)],
      ['Avaliações nos últimos 90d', String(m.reviews_last_90_days ?? 0)],
    ];

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    for (const [label, value] of rows) {
      pdf.setTextColor(107, 103, 132);
      pdf.text(label, 40, y);
      pdf.setTextColor(26, 16, 53);
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, W - 40, y, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      // separator
      pdf.setDrawColor(236, 232, 245);
      pdf.line(40, y + 6, W - 40, y + 6);
      y += 22;
    }

    // Top leaders
    y += 10;
    pdf.setTextColor(26, 16, 53);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('Atividade dos líderes (30 dias)', 40, y);
    y += 22;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    const leaders = (m.notes_per_leader_last_30d as Array<any>) ?? [];
    if (leaders.length === 0) {
      pdf.setTextColor(107, 103, 132);
      pdf.text('Sem atividade no período.', 40, y);
      y += 18;
    } else {
      for (const l of leaders.slice(0, 10)) {
        pdf.setTextColor(26, 16, 53);
        pdf.text(`• ${l.manager_name ?? 'Líder'} — ${l.note_count ?? 0} notas / ${l.member_count ?? 0} liderados`, 40, y);
        y += 16;
        if (y > 760) {
          pdf.addPage();
          y = 60;
        }
      }
    }

    // Footer
    pdf.setDrawColor(236, 232, 245);
    pdf.line(40, 790, W - 40, 790);
    pdf.setTextColor(196, 192, 208);
    pdf.setFontSize(9);
    pdf.text('Rhitmo • AI-Native Leadership Partner', 40, 805);

    const arrayBuffer = pdf.output('arraybuffer') as ArrayBuffer;
    const bytes = new Uint8Array(arrayBuffer);

    // Upload to private bucket
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `${body.workspace_id}/monthly-${ts}.pdf`;
    const { error: upErr } = await admin.storage
      .from('monthly-reports')
      .upload(path, bytes, {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (upErr) {
      console.error('[generate-monthly-report] upload failed', upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create signed URL (valid 7 days)
    const { data: signed, error: signErr } = await admin.storage
      .from('monthly-reports')
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signErr || !signed) {
      return new Response(JSON.stringify({ error: 'Could not sign URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, path, url: signed.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[generate-monthly-report] fatal', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
