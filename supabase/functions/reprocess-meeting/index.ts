import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Split a large WAV into chunks and transcribe each via Whisper, then join.
 * Returns the full transcription text.
 */
async function transcribeWavChunked(
  buffer: ArrayBuffer,
  openaiApiKey: string,
): Promise<string> {
  const view = new DataView(buffer);
  const numChannels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // Find "data" chunk
  let dataOffset = 12;
  let dataSize = 0;
  while (dataOffset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(dataOffset), view.getUint8(dataOffset + 1),
      view.getUint8(dataOffset + 2), view.getUint8(dataOffset + 3),
    );
    const chunkSize = view.getUint32(dataOffset + 4, true);
    if (chunkId === 'data') {
      dataSize = chunkSize;
      dataOffset += 8;
      break;
    }
    dataOffset += 8 + chunkSize;
  }
  if (dataSize === 0) throw new Error('No data chunk found in WAV');

  const MAX_CHUNK_DATA = 23 * 1024 * 1024; // ~23MB data per chunk (+ 44B header)
  const alignedMax = Math.floor(MAX_CHUNK_DATA / blockAlign) * blockAlign;
  const numChunks = Math.ceil(dataSize / alignedMax);
  console.log(`WAV chunked transcription: ${numChunks} chunks, sampleRate=${sampleRate}, channels=${numChannels}, bps=${bitsPerSample}`);

  const transcriptions: string[] = [];

  for (let c = 0; c < numChunks; c++) {
    const chunkStart = c * alignedMax;
    const chunkDataSize = Math.min(alignedMax, dataSize - chunkStart);

    // Build a valid WAV for this chunk
    const chunkBuffer = new ArrayBuffer(44 + chunkDataSize);
    const cv = new DataView(chunkBuffer);
    cv.setUint32(0, 0x52494646, false); // RIFF
    cv.setUint32(4, 36 + chunkDataSize, true);
    cv.setUint32(8, 0x57415645, false); // WAVE
    cv.setUint32(12, 0x666d7420, false); // fmt
    cv.setUint32(16, 16, true);
    cv.setUint16(20, 1, true); // PCM
    cv.setUint16(22, numChannels, true);
    cv.setUint32(24, sampleRate, true);
    cv.setUint32(28, sampleRate * blockAlign, true);
    cv.setUint16(32, blockAlign, true);
    cv.setUint16(34, bitsPerSample, true);
    cv.setUint32(36, 0x64617461, false); // data
    cv.setUint32(40, chunkDataSize, true);
    new Uint8Array(chunkBuffer, 44).set(new Uint8Array(buffer, dataOffset + chunkStart, chunkDataSize));

    console.log(`Chunk ${c + 1}/${numChunks}: ${(chunkBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`);

    const form = new FormData();
    form.append('file', new Blob([chunkBuffer], { type: 'audio/wav' }), `chunk${c}.wav`);
    form.append('model', 'whisper-1');
    form.append('language', 'pt');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}` },
      body: form,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Whisper chunk ${c + 1} error ${resp.status}: ${errText}`);
    }

    const result = await resp.json();
    if (result.text) transcriptions.push(result.text);
    console.log(`Chunk ${c + 1} done: ${result.text?.length || 0} chars`);
  }

  return transcriptions.join(' ');
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

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Auth — accept service role key or user JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
    if (!isServiceRole) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await authClient.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const { transcriptId } = await req.json();
    if (!transcriptId) {
      return new Response(
        JSON.stringify({ success: false, error: 'transcriptId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (transcript.processing_status === 'completed') {
      return new Response(
        JSON.stringify({ success: false, error: 'Transcript already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (transcript.processing_status !== 'error') {
      return new Response(
        JSON.stringify({ success: false, error: `Cannot reprocess: status is '${transcript.processing_status}'` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // The transcript field contains either a storage file path or a legacy public URL
    const audioRef = transcript.transcript;
    if (!audioRef) {
      await supabase
        .from('meeting_transcripts')
        .update({ error_message: 'Nenhuma referência de áudio encontrada.' } as Record<string, unknown>)
        .eq('id', transcriptId);
      return new Response(
        JSON.stringify({ success: false, error: 'No audio reference found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Download audio — storage path or legacy URL
    let audioBlob: Blob;
    const isLegacyUrl = audioRef.startsWith('http');

    if (isLegacyUrl) {
      console.log('Legacy URL, trying fetch:', audioRef);
      const resp = await fetch(audioRef);
      if (!resp.ok) {
        const pathMatch = audioRef.match(/meeting-recordings\/(.+)$/);
        if (pathMatch) {
          console.log('Fallback to storage download:', pathMatch[1]);
          const { data, error } = await supabase.storage.from('meeting-recordings').download(pathMatch[1]);
          if (error || !data) {
            const errMsg = 'Não foi possível baixar o áudio do storage.';
            await supabase.from('meeting_transcripts').update({ error_message: errMsg } as Record<string, unknown>).eq('id', transcriptId);
            return new Response(JSON.stringify({ success: false, error: errMsg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          audioBlob = data;
        } else {
          const errMsg = 'URL legada inacessível.';
          await supabase.from('meeting_transcripts').update({ error_message: errMsg } as Record<string, unknown>).eq('id', transcriptId);
          return new Response(JSON.stringify({ success: false, error: errMsg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else {
        audioBlob = await resp.blob();
      }
    } else {
      console.log('Storage path download:', audioRef);
      const { data, error } = await supabase.storage.from('meeting-recordings').download(audioRef);
      if (error || !data) {
        const errMsg = `Download falhou: ${error?.message || 'unknown'}`;
        await supabase.from('meeting_transcripts').update({ error_message: errMsg } as Record<string, unknown>).eq('id', transcriptId);
        return new Response(JSON.stringify({ success: false, error: errMsg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      audioBlob = data;
    }

    console.log('Audio file size:', audioBlob.size);

    const WHISPER_MAX = 24 * 1024 * 1024;
    const ext = audioRef.includes('.mp3') ? 'mp3' : audioRef.includes('.wav') ? 'wav' : 'webm';
    let transcriptionText: string;

    if (audioBlob.size <= WHISPER_MAX) {
      // Single Whisper call
      console.log('Single Whisper call...');
      const mimeType = ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : 'audio/webm';
      const form = new FormData();
      form.append('file', new Blob([await audioBlob.arrayBuffer()], { type: mimeType }), `audio.${ext}`);
      form.append('model', 'whisper-1');
      form.append('language', 'pt');

      const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}` },
        body: form,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('Whisper error:', resp.status, errText);
        const errMsg = `Whisper API error: ${resp.status}`;
        await supabase.from('meeting_transcripts').update({ processing_status: 'error', error_message: errMsg } as Record<string, unknown>).eq('id', transcriptId);
        return new Response(JSON.stringify({ success: false, error: errMsg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      transcriptionText = (await resp.json()).text;
    } else if (ext === 'wav') {
      // WAV too large — split into chunks and transcribe each
      console.log(`WAV ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB > limit, chunking...`);
      try {
        transcriptionText = await transcribeWavChunked(await audioBlob.arrayBuffer(), openaiApiKey);
      } catch (chunkErr) {
        console.error('Chunked transcription failed:', chunkErr);
        const errMsg = chunkErr instanceof Error ? chunkErr.message : 'Chunked transcription failed';
        await supabase.from('meeting_transcripts').update({ processing_status: 'error', error_message: errMsg } as Record<string, unknown>).eq('id', transcriptId);
        return new Response(JSON.stringify({ success: false, error: errMsg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } else {
      const errMsg = `Arquivo ${ext.toUpperCase()} de ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB excede limite do Whisper.`;
      await supabase.from('meeting_transcripts').update({ processing_status: 'error', error_message: errMsg } as Record<string, unknown>).eq('id', transcriptId);
      return new Response(JSON.stringify({ success: false, error: errMsg }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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

    // Create feedback note
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
            headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedbackId: feedbackData.id }),
          });
        } catch (bgErr) {
          console.error('Background analysis trigger failed:', bgErr);
        }

        // Trigger classify-note (non-blocking)
        try {
          const classifyResp = await fetch(`${supabaseUrl}/functions/v1/classify-note`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: transcriptionText }),
          });

          if (classifyResp.ok) {
            const classifyData = await classifyResp.json();
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
      JSON.stringify({ success: true, message: 'Transcrição reprocessada com sucesso', transcript_id: transcriptId, feedback_id: feedbackId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('reprocess-meeting error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
