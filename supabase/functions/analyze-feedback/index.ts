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
    const { content, memberId, type } = await req.json();
    console.log('Received feedback analysis request:', { content, memberId, type });

    // Truncar conteúdo muito longo para evitar problemas com tokens
    const maxContentLength = 8000;
    const truncatedContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + "\n\n[...conteúdo truncado para análise...]"
      : content;
    
    console.log('Content length:', content.length, 'Truncated:', truncatedContent.length);

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Inserir feedback no banco (sem análise ainda)
    const { data: feedback, error: insertError } = await supabase
      .from('feedbacks')
      .insert({
        manager_id: user.id,
        member_id: memberId,
        content: content,
        type: type,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting feedback:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Feedback inserted:', feedback.id);

    // Chamar OpenAI para análise
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling OpenAI for feedback analysis...');

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de feedback. Seja conciso e objetivo na análise.'
          },
          {
            role: 'user',
            content: `Analise este feedback e retorne as informações estruturadas:\n\nFeedback: ${truncatedContent}\n\nTipo: ${type}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_feedback",
              description: "Analisa um feedback de performance e retorna dados estruturados",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Resumo conciso do feedback em até 2 frases"
                  },
                  sentiment: {
                    type: "string",
                    enum: ["muito_positivo", "positivo", "neutro", "construtivo", "critico"],
                    description: "Sentimento geral do feedback"
                  },
                  coaching_tips: {
                    type: "string",
                    description: "3 dicas práticas de coaching baseadas no feedback (formato de lista com bullets)"
                  },
                  bias_alert: {
                    type: "string",
                    description: "Alerta sobre possíveis vieses (gênero, idade, culturais) ou 'Nenhum viés detectado'"
                  }
                },
                required: ["summary", "sentiment", "coaching_tips", "bias_alert"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_feedback" } },
        max_completion_tokens: 4000
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze feedback with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await openAIResponse.json();
    console.log('OpenAI response received:', JSON.stringify(aiData, null, 2));

    const message = aiData.choices?.[0]?.message;
    const finishReason = aiData.choices?.[0]?.finish_reason;
    let analysis: any;

    // Fallback se a resposta foi truncada
    if (finishReason === 'length') {
      console.warn('AI response was truncated due to length, using fallback');
      analysis = {
        summary: "Feedback registrado com sucesso. Análise completa indisponível devido ao tamanho do conteúdo.",
        sentiment: "neutro",
        coaching_tips: "• Revise o conteúdo manualmente para extrair insights detalhados\n• Considere dividir feedbacks muito longos em partes menores\n• Foque nos pontos principais para uma análise mais efetiva",
        bias_alert: "Nenhum viés detectado"
      };
    } else if (message?.tool_calls?.[0]?.function?.arguments) {

    } else if (message?.tool_calls?.[0]?.function?.arguments) {
      try {
        const toolCall = message.tool_calls[0];
        analysis = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('Error parsing tool call arguments:', e);
        return new Response(
          JSON.stringify({ error: 'Invalid AI response' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (typeof message?.content === 'string' && message.content.trim()) {
      try {
        analysis = JSON.parse(message.content);
      } catch (e) {
        console.error('Error parsing JSON from message.content:', e, message.content);
        return new Response(
          JSON.stringify({ error: 'Invalid AI response' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.error('No tool call or JSON content in OpenAI response message');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analysis extracted:', analysis);

    // Atualizar feedback com análise
    const { data: updatedFeedback, error: updateError } = await supabase
      .from('feedbacks')
      .update({
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        coaching_tips: analysis.coaching_tips,
        bias_alert: analysis.bias_alert,
      })
      .eq('id', feedback.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating feedback:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Feedback updated with analysis:', updatedFeedback.id);

    return new Response(
      JSON.stringify(updatedFeedback),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in analyze-feedback function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
