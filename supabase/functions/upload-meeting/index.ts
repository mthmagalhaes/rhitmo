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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    let userId: string | null = null;

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { data: urlData } = supabase.storage
      .from('meeting-recordings')
      .getPublicUrl(filePath);

    // Create meeting_transcripts record
    const { data: transcript, error: dbError } = await supabase
      .from('meeting_transcripts')
      .insert({
        member_id: memberId || null,
        manager_id: userId || null,
        transcript: urlData.publicUrl,
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

        // Check file size limit (25MB for Whisper)
        if (file.size > 25 * 1024 * 1024) {
          console.warn('File exceeds 25MB Whisper limit, skipping transcription');
          await supabase
            .from('meeting_transcripts')
            .update({ processing_status: 'error' })
            .eq('id', transcript.id);
        } else {
          // Send to Whisper
          const whisperForm = new FormData();
          whisperForm.append('file', file, 'audio.webm');
          whisperForm.append('model', 'whisper-1');
          whisperForm.append('language', 'pt');

          const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
            },
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

            // Update meeting_transcripts with text
            await supabase
              .from('meeting_transcripts')
              .update({
                transcript: transcriptionText,
                processing_status: 'completed',
              })
              .eq('id', transcript.id);

            // Generate automatic title
            const now = new Date();
            const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
            const autoTitle = meetingTitle?.trim() || `Transcrição de Áudio - ${dateStr}`;

            // Insert as feedback (note) in the knowledge base
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

                // Trigger background analysis for embedding (non-blocking)
                try {
                  await fetch(`${supabaseUrl}/functions/v1/analyze-feedback-background`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${supabaseServiceKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ feedbackId: feedbackData.id }),
                  });
                  console.log('Background analysis triggered');
                } catch (bgErr) {
                  console.error('Background analysis trigger failed (non-critical):', bgErr);
                }

                // Trigger classify-note for tags and AI title (non-blocking)
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

                    if (classifyData.tags?.length > 0) {
                      updates.tags = classifyData.tags;
                    }
                    if (classifyData.suggestedTitle) {
                      updates.title = classifyData.suggestedTitle;
                    }

                    if (Object.keys(updates).length > 0) {
                      await supabase
                        .from('feedbacks')
                        .update(updates)
                        .eq('id', feedbackData.id);
                      console.log('Classification applied:', updates);
                    }
                  }
                } catch (classifyErr) {
                  console.error('Classification failed (non-critical):', classifyErr);
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
