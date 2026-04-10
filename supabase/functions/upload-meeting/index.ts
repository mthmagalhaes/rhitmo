import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Resolve user from Authorization header.
 * Supports:
 * 1. Standard JWT (Bearer eyJ...)
 * 2. Extension token (Bearer ext_...)
 */
async function resolveUser(
  authHeader: string | null,
  supabaseUrl: string,
  supabaseAnonKey: string,
  supabaseServiceKey: string,
): Promise<{ userId: string | null; isExtensionToken: boolean }> {
  if (!authHeader) return { userId: null, isExtensionToken: false };

  const token = authHeader.replace('Bearer ', '');

  // Extension token path
  if (token.startsWith('ext_')) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the token
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data, error } = await supabase
      .from('extension_tokens')
      .select('user_id, id')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .maybeSingle();

    if (error || !data) {
      console.error('Extension token lookup failed:', error?.message);
      return { userId: null, isExtensionToken: true };
    }

    // Update last_used_at (non-blocking)
    supabase
      .from('extension_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {});

    return { userId: data.user_id, isExtensionToken: true };
  }

  // Standard JWT path
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await authClient.auth.getUser();
  return { userId: user?.id || null, isExtensionToken: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    const authHeader = req.headers.get('Authorization');
    const { userId, isExtensionToken } = await resolveUser(
      authHeader, supabaseUrl, supabaseAnonKey, supabaseServiceKey,
    );

    if (isExtensionToken && !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou revogado. Gere um novo token no Rhitmo.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    // Accept both 'file' and 'audio' field names for backwards compatibility
    const file = (formData.get('file') as File | null) || (formData.get('audio') as File | null);
    const meetingTitle = formData.get('meeting_title') as string | null;
    const meetingUrl = formData.get('meeting_url') as string | null;
    const memberId = formData.get('member_id') as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side file size validation (25MB Whisper limit)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      console.error(`File too large: ${sizeMB}MB (limit: 25MB)`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Arquivo muito grande (${sizeMB}MB). O limite é 25MB. Tente uma gravação mais curta.` 
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload file to storage
    const folder = userId || 'anonymous';
    const timestamp = Date.now();
    const fileName = (file as File).name || '';
    let ext = 'webm';
    if (fileName.endsWith('.mp3')) ext = 'mp3';
    else if (fileName.endsWith('.wav')) ext = 'wav';
    else if (file.type?.includes('mpeg')) ext = 'mp3';
    else if (file.type?.includes('wav')) ext = 'wav';
    const filePath = `${folder}/${timestamp}.${ext}`;

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

    // Create meeting_transcripts record
    const { data: transcript, error: dbError } = await supabase
      .from('meeting_transcripts')
      .insert({
        member_id: memberId || null,
        manager_id: userId || null,
        transcript: filePath,
        processing_status: 'processing',
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

    // === Transcription via Whisper ===
    let transcriptionText: string | null = null;
    let feedbackId: string | null = null;

    if (openaiApiKey) {
      try {
        console.log('Starting Whisper transcription, file size:', file.size);

        if (file.size > 25 * 1024 * 1024) {
          console.warn('File exceeds 25MB Whisper limit, skipping transcription');
          await supabase
            .from('meeting_transcripts')
            .update({ processing_status: 'error' })
            .eq('id', transcript.id);
        } else {
          const whisperForm = new FormData();
          whisperForm.append('file', file, `audio.${ext}`);
          whisperForm.append('model', 'whisper-1');
          whisperForm.append('language', 'pt');

          const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiApiKey}` },
            body: whisperForm,
          });

          if (!whisperResponse.ok) {
            const errText = await whisperResponse.text();
            console.error('Whisper API error:', whisperResponse.status, errText);
            await supabase
              .from('meeting_transcripts')
              .update({ processing_status: 'error' })
              .eq('id', transcript.id);
          } else {
            const whisperResult = await whisperResponse.json();
            transcriptionText = whisperResult.text;
            console.log('Transcription done, length:', transcriptionText?.length);

            await supabase
              .from('meeting_transcripts')
              .update({
                transcript: transcriptionText,
                processing_status: 'completed',
              })
              .eq('id', transcript.id);

            const now = new Date();
            const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
            const autoTitle = meetingTitle?.trim() || `Transcrição de Áudio - ${dateStr}`;

            if (transcriptionText && memberId && userId) {
              const { data: feedbackData, error: feedbackError } = await supabase
                .from('feedbacks')
                .insert({
                  member_id: memberId,
                  manager_id: userId,
                  content: transcriptionText,
                  title: autoTitle,
                  source: 'transcription',
                  meeting_transcript_id: transcript.id,
                  type: 'neutral',
                  visibility: 'private_leader',
                  occurred_at: now.toISOString(),
                })
                .select('id')
                .single();

              if (feedbackError) {
                console.error('Feedback insert error:', feedbackError);
              } else {
                feedbackId = feedbackData.id;
                console.log('Feedback created:', feedbackId);

                // Background analysis (non-blocking)
                try {
                  await fetch(`${supabaseUrl}/functions/v1/analyze-feedback-background`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${supabaseServiceKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ feedbackId: feedbackData.id }),
                  });
                } catch (bgErr) {
                  console.error('Background analysis trigger failed:', bgErr);
                }

                // Classify note (non-blocking)
                try {
                  const classifyResponse = await fetch(
                    `${supabaseUrl}/functions/v1/classify-note`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ content: transcriptionText }),
                    }
                  );

                  if (classifyResponse.ok) {
                    const classifyData = await classifyResponse.json();
                    const updates: Record<string, unknown> = {};
                    if (classifyData.tags?.length > 0) updates.tags = classifyData.tags;
                    if (classifyData.suggestedTitle) updates.title = classifyData.suggestedTitle;
                    if (Object.keys(updates).length > 0) {
                      await supabase.from('feedbacks').update(updates).eq('id', feedbackData.id);
                    }
                  }
                } catch (classifyErr) {
                  console.error('Classification failed:', classifyErr);
                }
              }
            }
          }
        }
      } catch (whisperErr) {
        console.error('Transcription process error:', whisperErr);
        await supabase
          .from('meeting_transcripts')
          .update({ processing_status: 'error' })
          .eq('id', transcript.id);
      }
    } else {
      console.warn('OPENAI_API_KEY not set, skipping transcription');
      await supabase
        .from('meeting_transcripts')
        .update({ processing_status: 'pending' })
        .eq('id', transcript.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: transcriptionText ? 'Gravação transcrita e salva como nota' : 'Upload recebido',
        transcript_id: transcript.id,
        feedback_id: feedbackId,
        transcribed: !!transcriptionText,
        feedback_content: transcriptionText || null,
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
