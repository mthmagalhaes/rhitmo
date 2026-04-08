import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RHITMO_IDENTITY, GUARDRAILS_PROMPT, ANALYSIS_RULES } from "../_shared/rhitmo-constitution.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Structured bias_alert schema for rich text analysis
const biasAlertSchema = {
  type: "object",
  description: "Análise estruturada de viés. Identifique trechos EXATOS do texto.",
  properties: {
    detected: { type: "boolean", description: "true se qualquer viés foi detectado" },
    summary: { type: "string", description: "Resumo do viés detectado em 1 frase. Vazio se não detectado." },
    flags: {
      type: "array",
      description: "Lista de trechos com viés identificados no texto",
      items: {
        type: "object",
        properties: {
          phrase: { type: "string", description: "Trecho EXATO do texto original que contém viés" },
          type: { type: "string", enum: ["generalizacao", "personalidade", "genero", "comparacao", "rotulo"], description: "Tipo de viés identificado" },
          suggestion: { type: "string", description: "Sugestão de reescrita mais objetiva e construtiva" }
        },
        required: ["phrase", "type", "suggestion"]
      }
    }
  },
  required: ["detected", "summary", "flags"]
};

// Structured bias_alert schema for short notes (always returns detected: false unless severe)
const biasAlertSchemaShort = {
  type: "object",
  description: "Para notas curtas: retorne { detected: false, summary: '', flags: [] } EXCETO se houver linguagem ofensiva grave.",
  properties: {
    detected: { type: "boolean" },
    summary: { type: "string" },
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phrase: { type: "string" },
          type: { type: "string", enum: ["generalizacao", "personalidade", "genero", "comparacao", "rotulo"] },
          suggestion: { type: "string" }
        },
        required: ["phrase", "type", "suggestion"]
      }
    }
  },
  required: ["detected", "summary", "flags"]
};

// Bias detection prompt section
const BIAS_DETECTION_STRUCTURED = `
## DETECÇÃO DE VIÉS ESTRUTURADA

Ao analisar bias_alert, retorne um OBJETO JSON estruturado (não uma string).

### REGRAS:
1. Identifique trechos EXATOS do texto original — copie a frase literal
2. Categorize cada trecho em um dos 5 tipos abaixo
3. Sugira uma reescrita mais objetiva e construtiva
4. Tom EDUCATIVO, nunca acusatório — o objetivo é desenvolver o líder

### TIPOS DE VIÉS:
- **generalizacao**: Uso de "sempre", "nunca", "todo mundo", "ninguém". Ex: "Você sempre atrasa" → "Nos últimos 3 sprints, houve atraso em 2 entregas"
- **personalidade**: Adjetivos sobre caráter em vez de comportamento observável. Ex: "Ela é desorganizada" → "O relatório foi entregue sem a seção de métricas"
- **genero**: Linguagem que seria diferente se o gênero fosse outro. Ex: "Ela é agressiva nas reuniões" → "Ela defende suas ideias com firmeza"
- **comparacao**: Comparação implícita ou explícita com outro liderado. Ex: "Diferente do João, você não..." → Avaliar com base em critérios objetivos individuais
- **rotulo**: Rótulos limitantes que definem a pessoa. Ex: "Ele é assim mesmo" → "Esse comportamento pode ser desenvolvido com..."

### FORMATO DE SAÍDA:
- Se NÃO houver viés: { detected: false, summary: "", flags: [] }
- Se HOUVER viés: { detected: true, summary: "Frase resumo", flags: [...] }`;

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const countWords = (text: string): number => {
      return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    };

    const maxContentLength = 15000;
    const truncatedContent = feedback.content.length > maxContentLength 
      ? feedback.content.substring(0, maxContentLength) + "\n\n[...conteúdo truncado para análise...]"
      : feedback.content;
    
    const wordCount = countWords(truncatedContent);
    const isShortNote = wordCount < 50;
    
    console.log(`Analysis: ${wordCount} words - Mode: ${isShortNote ? 'SHORT' : 'COMPLETE'}`);

    const { data: member } = await supabase
      .from('team_members')
      .select('key_objectives')
      .eq('id', feedback.member_id)
      .single();

    const keyObjectives = member?.key_objectives;

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

${BIAS_DETECTION_STRUCTURED}

## FORMATO DE SAÍDA
Retorne dados estruturados conforme a função especificada.
Para texto curto: coaching_tips deve ser null ou vazio.
Para texto rico: coaching_tips deve conter insights acionáveis.`;

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
              bias_alert: biasAlertSchemaShort
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
              bias_alert: biasAlertSchema
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
        bias_alert: { detected: false, summary: "", flags: [] }
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

    // Serialize bias_alert to JSON string for TEXT column
    const biasAlertValue = typeof analysis.bias_alert === 'object' 
      ? JSON.stringify(analysis.bias_alert) 
      : analysis.bias_alert;

    const { error: updateError } = await supabase
      .from('feedbacks')
      .update({
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        coaching_tips: analysis.coaching_tips,
        bias_alert: biasAlertValue,
      })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Error updating feedback:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Feedback analysis saved, generating embedding...');

    // ── Generate embedding (non-blocking) ──
    try {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: feedback.content.substring(0, 8000),
        }),
      });

      if (embeddingResponse.ok) {
        const embData = await embeddingResponse.json();
        const embedding = embData.data?.[0]?.embedding;
        if (embedding) {
          const embeddingStr = JSON.stringify(embedding);
          const { error: embError } = await supabase
            .from('feedbacks')
            .update({ embedding: embeddingStr })
            .eq('id', feedbackId);
          if (embError) {
            console.error('Error saving embedding:', embError.message);
          } else {
            console.log('Embedding saved successfully (1536 dims)');
          }
        }
      } else {
        console.error('Embedding API error:', embeddingResponse.status);
      }
    } catch (embErr: any) {
      console.error('Embedding generation failed (non-blocking):', embErr.message);
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
