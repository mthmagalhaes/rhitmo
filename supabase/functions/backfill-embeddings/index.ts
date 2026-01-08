import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting backfill process...');

    // 1. Buscar notas sem embedding
    const { data: pendingNotes, error: fetchError } = await supabase
      .from('feedbacks')
      .select('id, content')
      .is('summary', null)
      .is('embedding', null)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    console.log(`Found ${pendingNotes?.length || 0} notes to process`);

    const results: { processed: number; failed: number; errors: Array<{ id: string; error: string }> } = { 
      processed: 0, 
      failed: 0, 
      errors: [] 
    };

    // 2. Processar cada nota
    for (const note of pendingNotes || []) {
      try {
        console.log(`Processing note ${note.id}...`);

        // Gerar summary (primeiros 500 chars)
        const summaryText = note.content.length > 500 
          ? note.content.substring(0, 500) + '...'
          : note.content;

        // Truncar para embedding (max 6000 tokens ~ 24000 chars para text-embedding-3-small)
        const maxEmbeddingLength = 24000;
        const embeddingText = note.content.length > maxEmbeddingLength
          ? note.content.substring(0, maxEmbeddingLength)
          : note.content;

        // Chamar OpenAI Embeddings
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: embeddingText,
            model: 'text-embedding-3-small'
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          throw new Error(`OpenAI error: ${embeddingResponse.status} - ${errorText}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data?.[0]?.embedding;

        if (!embedding) throw new Error('No embedding returned from OpenAI');

        // Atualizar no banco
        const embeddingString = `[${embedding.join(',')}]`;
        const { error: updateError } = await supabase
          .from('feedbacks')
          .update({
            summary: summaryText,
            sentiment: null,
            coaching_tips: null,
            bias_alert: null,
            embedding: embeddingString
          })
          .eq('id', note.id);

        if (updateError) throw updateError;

        results.processed++;
        console.log(`Successfully processed note ${note.id}`);

        // Rate limiting: esperar 200ms entre requests
        await new Promise(r => setTimeout(r, 200));

      } catch (noteError: any) {
        results.failed++;
        results.errors.push({ id: note.id, error: noteError.message });
        console.error(`Failed to process note ${note.id}:`, noteError);
      }
    }

    console.log(`Backfill complete. Processed: ${results.processed}, Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total: pendingNotes?.length || 0,
        ...results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
