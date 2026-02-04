import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { question, feedbacks, memberName, memberRole, workStyleData, keyObjectives } = await req.json();

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

    // Ordenar por occurred_at (mais recentes primeiro) e limitar a 50 notas
    const sortedFeedbacks = [...feedbacks].sort((a: any, b: any) => {
      const dateA = new Date(a.occurred_at || a.created_at);
      const dateB = new Date(b.occurred_at || b.created_at);
      return dateB.getTime() - dateA.getTime();
    });

    const recentFeedbacks = sortedFeedbacks.slice(0, 50);
    
    let contextLines = '';
    let totalChars = 0;
    const maxChars = 5000;
    
    for (let idx = 0; idx < recentFeedbacks.length; idx++) {
      const fb = recentFeedbacks[idx];
      const date = new Date(fb.occurred_at || fb.created_at).toLocaleDateString('pt-BR');
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

    // Log com range temporal para debug
    const oldestDate = recentFeedbacks.length > 0 
      ? new Date(recentFeedbacks[recentFeedbacks.length - 1].occurred_at || recentFeedbacks[recentFeedbacks.length - 1].created_at)
      : null;
    const newestDate = recentFeedbacks.length > 0 
      ? new Date(recentFeedbacks[0].occurred_at || recentFeedbacks[0].created_at)
      : null;

    console.log('Context prepared:', { 
      totalChars, 
      notesIncluded: recentFeedbacks.length,
      dateRange: oldestDate && newestDate 
        ? `${oldestDate.toISOString().split('T')[0]} a ${newestDate.toISOString().split('T')[0]}`
        : 'N/A'
    });

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
- Exemplo de resposta calibrada: "Este comportamento está alinhado ao objetivo de aumentar SQLs, pois demonstra proatividade na prospecção"
`
      : `## 🎯 OBJETIVOS DE NEGÓCIO
Nenhum objetivo foi definido pelo gestor.

### COMPORTAMENTO ESPERADO
- Foque 100% na análise comportamental e de liderança
- NÃO tente adivinhar metas de negócio
- Ignore análises de alinhamento a objetivos
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

### EXEMPLO DE COMPORTAMENTO ESPERADO

**User**: "Como cobro o relatório do João?"

**Rhitmo Mentor**: 
"Como o João tem perfil **Analítico/Contexto completo** (Rhitmo Sync), ele responde bem a prazos claros e justificativas. Evite rodeios mas explique o porquê.

📱 **Sugestão para WhatsApp**:
> Oi João! 👋 Precisamos fechar o relatório para a diretoria até amanhã às 14h. Você consegue me enviar a versão final? Se faltar algum dado ou precisar de apoio, me avise agora que a gente resolve junto."

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

## IMPORTANTE: HISTÓRICO TEMPORAL

- O gestor pode ter importado notas antigas de sistemas anteriores
- As datas nas notas podem variar de meses ou anos atrás
- Considere TODO o histórico fornecido para identificar padrões
- Mesmo notas antigas são valiosas para análise comportamental
- Não descarte informações por serem "antigas" - analise tendências ao longo do tempo
- Ao responder, cite as datas das notas relevantes para dar contexto temporal

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
