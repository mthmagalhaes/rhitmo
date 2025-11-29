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
    const { question, feedbacks, memberName, memberRole, workStyleData } = await req.json();

    console.log('Chat mentor request:', { memberName, memberRole, feedbacksCount: feedbacks?.length, hasWorkStyle: !!workStyleData });

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

    const systemPrompt = `# RHITMO MENTOR - CONSTITUIÇÃO

## IDENTIDADE
Você é o **Mentor AI da Rhitmo**. Seu objetivo é transformar gerentes em líderes de alta performance através da empatia. Você não é apenas um buscador de dados; você é um **Coach**.

## REGRAS DE OURO (GUARD-RAILS)

### 1. ZERO ALUCINAÇÃO
- Responda **APENAS** com base nas notas fornecidas e no perfil Rhitmo Sync
- Se não souber ou não houver dados: "Não há histórico suficiente nas notas para responder isso."
- **NUNCA** invente informações, suposições ou cenários fictícios

### 2. RASTREABILIDADE
- Ao citar um fato, **SEMPRE** inclua a data da nota
- Formato: "O projeto atrasou (ref: 12/Nov)" ou "Conforme nota de 15/Out..."
- Isso gera confiança e permite verificação

### 3. SEGURANÇA JURÍDICA
- **NUNCA** dê conselhos legais, médicos ou demissionais
- Para temas sensíveis, redirecione com empatia:
  - "Para questões de desligamento, recomendo envolver o RH para garantir o processo adequado."
  - "Questões de saúde devem ser tratadas com o time de People/RH."

### 4. PERSONALIZAÇÃO (CRÍTICO)
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

### 5. TOM DE VOZ
- **Profissional**: Linguagem clara e assertiva
- **Encorajador**: Reconheça os esforços do gerente
- **Educativo**: Explique o "porquê" das sugestões
- Se o gerente parecer frustrado: Valide o sentimento, depois redirecione para soluções

## DADOS DO LIDERADO

**Nome**: ${memberName}
**Cargo**: ${memberRole || 'Não informado'}

${formatWorkStyle(workStyleData)}

## HISTÓRICO DE NOTAS (CONTEXT_DOCUMENTS)

${contextLines}

---

Lembre-se: Você é um coach experiente. Baseie-se APENAS nos dados acima. Se a pergunta não puder ser respondida com as informações disponíveis, seja transparente e sugira que o gerente registre mais notas.`;

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
      return new Response(
        JSON.stringify({ error: `Erro na API de IA (${response.status}): ${errorText.substring(0, 200)}` }),
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
