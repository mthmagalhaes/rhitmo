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
    const { question, feedbacks, memberName } = await req.json();

    console.log('Chat mentor request:', { memberName, feedbacksCount: feedbacks?.length });

    if (!question || !feedbacks || !memberName) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros inválidos: question, feedbacks e memberName são obrigatórios' }),
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

    // Limitar a últimas 5 notas e truncar para 5000 caracteres no total
    const recentFeedbacks = feedbacks.slice(0, 5);
    
    let contextLines = '';
    let totalChars = 0;
    const maxChars = 5000;
    
    for (let idx = 0; idx < recentFeedbacks.length; idx++) {
      const fb = recentFeedbacks[idx];
      const date = new Date(fb.created_at).toLocaleDateString('pt-BR');
      const sentiment = fb.sentiment || 'neutro';
      const summary = fb.summary || fb.content.substring(0, 200);
      const coaching = fb.coaching_tips || '';
      
      const noteText = `[Nota ${idx + 1} - ${date} - ${sentiment}]
Resumo: ${summary}
${coaching ? `Dicas: ${coaching}` : ''}
---\n\n`;
      
      if (totalChars + noteText.length > maxChars) {
        break;
      }
      
      contextLines += noteText;
      totalChars += noteText.length;
    }

    if (!contextLines) {
      contextLines = 'Nenhum histórico disponível ainda.';
    }

    console.log('Context prepared:', { totalChars, notesIncluded: recentFeedbacks.length });

    const systemPrompt = `Você é um Mentor Executivo Sênior especializado em desenvolvimento de liderança. 

SEU PAPEL:
- Analisar padrões de comportamento com base em dados concretos
- Oferecer orientações práticas e acionáveis
- Preparar líderes para conversas difíceis
- Identificar áreas de crescimento e pontos fortes

SUA ABORDAGEM:
- Seja prático, analítico e humano
- Evite jargões de autoajuda
- Use os dados fornecidos para embasar suas respostas
- Se não houver informação suficiente, diga que precisa de mais dados
- Seja direto mas empático

CONTEXTO DO LIDERADO:
Nome: ${memberName}
Histórico de feedbacks:

${contextLines}

Base suas respostas exclusivamente nestes dados. Se a pergunta não puder ser respondida com as informações disponíveis, seja transparente sobre isso.`;

    console.log('Calling OpenAI with context length:', systemPrompt.length);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini-2025-08-07',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          max_completion_tokens: 800,
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
      console.error('OpenAI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Erro na API de IA (${response.status}). Tente novamente.` }),
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

    console.log('Mentor response generated successfully');

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
