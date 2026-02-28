import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, threadId, memberName, memberRole, workStyleData, aiAnalysis, pdiItems, latestReview } = await req.json();

    if (!question || !memberName) {
      return new Response(
        JSON.stringify({ error: 'question e memberName são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'API key não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }).auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Find member_id via linked_user_id
    const { data: member } = await supabase
      .from('team_members')
      .select('id')
      .eq('linked_user_id', userId)
      .maybeSingle();

    const memberId = member?.id || null;

    // Use provided threadId or create new thread
    let currentThreadId = threadId;

    if (!currentThreadId) {
      // Create new thread with type='career'
      const title = question.slice(0, 40) + (question.length > 40 ? '...' : '');
      const insertData: any = {
        user_id: userId,
        type: 'career',
        title,
      };
      if (memberId) insertData.member_id = memberId;

      const { data: newThread, error: threadError } = await supabase
        .from('chat_threads')
        .insert(insertData)
        .select('id')
        .single();
      if (threadError) throw threadError;
      currentThreadId = newThread.id;
    }

    // Fetch last 20 messages for conversation history
    const { data: historyMessages } = await supabase
      .from('mentor_messages')
      .select('role, content')
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true })
      .limit(20);

    // Save user message
    const msgInsert: any = {
      user_id: userId,
      thread_id: currentThreadId,
      role: 'user',
      content: question,
    };
    if (memberId) msgInsert.member_id = memberId;
    await supabase.from('mentor_messages').insert(msgInsert);

    // Build context from props
    const wsd = workStyleData || {};
    const chronotype = wsd.chronotype || wsd.energy || 'Não informado';
    const energyDrains = wsd.energy_drains || 'Não informado';
    const energySources = wsd.energy_sources || 'Não informado';
    const feedbackStyle = wsd.feedback_style || wsd.feedback || 'Não informado';
    const recognitionStyle = wsd.recognition_style || wsd.recognition || 'Não informado';
    const motivators = Array.isArray(wsd.motivators) ? wsd.motivators.join(', ') : (wsd.motivators || 'Não informado');
    const aspirations = aiAnalysis?.aspirations || 'Não informado';
    const skillGoal = wsd.skill_goal || 'Não informado';

    const analysisSummary = aiAnalysis?.analysis_summary || 'Análise ainda não disponível.';
    const keyGaps = Array.isArray(aiAnalysis?.key_gaps) ? aiAnalysis.key_gaps.map((g: string) => `- ${g}`).join('\n') : 'Nenhum identificado ainda.';
    const suggestedFocus = Array.isArray(aiAnalysis?.suggested_focus) ? aiAnalysis.suggested_focus.map((f: string) => `- ${f}`).join('\n') : 'Nenhum sugerido ainda.';

    const pdiText = Array.isArray(pdiItems) && pdiItems.length > 0
      ? pdiItems.map((item: any) => `- ${item.title} (${item.category || 'geral'}) — ${item.status || 'pendente'}${item.due_date ? ` · Prazo: ${item.due_date}` : ''}`).join('\n')
      : 'Nenhum PDI ativo no momento.';

    const reviewText = latestReview || 'Nenhuma avaliação compartilhada ainda.';

    const systemPrompt = `Você é o Meu Rhitmo — o parceiro pessoal de desenvolvimento de ${memberName}.

Você tem duas funções complementares:

1. MENTOR DE CARREIRA: ajuda ${memberName} a pensar no próximo nível, promoção, desenvolvimento de habilidades e objetivos de longo prazo.

2. PARCEIRO DE PERFORMANCE: ajuda ${memberName} no dia a dia — como se preparar para reuniões importantes, como receber e processar feedbacks, como se comunicar melhor, como lidar com situações desafiadoras no trabalho.

Você conhece ${memberName} de verdade:

PERFIL PESSOAL:
- Cargo atual: ${memberRole || 'Não informado'}
- Quando é mais produtivo: ${chronotype}
- O que drena sua energia: ${energyDrains}
- O que carrega sua energia: ${energySources}
- Como prefere receber feedback: ${feedbackStyle}
- Como prefere ser reconhecido: ${recognitionStyle}
- O que mais motiva: ${motivators}
- Aspirações de carreira: ${aspirations}
- O que está desenvolvendo agora: ${skillGoal}

BÚSSOLA DE CARREIRA:
${analysisSummary}

Pontos de atenção:
${keyGaps}

Foco recomendado:
${suggestedFocus}

PDI ATIVO:
${pdiText}

AVALIAÇÃO MAIS RECENTE DO LÍDER:
${reviewText}

REGRAS DE CONDUTA:
- Fale diretamente com ${memberName}, sempre em segunda pessoa
- Seja empático, direto e prático — sem jargão de coach, sem frases motivacionais vazias
- Use o contexto pessoal dele para personalizar cada resposta — nunca dê respostas genéricas que qualquer pessoa poderia receber
- Não revele informações privadas que o líder escreveu sobre ele — você só usa o que foi formalmente compartilhado via avaliação
- Não invente dados — se não tiver contexto suficiente para responder bem, diga isso claramente e peça mais informações
- Termine sempre com uma pergunta reflexiva ou uma ação concreta e específica
- Português brasileiro natural, sem formalidade excessiva
- Tom: parceiro de confiança que conhece você, não chefe nem terapeuta nem palestrante
- Markdown permitido para listas, negrito e estrutura quando ajudar a clareza`;

    const apiMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(historyMessages || []).map((msg: any) => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: question },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: apiMessages,
          max_tokens: 1500,
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
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
      console.error('OpenAI error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Serviço de IA ocupado. Tente novamente em instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Erro na API de IA (${response.status})` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: 'Resposta inválida da IA.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save assistant message
    const assistantInsert: any = {
      user_id: userId,
      thread_id: currentThreadId,
      role: 'assistant',
      content: aiResponse,
    };
    if (memberId) assistantInsert.member_id = memberId;
    await supabase.from('mentor_messages').insert(assistantInsert);

    // Update thread timestamp
    await supabase.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', currentThreadId);

    return new Response(
      JSON.stringify({ response: aiResponse, threadId: currentThreadId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in meu-rhitmo:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
