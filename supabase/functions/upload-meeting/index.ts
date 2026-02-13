import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    let userId: string | null = null;

    // Try to authenticate if header is present, but don't block
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    // Use service role client for storage & DB (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const meetingTitle = formData.get('meeting_title') as string | null;
    const meetingUrl = formData.get('meeting_url') as string | null;
    const memberId = formData.get('member_id') as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload file to storage
    const folder = userId || 'anonymous';
    const timestamp = Date.now();
    const filePath = `${folder}/${timestamp}.webm`;

    const { error: uploadError } = await supabase.storage
      .from('meeting-recordings')
      .upload(filePath, file, {
        contentType: file.type || 'audio/webm',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('meeting-recordings')
      .getPublicUrl(filePath);

    // Create meeting_transcripts record (member_id and manager_id are now nullable)
    const { data: transcript, error: dbError } = await supabase
      .from('meeting_transcripts')
      .insert({
        member_id: memberId || null,
        manager_id: userId || null,
        transcript: urlData.publicUrl,
        processing_status: 'pending',
        leader_notes: meetingTitle
          ? `Título: ${meetingTitle}${meetingUrl ? ` | URL: ${meetingUrl}` : ''}`
          : null,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create transcript record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Upload recebido',
        transcript_id: transcript.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('upload-meeting error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
