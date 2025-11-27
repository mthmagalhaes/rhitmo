import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
      throw new Error('Parâmetros inválidos: question, feedbacks e memberName são obrigatórios');
    }

    // Formatar contexto RAG com feedbacks
    const contextLines = feedbacks
      .map((fb: any, idx: number) => {
        const date = new Date(fb.created_at).toLocaleDateString('pt-BR');
        const sentiment = fb.sentiment || 'neutro';
        const summary = fb.summary || fb.content.substring(0, 200);
        const coaching = fb.coaching_tips || '';
        
        return `[Nota ${idx + 1} - ${date} - ${sentiment}]
Resumo: ${summary}
${coaching ? `Dicas: ${coaching}` : ''}
---`;
      })
      .join('\n\n');

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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
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
