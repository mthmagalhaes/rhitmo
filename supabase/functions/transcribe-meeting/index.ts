import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768): Uint8Array {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

interface TranscribeChunk {
  audio: string;
  index: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chunks, mimeType } = await req.json();
    
    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      throw new Error('No audio chunks provided');
    }

    console.log(`Received ${chunks.length} chunks for transcription, mimeType: ${mimeType}`);

    const transcriptions: string[] = [];

    // Process each chunk sequentially
    for (const chunk of chunks as TranscribeChunk[]) {
      console.log(`Processing chunk ${chunk.index + 1}/${chunks.length}`);
      
      // Process audio in chunks
      const binaryAudio = processBase64Chunks(chunk.audio);
      
      // Determine file extension based on mime type
      let extension = 'webm';
      if (mimeType?.includes('mp4')) {
        extension = 'mp4';
      } else if (mimeType?.includes('ogg')) {
        extension = 'ogg';
      } else if (mimeType?.includes('wav')) {
        extension = 'wav';
      }
      
      // Prepare form data for OpenAI
      const formData = new FormData();
      const blob = new Blob([binaryAudio.buffer as ArrayBuffer], { type: mimeType || 'audio/webm' });
      formData.append('file', blob, `audio_chunk_${chunk.index}.${extension}`);
      formData.append('model', 'whisper-1');
      formData.append('language', 'pt'); // Portuguese default

      // Send to OpenAI Whisper API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API error for chunk ${chunk.index}:`, response.status, errorText);
        throw new Error(`OpenAI API error: ${errorText}`);
      }

      const result = await response.json();
      console.log(`Chunk ${chunk.index + 1} transcribed, text length: ${result.text?.length}`);
      
      if (result.text) {
        transcriptions.push(result.text);
      }
    }

    // Combine all transcriptions
    const fullTranscript = transcriptions.join('\n\n');
    console.log('Full transcription complete, total length:', fullTranscript.length);

    return new Response(
      JSON.stringify({ 
        transcript: fullTranscript,
        chunkCount: chunks.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Meeting transcription error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
