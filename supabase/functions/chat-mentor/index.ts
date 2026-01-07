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
    const { question, memberId, memberName, memberRole, workStyleData, keyObjectives } = await req.json();

    console.log('Chat mentor RAG request:', { memberName, memberRole, memberId });

    if (!question || !memberId || !memberName) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros inválidos: question, memberId e memberName são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar API Key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração de API ausente. Contate o administrador.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for RPC calls
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Generate embedding for the user's question
    console.log('Generating embedding for question...');
    
    let questionEmbedding;
    try {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: question,
          model: 'text-embedding-3-small'
        }),
      });

      if (!embeddingResponse.ok) {
        throw new Error(`Embedding API error: ${embeddingResponse.status}`);
      }

      const embeddingData = await embeddingResponse.json();
      questionEmbedding = embeddingData.data?.[0]?.embedding;

      if (!questionEmbedding) {
        throw new Error('No embedding returned');
      }
    } catch (err: any) {
      console.error('Failed to generate question embedding:', err);
      return new Response(
        JSON.stringify({ error: 'Falha ao processar pergunta. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Search for similar feedbacks using vector search
    console.log('Searching for similar feedbacks...');
    
    const { data: similarFeedbacks, error: searchError } = await supabase.rpc('match_feedbacks', {
      query_embedding: `[${questionEmbedding.join(',')}]`,
      match_threshold: 0.7,
      match_count: 10,
      filter_member_id: memberId,
      filter_workspace_id: null
    });

    if (searchError) {
      console.error('Vector search error:', searchError);
      // Fallback: proceed without context if search fails
    }

    console.log('Similar feedbacks found:', similarFeedbacks?.length || 0);

    // Step 3: Build context from similar feedbacks
    let contextLines = '';
    if (similarFeedbacks && similarFeedbacks.length > 0) {
      for (let idx = 0; idx < similarFeedbacks.length; idx++) {
        const fb = similarFeedbacks[idx];
        const date = new Date(fb.created_at).toLocaleDateString('pt-BR');
        const similarity = (fb.similarity * 100).toFixed(0);
        const content = fb.content?.substring(0, 500) || fb.summary || '';
        
        contextLines += `[Nota ${idx + 1} - ${date} - Relevância: ${similarity}%]
${content}
---\n\n`;
      }
    } else {
      contextLines = `⚠️ ATENÇÃO: CONTEXTO VAZIO ⚠️
Nenhuma nota relevante foi encontrada para esta pergunta.
VOCÊ DEVE responder EXATAMENTE: "Não encontrei registros suficientes no histórico sobre esse tema. Registre mais notas sobre esse assunto para que eu possa ajudá-lo."
NÃO invente informações.`;
    }

    // Helper: Formatar perfil Rhitmo Sync
    const formatWorkStyle = (data: any): string => {
      if (!data) return 'Perfil Rhitmo Sync: Não preenchido ainda.';
      
      const styleLabels: any = {
        processing: { direct: 'Direto ao ponto', contextual: 'Contexto completo' },
        feedback: { immediate: 'Feedback na hora', scheduled: 'Feedback na 1:1' },
        autonomy: { directed: 'Direcionamento claro', autonomous: 'Autonomia' },
        energy: { morning: 'Produtivo pela manhã', evening: 'Produtivo à tarde/noite' },
        motivation: { recognition: 'Reconhecimento', growth: 'Crescimento' }
      };

      return `Perfil Rhitmo Sync:
- Comunicação: ${styleLabels.processing[data.processing] || data.processing}
- Feedback: ${styleLabels.feedback[data.feedback] || data.feedback}
- Autonomia: ${styleLabels.autonomy[data.autonomy] || data.autonomy}
- Energia: ${styleLabels.energy[data.energy] || data.energy}
- Motivação: ${styleLabels.motivation[data.motivation] || data.motivation}`;
    };

    // Seção de Objetivos (condicional)
    const objectivesSection = keyObjectives && keyObjectives.trim()
      ? `## 🎯 OBJETIVOS DE NEGÓCIO DO LIDERADO

O gestor definiu os seguintes objetivos (formato: Objetivo | Valor | Prazo):

${keyObjectives}

### COMO USAR ESTA INFORMAÇÃO
- Estes objetivos são a BÚSSOLA para calibrar suas análises
- Ao identificar um comportamento, avalie: aproxima ou afasta das metas?
- Conecte feedbacks aos objetivos quando relevante
- Verifique progresso em relação aos prazos definidos
`
      : `## 🎯 OBJETIVOS DE NEGÓCIO
Nenhum objetivo foi definido pelo gestor.
`;

    const systemPrompt = `# RHITMO MENTOR - CONSTITUIÇÃO

## IDENTIDADE
${RHITMO_IDENTITY}

## REGRAS DE OURO (GUARD-RAILS)
${GUARDRAILS_PROMPT}

## LÓGICA DE ANÁLISE
${ANALYSIS_RULES}

## REGRA PRIORITÁRIA: O GERADOR DE RASCUNHOS (DRAFTING)

Sempre que o usuário pedir ajuda sobre **como falar**, **como cobrar**, **como dar feedback** ou **como abordar um assunto**:

### NÃO DÊ APENAS TEORIA
- **NUNCA** responda apenas com "Seja empático" ou "Seja claro"
- **ENTREGUE O TEXTO PRONTO**: Gere um bloco destacado com uma sugestão de mensagem

### CALIBRE PELO RHITMO SYNC
Consulte o perfil work_style_data do liderado e ajuste o tom:

| Perfil | Como Escrever |
|--------|---------------|
| **Direto ao ponto** | Mensagem curta, objetiva, sem rodeios |
| **Contexto completo** | Inclua o porquê, dados, datas, contexto |
| **Relacional** | Use tom acolhedor, emojis, mostre cuidado |
| **Feedback na hora** | Sugira abordar rapidamente, tom leve |
| **Feedback na 1:1** | Sugira agendar conversa, tom formal |
| **Reconhecimento** | Inclua elogios específicos, celebre conquistas |
| **Crescimento** | Foque em oportunidades de desenvolvimento |

### ESTRUTURA OBRIGATÓRIA DA RESPOSTA

1. **Explicação Breve (1-2 frases)**: Estratégia baseada no perfil
2. **Texto Pronto Destacado**: Use blockquote (>) ou código
3. **Formato**: 📱 Sugestão para [WhatsApp/Slack/Email]:

## PERSONALIZAÇÃO (CRÍTICO)
Use o perfil Rhitmo Sync para orientar o gerente:

**Se "Direto ao ponto"**: Instrua o gerente a ser objetivo nas conversas
**Se "Contexto completo"**: Sugira explicar o porquê antes do quê
**Se "Feedback na hora"**: Recomende abordar rapidamente após eventos
**Se "Feedback na 1:1"**: Sugira preparar pontos para a próxima 1:1
**Se "Direcionamento claro"**: Oriente dar instruções específicas
**Se "Autonomia"**: Sugira dar espaço e cobrar resultados
**Se "Reconhecimento"**: Sugira elogios públicos e celebrações
**Se "Crescimento"**: Sugira desafios e oportunidades de aprendizado
**Se "Produtivo pela manhã"**: Sugira reuniões importantes de manhã
**Se "Produtivo à tarde/noite"**: Evite demandas críticas no início do dia

## TOM DE VOZ
- **Profissional**: Linguagem clara e assertiva
- **Encorajador**: Reconheça os esforços do gerente
- **Educativo**: Explique o "porquê" das sugestões
- Se o gerente parecer frustrado: Valide o sentimento, depois redirecione para soluções

${objectivesSection}

## DADOS DO LIDERADO

**Nome**: ${memberName}
**Cargo**: ${memberRole || 'Não informado'}

${formatWorkStyle(workStyleData)}

## NOTAS RELEVANTES (BUSCA SEMÂNTICA - RAG)

As notas abaixo foram selecionadas por similaridade com a pergunta do usuário:

${contextLines}

---

Lembre-se: Você é um coach experiente. Baseie-se APENAS nos dados acima. Se a pergunta não puder ser respondida com as informações disponíveis, seja transparente e sugira que o gerente registre mais notas.`;

    console.log('Calling OpenAI with RAG context...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('OpenAI request timeout');
        return new Response(
          JSON.stringify({ error: 'Tempo de resposta excedido. Tente novamente.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchError;
    }
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error status:', response.status);
      console.error('OpenAI error body:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'O serviço de IA está ocupado. Tente novamente em instantes.',
            code: 'RATE_LIMIT'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Créditos de IA esgotados. Adicione créditos em Settings → Workspace.',
            code: 'INSUFFICIENT_CREDITS'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Erro na API de IA (${response.status})`,
          code: 'AI_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      return new Response(
        JSON.stringify({ error: 'Resposta inválida da IA. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mentorResponse = data.choices[0].message.content;

    console.log('Mentor RAG response generated successfully');

    return new Response(
      JSON.stringify({ response: mentorResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in chat-mentor function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
