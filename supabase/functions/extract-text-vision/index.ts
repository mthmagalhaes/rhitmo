import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { base64Image, mimeType } = await req.json();

    if (!base64Image) {
      return new Response(
        JSON.stringify({ error: 'base64Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize mimeType - default to image/jpeg if invalid
    let validMimeType = mimeType;
    if (!mimeType || !mimeType.startsWith('image/')) {
      console.warn('Invalid mimeType received:', mimeType, '- defaulting to image/jpeg');
      validMimeType = 'image/jpeg';
    }

    // Validate base64 - check if it's not too short (corrupted/empty)
    if (base64Image.length < 100) {
      console.error('Invalid base64Image: too short or empty, length:', base64Image.length);
      return new Response(
        JSON.stringify({ error: 'Imagem inválida ou corrompida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing image for OCR:', {
      mimeType: validMimeType,
      base64Length: base64Image.length,
      estimatedSizeKB: Math.round(base64Image.length * 0.75 / 1024)
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extraia TODO o texto visível desta imagem. Mantenha a formatação original (parágrafos, listas, quebras de linha). 
                
REGRAS:
- Responda APENAS com o texto extraído, sem comentários ou explicações
- Se não houver texto na imagem, responda apenas: "[Nenhum texto detectado]"
- Preserve a estrutura visual (títulos, listas, parágrafos)`
              },
              {
                type: 'image_url',
                image_url: { 
                  url: `data:${validMimeType};base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4096
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      // Specific error messages based on status code
      let userMessage = 'Falha ao processar imagem';
      if (response.status === 400) {
        userMessage = 'Formato de imagem não suportado';
      } else if (response.status === 413) {
        userMessage = 'Imagem muito grande. Reduza o tamanho.';
      } else if (response.status === 429) {
        userMessage = 'Limite de requisições atingido. Tente novamente.';
      } else if (response.status === 401) {
        userMessage = 'Erro de autenticação com serviço de OCR';
      }
      
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || '';

    console.log('OCR completed, extracted', extractedText.length, 'characters');

    return new Response(
      JSON.stringify({ text: extractedText }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in extract-text-vision:', error);
    
    if (error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'Request timeout' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
