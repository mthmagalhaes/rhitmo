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

    // Helper para contar palavras
    const countWords = (text: string): number => {
      return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    };

    const maxContentLength = 6000;
    let truncatedContent = feedback.content;
    if (feedback.content.length > maxContentLength) {
      truncatedContent = feedback.content.substring(0, maxContentLength);
      console.log(`Conteúdo truncado de ${feedback.content.length} para ${maxContentLength} caracteres`);
    }

    const wordCount = countWords(truncatedContent);
    const isShortNote = wordCount < 50;
    
    console.log(`Reprocessamento: ${wordCount} palavras - Modo: ${isShortNote ? 'CURTO' : 'COMPLETO'}`);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração de IA não disponível' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enviando para OpenAI...');

    // System Prompt - Constituição Rhitmo Analyst
    const systemPrompt = `# RHITMO ANALYST - CONSTITUIÇÃO

## SUA MISSÃO
Analisar textos de reuniões/notas, extrair resumo e tarefas. Quando apropriado, agir como **Espelho do Líder**, apontando vieses e melhorias de postura.

## REGRA DE CONTEXTO: SILÊNCIO INTELIGENTE

Você receberá uma flag indicando se o texto é curto ou rico.

### CASO A: Texto Curto (< 50 palavras)
- **AÇÃO**: Apenas resuma e extraia pontos principais
- **RESTRIÇÃO**: NÃO gere dicas de coaching ou críticas comportamentais
- **MOTIVO**: Não ser pedante em anotações rápidas
- **EXCEÇÃO**: Alerte APENAS se houver linguagem ofensiva grave

### CASO B: Texto Rico / Transcrição (≥ 50 palavras)
- **AÇÃO**: Análise completa com coaching ativo
- **DETECÇÃO DE VIÉS**: Procure ativamente por:
  - Linguagem sexista, racista ou etarista
  - Generalizações absolutas ("Você sempre...", "Você nunca...")
  - Rótulos limitantes ("Ele é assim mesmo", "Ela não tem perfil")
  - Microgerenciamento ou controle excessivo
- **ESPELHO DO LÍDER**: Se identificar que o gerente:
  - Falou a maior parte do tempo
  - Interrompeu o liderado
  - Foi excessivamente diretivo sem escutar
  → Aponte isso diretamente no campo coaching_tips

## TOM DE VOZ
- Seja **direto** e use "Você" ao dar feedback ao gerente
- Exemplos:
  - "Você interrompeu o liderado 3 vezes. Pratique a escuta ativa."
  - "A frase 'você sempre atrasa' é uma generalização. Prefira exemplos específicos."
  - "Você falou 80% do tempo. Nas próximas 1:1, experimente fazer mais perguntas."

## FORMATO DE SAÍDA
Retorne dados estruturados conforme a função especificada.
Para texto curto: coaching_tips deve ser null ou vazio.
Para texto rico: coaching_tips deve conter insights acionáveis.`;

    // Tools dinâmicos baseados no tamanho do texto
    const toolsShortNote = [
      {
        type: "function",
        function: {
          name: "analyze_feedback",
          description: "Análise simplificada para notas curtas",
          parameters: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "Resumo conciso em 1-2 frases"
              },
              sentiment: {
                type: "string",
                enum: ["muito_positivo", "positivo", "neutro", "construtivo", "critico"]
              },
              coaching_tips: {
                type: "array",
                items: { type: "string" },
                description: "Lista VAZIA para notas curtas, a menos que haja ofensa grave"
              },
              bias_alert: {
                type: "string",
                description: "Alertar APENAS se houver linguagem ofensiva grave, senão 'Nenhum viés detectado'"
              }
            },
            required: ["summary", "sentiment", "coaching_tips", "bias_alert"],
            additionalProperties: false
          }
        }
      }
    ];

    const toolsRichText = [
      {
        type: "function",
        function: {
          name: "analyze_feedback",
          description: "Análise completa com coaching ativo",
          parameters: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "Resumo conciso em até 2 frases"
              },
              sentiment: {
                type: "string",
                enum: ["muito_positivo", "positivo", "neutro", "construtivo", "critico"]
              },
              coaching_tips: {
                type: "array",
                items: { type: "string" },
                description: "Lista de dicas práticas de coaching. Inclua feedback sobre postura do líder se aplicável. Use 'Você' diretamente."
              },
              bias_alert: {
                type: "string",
                description: "Alerte sobre: linguagem discriminatória, generalizações ('sempre/nunca'), rótulos limitantes. Se não houver: 'Nenhum viés detectado'"
              }
            },
            required: ["summary", "sentiment", "coaching_tips", "bias_alert"],
            additionalProperties: false
          }
        }
      }
    ];

    const userPrompt = isShortNote
      ? `[MODO: NOTA CURTA - ${wordCount} palavras]
Analise esta nota de forma SIMPLIFICADA. NÃO gere dicas de coaching.

Nota:
${truncatedContent}`
      : `[MODO: TEXTO RICO - ${wordCount} palavras]
Analise este feedback de forma COMPLETA. Inclua dicas de coaching e seja o "Espelho do Líder".

Feedback:
${truncatedContent}`;

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        tools: isShortNote ? toolsShortNote : toolsRichText,
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
