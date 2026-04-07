import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const filePath = '79a6f679-7920-42e2-9727-1fcee6edbf5a/1775588344866.wav';
    const { data, error } = await supabase.storage.from('meeting-recordings').download(filePath);
    if (error || !data) {
      return new Response(JSON.stringify({ error: 'download failed', detail: error }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const buffer = await data.arrayBuffer();
    const view = new DataView(buffer);
    const info = {
      fileSize: buffer.byteLength,
      fileSizeMB: (buffer.byteLength / 1024 / 1024).toFixed(1),
      numChannels: view.getUint16(22, true),
      sampleRate: view.getUint32(24, true),
      byteRate: view.getUint32(28, true),
      bitsPerSample: view.getUint16(34, true),
      audioFormat: view.getUint16(20, true),
    };

    return new Response(JSON.stringify(info), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
