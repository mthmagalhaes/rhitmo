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

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate — accept service role key or user JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if it's a service role key call
    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
    
    if (!isServiceRole) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await authClient.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { transcriptId } = await req.json();
    if (!transcriptId) {
      return new Response(
        JSON.stringify({ success: false, error: 'transcriptId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch transcript record
    const { data: transcript, error: fetchError } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single();

    if (fetchError || !transcript) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transcript not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate: must be in error state
    if (transcript.processing_status === 'completed') {
      return new Response(
        JSON.stringify({ success: false, error: 'Transcript already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (transcript.processing_status !== 'error') {
      return new Response(
        JSON.stringify({ success: false, error: `Cannot reprocess: status is '${transcript.processing_status}'` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The transcript field contains either a storage file path or a legacy public URL
    const audioRef = transcript.transcript;
    if (!audioRef) {
      await supabase
        .from('meeting_transcripts')
        .update({
          error_message: 'URL/path do arquivo de áudio não encontrada no registro.',
        } as Record<string, unknown>)
        .eq('id', transcriptId);

      return new Response(
        JSON.stringify({ success: false, error: 'No audio reference found in transcript field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download audio file — try storage download first, fall back to public URL for legacy records
    let audioBlob: Blob;
    const isLegacyUrl = audioRef.startsWith('http');

    if (isLegacyUrl) {
      console.log('Legacy URL detected, trying direct fetch:', audioRef);
      const audioResponse = await fetch(audioRef);
      if (!audioResponse.ok) {
        // Try to extract path from legacy URL and download via storage
        const pathMatch = audioRef.match(/meeting-recordings\/(.+)$/);
        if (pathMatch) {
          console.log('Falling back to storage download with path:', pathMatch[1]);
          const { data: dlData, error: dlError } = await supabase.storage
            .from('meeting-recordings')
            .download(pathMatch[1]);
          if (dlError || !dlData) {
            const errMsg = 'Não foi possível baixar o arquivo de áudio do storage.';
            await supabase
              .from('meeting_transcripts')
              .update({ error_message: errMsg } as Record<string, unknown>)
              .eq('id', transcriptId);
            return new Response(
              JSON.stringify({ success: false, error: errMsg }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          audioBlob = dlData;
        } else {
          const errMsg = 'Não foi possível baixar o arquivo de áudio (URL legada inacessível).';
          await supabase
            .from('meeting_transcripts')
            .update({ error_message: errMsg } as Record<string, unknown>)
            .eq('id', transcriptId);
          return new Response(
            JSON.stringify({ success: false, error: errMsg }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        audioBlob = await audioResponse.blob();
      }
    } else {
      // New format: file path stored directly
      console.log('Downloading from storage path:', audioRef);
      const { data: dlData, error: dlError } = await supabase.storage
        .from('meeting-recordings')
        .download(audioRef);
      if (dlError || !dlData) {
        const errMsg = `Não foi possível baixar o arquivo de áudio do storage: ${dlError?.message || 'unknown'}`;
        await supabase
          .from('meeting_transcripts')
          .update({ error_message: errMsg } as Record<string, unknown>)
          .eq('id', transcriptId);
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      audioBlob = dlData;
    }

    console.log('Audio file size:', audioBlob.size);

    const WHISPER_MAX = 25 * 1024 * 1024;
    const ext = audioRef.includes('.mp3') ? 'mp3' : audioRef.includes('.wav') ? 'wav' : 'webm';
    let finalBlob = audioBlob;
    let finalExt = ext;
    let finalMime = ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : 'audio/webm';

    // If file exceeds Whisper limit and is WAV, compress by downsampling to mono 16kHz
    if (audioBlob.size > WHISPER_MAX && ext === 'wav') {
      console.log('WAV file exceeds 25MB, compressing via downsampling...');
      try {
        const compressed = await downsampleWav(await audioBlob.arrayBuffer());
        finalBlob = new Blob([compressed], { type: 'audio/wav' });
        console.log(`Compressed WAV: ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB -> ${(finalBlob.size / 1024 / 1024).toFixed(1)}MB`);
        
        if (finalBlob.size > WHISPER_MAX) {
          const errMsg = `Arquivo comprimido ainda excede limite do Whisper (${(finalBlob.size / 1024 / 1024).toFixed(1)}MB).`;
          await supabase
            .from('meeting_transcripts')
            .update({ processing_status: 'error', error_message: errMsg } as Record<string, unknown>)
            .eq('id', transcriptId);
          return new Response(
            JSON.stringify({ success: false, error: errMsg }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (compErr) {
        console.error('WAV compression failed:', compErr);
        const errMsg = `Falha na compressão do WAV: ${compErr instanceof Error ? compErr.message : 'unknown'}`;
        await supabase
          .from('meeting_transcripts')
          .update({ processing_status: 'error', error_message: errMsg } as Record<string, unknown>)
          .eq('id', transcriptId);
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (audioBlob.size > WHISPER_MAX) {
      const errMsg = `Arquivo ${ext.toUpperCase()} de ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB excede limite do Whisper (25MB).`;
      await supabase
        .from('meeting_transcripts')
        .update({ processing_status: 'error', error_message: errMsg } as Record<string, unknown>)
        .eq('id', transcriptId);
      return new Response(
        JSON.stringify({ success: false, error: errMsg, size_mb: (audioBlob.size / 1024 / 1024).toFixed(1) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send to Whisper
    console.log('Sending to Whisper...');

    const whisperForm = new FormData();
    whisperForm.append('file', new Blob([await finalBlob.arrayBuffer()], { type: finalMime }), `audio.${finalExt}`);
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
      const errMsg = `Whisper API error: ${whisperResponse.status}`;
      await supabase
        .from('meeting_transcripts')
        .update({
          processing_status: 'error',
          error_message: errMsg,
        } as Record<string, unknown>)
        .eq('id', transcriptId);

      return new Response(
        JSON.stringify({ success: false, error: errMsg }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const whisperResult = await whisperResponse.json();
    const transcriptionText = whisperResult.text;
    console.log('Transcription done, length:', transcriptionText?.length);

    // Update transcript record
    await supabase
      .from('meeting_transcripts')
      .update({
        transcript: transcriptionText,
        processing_status: 'completed',
        error_message: null,
      } as Record<string, unknown>)
      .eq('id', transcriptId);

    // Create feedback note if member and manager exist
    let feedbackId: string | null = null;
    const memberId = transcript.member_id;
    const managerId = transcript.manager_id;

    if (transcriptionText && memberId && managerId) {
      const now = new Date();
      const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
      const leaderNotes = transcript.leader_notes || '';
      const titleMatch = leaderNotes.match(/Título:\s*([^|]+)/);
      const autoTitle = titleMatch?.[1]?.trim() || `Transcrição Reprocessada - ${dateStr}`;

      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedbacks')
        .insert({
          member_id: memberId,
          manager_id: managerId,
          content: transcriptionText,
          title: autoTitle,
          source: 'transcription',
          meeting_transcript_id: transcriptId,
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

        // Trigger background analysis (non-blocking)
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

        // Trigger classify-note (non-blocking)
        try {
          const classifyResponse = await fetch(`${supabaseUrl}/functions/v1/classify-note`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: transcriptionText }),
          });

          if (classifyResponse.ok) {
            const classifyData = await classifyResponse.json();
            const updates: Record<string, unknown> = {};
            if (classifyData.tags?.length > 0) updates.tags = classifyData.tags;
            if (classifyData.suggestedTitle) updates.title = classifyData.suggestedTitle;

            if (Object.keys(updates).length > 0) {
              await supabase.from('feedbacks').update(updates).eq('id', feedbackData.id);
              console.log('Classification applied:', updates);
            }
          }
        } catch (classifyErr) {
          console.error('Classification failed:', classifyErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transcrição reprocessada com sucesso',
        transcript_id: transcriptId,
        feedback_id: feedbackId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('reprocess-meeting error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
