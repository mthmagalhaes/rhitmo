// One-shot backfill: replace truncated (15000 char) feedbacks.content with the
// full meeting transcript. Accepts { email } body and uses service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin: any = createClient(supabaseUrl, supabaseServiceKey);

    let email = 'matheus.magalhaes@fstr.co';
    try {
      const body = await req.json();
      if (body?.email) email = body.email;
    } catch (_) { /* no body */ }

    const { data: userData, error: uErr } = await admin.auth.admin.listUsers();
    if (uErr) throw uErr;
    const user = userData.users.find((u: any) => u.email === email);
    if (!user) {
      return new Response(JSON.stringify({ error: `User ${email} not found` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: candidates, error: cErr } = await admin
      .from('feedbacks')
      .select('id, content, meeting_transcript_id')
      .eq('manager_id', user.id)
      .eq('source', 'recall_bot')
      .not('meeting_transcript_id', 'is', null);

    if (cErr) throw cErr;

    const updates: Array<{ id: string; oldLen: number; newLen: number }> = [];

    for (const f of candidates ?? []) {
      const oldLen = f.content?.length ?? 0;
      if (oldLen !== 15000) continue;
      const { data: mt } = await admin
        .from('meeting_transcripts')
        .select('transcript')
        .eq('id', f.meeting_transcript_id)
        .maybeSingle();
      if (!mt?.transcript || mt.transcript.length <= 15000) continue;

      const { error: upErr } = await admin
        .from('feedbacks')
        .update({ content: mt.transcript })
        .eq('id', f.id);

      if (!upErr) {
        updates.push({ id: f.id, oldLen, newLen: mt.transcript.length });
      }
    }

    return new Response(
      JSON.stringify({ success: true, email, updated: updates.length, details: updates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
