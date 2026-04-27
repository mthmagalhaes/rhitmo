// One-shot backfill: replace truncated (15000 char) feedbacks.content with the
// full meeting transcript for the calling user. Safe to call multiple times.
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin: any = createClient(supabaseUrl, supabaseServiceKey);

    // Find candidate feedbacks (truncated to exactly 15000 chars from recall_bot)
    const { data: candidates, error: cErr } = await admin
      .from('feedbacks')
      .select('id, content, meeting_transcript_id')
      .eq('manager_id', user.id)
      .eq('source', 'recall_bot')
      .not('meeting_transcript_id', 'is', null);

    if (cErr) throw cErr;

    const updates: Array<{ id: string; oldLen: number; newLen: number }> = [];

    for (const f of candidates ?? []) {
      if ((f.content?.length ?? 0) !== 15000) continue;
      const { data: mt } = await admin
        .from('meeting_transcripts')
        .select('transcript')
        .eq('id', f.meeting_transcript_id)
        .maybeSingle();
      if (!mt?.transcript || mt.transcript.length <= 15000) continue;

      const { error: uErr } = await admin
        .from('feedbacks')
        .update({ content: mt.transcript })
        .eq('id', f.id);

      if (!uErr) {
        updates.push({ id: f.id, oldLen: 15000, newLen: mt.transcript.length });
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated: updates.length, details: updates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
