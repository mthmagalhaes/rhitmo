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

    // Helper para contar palavras
    const countWords = (text: string): number => {
      return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    };

    // Truncar conteúdo muito longo para evitar problemas com tokens
    const maxContentLength = 6000;
    const truncatedContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + "\n\n[...conteúdo truncado para análise...]"
      : content;
    
    const wordCount = countWords(truncatedContent);
    const isShortNote = wordCount < 50;
    
    console.log(`Análise: ${wordCount} palavras - Modo: ${isShortNote ? 'CURTO' : 'COMPLETO'}`);

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

    // Buscar dados do membro para obter key_objectives
    const { data: member } = await supabase
      .from('team_members')
      .select('key_objectives')
      .eq('id', memberId)
      .single();

    const keyObjectives = member?.key_objectives;

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

    // Contexto de objetivos (condicional)
    const objectivesContext = keyObjectives && keyObjectives.trim()
      ? `

## CONTEXTO DE OBJETIVOS DO LIDERADO
Objetivos definidos (formato: Objetivo | Valor | Prazo):
${keyObjectives}

Ao analisar este feedback:
- Verifique se o comportamento aproxima ou afasta dos objetivos
- Se houver conexão clara com alguma meta, mencione no coaching_tip
- Considere os prazos ao avaliar urgência de desenvolvimento`
      : '';

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
                type: "string",
                description: "Deixar VAZIO para notas curtas, a menos que haja ofensa grave"
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
                type: "string",
                description: "Dicas práticas de coaching (formato bullets). Inclua feedback sobre postura do líder se aplicável. Use 'Você' diretamente."
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
${objectivesContext}

Nota:
${truncatedContent}`
      : `[MODO: TEXTO RICO - ${wordCount} palavras]
Analise este feedback de forma COMPLETA. Inclua dicas de coaching e seja o "Espelho do Líder".
${objectivesContext}

Feedback:
${truncatedContent}`;

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        tools: isShortNote ? toolsShortNote : toolsRichText,
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
