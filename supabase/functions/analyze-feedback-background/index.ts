import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RHITMO_IDENTITY, GUARDRAILS_PROMPT, ANALYSIS_RULES } from "../_shared/rhitmo-constitution.ts";

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
    console.log('Background analysis request for feedback:', feedbackId);

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
      .select('id, content, member_id')
      .eq('id', feedbackId)
      .single();

    if (fetchError || !feedback) {
      console.error('Error fetching feedback:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Feedback not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Feedback found, starting analysis...');

    // Helper to count words
    const countWords = (text: string): number => {
      return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    };

    // Truncate very long content (increased to 15k for better analysis)
    const maxContentLength = 15000;
    const truncatedContent = feedback.content.length > maxContentLength 
      ? feedback.content.substring(0, maxContentLength) + "\n\n[...conteúdo truncado para análise...]"
      : feedback.content;
    
    const wordCount = countWords(truncatedContent);
    const isShortNote = wordCount < 50;
    
    console.log(`Analysis: ${wordCount} words - Mode: ${isShortNote ? 'SHORT' : 'COMPLETE'}`);

    // Fetch member's key objectives
    const { data: member } = await supabase
      .from('team_members')
      .select('key_objectives')
      .eq('id', feedback.member_id)
      .single();

    const keyObjectives = member?.key_objectives;

    // Call OpenAI for analysis
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    // System Prompt - Rhitmo Analyst Constitution
    const systemPrompt = `# RHITMO ANALYST - CONSTITUIÇÃO

## IDENTIDADE
${RHITMO_IDENTITY}

## REGRAS DE OURO
${GUARDRAILS_PROMPT}

## LÓGICA DE ANÁLISE
${ANALYSIS_RULES}

## MISSÃO ESPECÍFICA: ANÁLISE DE FEEDBACK

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

## FORMATO DE SAÍDA
Retorne dados estruturados conforme a função especificada.
Para texto curto: coaching_tips deve ser null ou vazio.
Para texto rico: coaching_tips deve conter insights acionáveis.`;

    // Objectives context (conditional)
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

    // Dynamic tools based on text size
    const toolsShortNote = [
      {
        type: "function",
        function: {
          name: "analyze_feedback",
          description: "Análise simplificada para notas curtas",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Resumo conciso em 1-2 frases" },
              sentiment: { type: "string", enum: ["muito_positivo", "positivo", "neutro", "construtivo", "critico"] },
              coaching_tips: { type: "string", description: "Deixar VAZIO para notas curtas" },
              bias_alert: { type: "string", description: "Alertar APENAS se houver linguagem ofensiva grave" }
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
              summary: { type: "string", description: "Resumo conciso em até 2 frases" },
              sentiment: { type: "string", enum: ["muito_positivo", "positivo", "neutro", "construtivo", "critico"] },
              coaching_tips: { type: "string", description: "Dicas práticas de coaching. Use 'Você' diretamente." },
              bias_alert: { type: "string", description: "Alerte sobre linguagem discriminatória ou generalizações." }
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

    let openAIResponse;
    try {
      openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          tools: isShortNote ? toolsShortNote : toolsRichText,
          tool_choice: { type: "function", function: { name: "analyze_feedback" } },
          max_completion_tokens: 4000
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('OpenAI request failed:', fetchError);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', code: fetchError.name }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    clearTimeout(timeoutId);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', status: openAIResponse.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await openAIResponse.json();
    console.log('OpenAI response received');

    const message = aiData.choices?.[0]?.message;
    const finishReason = aiData.choices?.[0]?.finish_reason;
    let analysis: any;

    if (finishReason === 'length') {
      console.warn('AI response was truncated');
      analysis = {
        summary: "Feedback registrado. Análise completa indisponível devido ao tamanho.",
        sentiment: "neutro",
        coaching_tips: "",
        bias_alert: "Nenhum viés detectado"
      };
    } else if (message?.tool_calls?.[0]?.function?.arguments) {
      try {
        analysis = JSON.parse(message.tool_calls[0].function.arguments);
      } catch (e) {
        console.error('Error parsing tool call arguments:', e);
        return new Response(
          JSON.stringify({ error: 'Invalid AI response' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.error('No tool call in OpenAI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analysis extracted, updating feedback...');

    // Update feedback with analysis
    const { error: updateError } = await supabase
      .from('feedbacks')
      .update({
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        coaching_tips: analysis.coaching_tips,
        bias_alert: analysis.bias_alert,
      })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Error updating feedback:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Feedback analysis completed successfully');

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
