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
      match_threshold: 0.5, // Reduced from 0.7 for better recall
      match_count: 10,
      filter_member_id: memberId,
      filter_workspace_id: null
    });

    if (searchError) {
      console.error('Vector search error:', searchError);
    }

    console.log('Vector search results:', similarFeedbacks?.length || 0);

    // Step 2.5: ALWAYS fetch recent notes as backup (robust fallback)
    let recentFeedbacks: any[] = [];
    const MIN_VECTOR_RESULTS = 3;
    const vectorResultsCount = similarFeedbacks?.length || 0;

    // ALWAYS fetch recent notes - this is our safety net
    const { data: recentNotes, error: recentError } = await supabase
      .from('feedbacks')
      .select('id, content, summary, created_at')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Fallback query error:', recentError);
    } else if (recentNotes) {
      console.log(`Member has ${recentNotes.length} total notes in database`);
      
      // If vector search returned few/no results, use recent notes
      if (vectorResultsCount < MIN_VECTOR_RESULTS) {
        console.log(`Vector search returned ${vectorResultsCount} results (< ${MIN_VECTOR_RESULTS}). Using fallback...`);
        const vectorIds = new Set(similarFeedbacks?.map((f: any) => f.id) || []);
        recentFeedbacks = recentNotes.filter(note => !vectorIds.has(note.id));
        console.log(`Fallback added ${recentFeedbacks.length} unique recent notes`);
      }
    }

    // Calculate total context
    const totalContext = vectorResultsCount + recentFeedbacks.length;

    // SAFETY NET: If we have 0 context but member has notes, force include them
    if (totalContext === 0 && recentNotes && recentNotes.length > 0) {
      console.warn('SAFETY NET ACTIVATED: Vector search failed but member has notes. Forcing inclusion.');
      recentFeedbacks = recentNotes.slice(0, 10);
    }

    // Diagnostic log
    console.log('Search results summary:', {
      vectorResults: vectorResultsCount,
      fallbackResults: recentFeedbacks.length,
      totalContext: vectorResultsCount + recentFeedbacks.length,
      memberTotalNotes: recentNotes?.length || 0
    });

    // Step 3: Build context from similar feedbacks + recent fallback
    let contextLines = '';

    // First: notes from vector search (with similarity score)
    if (similarFeedbacks && similarFeedbacks.length > 0) {
      contextLines += '### NOTAS POR RELEVÂNCIA SEMÂNTICA\n\n';
      for (let idx = 0; idx < similarFeedbacks.length; idx++) {
        const fb = similarFeedbacks[idx];
        const date = new Date(fb.created_at).toLocaleDateString('pt-BR');
        const similarity = (fb.similarity * 100).toFixed(0);
        const content = fb.content?.substring(0, 500) || fb.summary || '';
        
        contextLines += `[Nota ${idx + 1} - ${date} - Relevância: ${similarity}%]
${content}
---\n\n`;
      }
    }

    // Second: recent notes from fallback (no similarity score)
    if (recentFeedbacks.length > 0) {
      contextLines += '\n### NOTAS RECENTES ADICIONAIS\n\n';
      contextLines += '⚠️ IMPORTANTE: Estas notas foram incluídas como contexto adicional. USE-AS para responder ao gestor.\n\n';
      for (let idx = 0; idx < recentFeedbacks.length; idx++) {
        const fb = recentFeedbacks[idx];
        const date = new Date(fb.created_at).toLocaleDateString('pt-BR');
        const content = fb.content?.substring(0, 500) || fb.summary || '';
        
        contextLines += `[Nota Recente ${idx + 1} - ${date}]
${content}
---\n\n`;
      }
    }

    // Empty message ONLY if no notes from either source
    if (!contextLines) {
      contextLines = `⚠️ ATENÇÃO: CONTEXTO VAZIO ⚠️
Nenhuma nota foi encontrada para este liderado.
Sugira ao gestor que registre observações e notas sobre este liderado para que você possa ajudá-lo melhor.`;
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

## NOTAS DO LIDERADO (CONTEXTO OBRIGATÓRIO)

REGRA CRÍTICA: Se houver notas abaixo, você DEVE usá-las para responder.
Você SÓ pode dizer "não encontrei registros" se a seção abaixo estiver COMPLETAMENTE VAZIA.

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
