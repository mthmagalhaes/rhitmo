import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    if (!feedbackId) {
      return new Response(
        JSON.stringify({ error: 'feedbackId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Reprocessando feedback ${feedbackId} para usuário ${user.id}`);

    // Buscar feedback existente
    const { data: feedback, error: fetchError } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('id', feedbackId)
      .eq('manager_id', user.id)
      .single();

    if (fetchError || !feedback) {
      console.error('Erro ao buscar feedback:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Feedback não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maxContentLength = 6000;
    let truncatedContent = feedback.content;
    if (feedback.content.length > maxContentLength) {
      truncatedContent = feedback.content.substring(0, maxContentLength);
      console.log(`Conteúdo truncado de ${feedback.content.length} para ${maxContentLength} caracteres`);
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração de IA não disponível' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enviando para OpenAI...');

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de feedbacks corporativos. Analise o feedback fornecido e retorne insights estruturados.'
          },
          {
            role: 'user',
            content: `Analise este feedback e forneça:
1. Um resumo conciso (máximo 2 frases)
2. O sentimento predominante (escolha entre: muito_positivo, positivo, neutro, construtivo, critico)
3. Três dicas práticas de coaching para o gestor
4. Alerta de viés (se detectar algum viés cognitivo, caso contrário retorne "Nenhum viés detectado")

Feedback:
${truncatedContent}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_feedback",
              description: "Retorna análise estruturada do feedback",
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
                    description: "Sentimento predominante do feedback"
                  },
                  coaching_tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de 3 dicas práticas de coaching"
                  },
                  bias_alert: {
                    type: "string",
                    description: "Alerta sobre possíveis vieses detectados ou 'Nenhum viés detectado'"
                  }
                },
                required: ["summary", "sentiment", "coaching_tips", "bias_alert"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_feedback" } }
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('Erro na API OpenAI:', openAIResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar análise de IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIData = await openAIResponse.json();
    console.log('Resposta OpenAI recebida:', JSON.stringify(openAIData));

    let analysis;
    try {
      const toolCall = openAIData.choices[0].message.tool_calls?.[0];
      if (toolCall) {
        analysis = JSON.parse(toolCall.function.arguments);
      } else {
        console.error('Sem tool_calls na resposta');
        return new Response(
          JSON.stringify({ error: 'Resposta de IA inválida' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (parseError) {
      console.error('Erro ao parsear resposta:', parseError);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar resposta da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const coachingTipsText = analysis.coaching_tips?.join('\n• ') || '';

    console.log('Atualizando feedback com análise...');

    const { data: updatedFeedback, error: updateError } = await supabase
      .from('feedbacks')
      .update({
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        coaching_tips: coachingTipsText ? `• ${coachingTipsText}` : null,
        bias_alert: analysis.bias_alert
      })
      .eq('id', feedbackId)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar feedback:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar análise' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Feedback reprocessado com sucesso!');

    return new Response(
      JSON.stringify(updatedFeedback),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
