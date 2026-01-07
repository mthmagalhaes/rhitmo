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
    const { feedbackId } = await req.json();
    console.log('RAG processing request for feedback:', feedbackId);

    if (!feedbackId) {
      return new Response(
        JSON.stringify({ error: 'feedbackId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing feedback
    const { data: feedback, error: fetchError } = await supabase
      .from('feedbacks')
      .select('id, content')
      .eq('id', feedbackId)
      .single();

    if (fetchError || !feedback) {
      console.error('Error fetching feedback:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Feedback not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Feedback found, generating embedding...');

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate content for summary display (first 500 chars)
    const summaryText = feedback.content.length > 500 
      ? feedback.content.substring(0, 500) + '...'
      : feedback.content;

    // Truncate content for embedding (max 8000 tokens ~ 32000 chars)
    const maxEmbeddingLength = 32000;
    const embeddingText = feedback.content.length > maxEmbeddingLength
      ? feedback.content.substring(0, maxEmbeddingLength)
      : feedback.content;

    // Generate embedding via OpenAI
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let embeddingResponse;
    try {
      embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: embeddingText,
          model: 'text-embedding-3-small'
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('OpenAI embedding request failed:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Embedding generation failed', code: fetchError.name }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    clearTimeout(timeoutId);

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('OpenAI Embeddings API error:', embeddingResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Embedding generation failed', status: embeddingResponse.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data?.[0]?.embedding;

    if (!embedding) {
      console.error('No embedding in OpenAI response');
      return new Response(
        JSON.stringify({ error: 'Invalid embedding response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Embedding generated, updating feedback...');

    // Update feedback with summary and embedding
    // Format embedding as pgvector expects: '[0.1, 0.2, ...]'
    const embeddingString = `[${embedding.join(',')}]`;

    const { error: updateError } = await supabase
      .from('feedbacks')
      .update({
        summary: summaryText,
        sentiment: null, // NULL para não exibir badges em notas RAG
        coaching_tips: null,
        bias_alert: null,
        embedding: embeddingString
      })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Error updating feedback:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Feedback RAG processing completed successfully');

    return new Response(
      JSON.stringify({ success: true, feedbackId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in analyze-feedback-background:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
