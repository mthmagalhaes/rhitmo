import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, memberName, leaderNotes } = await req.json();
    
    if (!transcript) {
      throw new Error('No transcript provided');
    }

    if (!memberName) {
      throw new Error('No member name provided');
    }

    console.log(`Processing meeting for ${memberName}, transcript length: ${transcript.length}`);
    console.log(`Leader notes: ${leaderNotes || 'None provided'}`);

    const systemPrompt = `# RHITMO MEETING ANALYST

## CONTEXTO DA REUNIÃO
Esta é uma transcrição de 1:1 entre um LÍDER (gerente/gestor) e ${memberName} (o liderado/colaborador direto).

## NOTAS DO LÍDER (Referência crucial para identificar quem está falando)
${leaderNotes || 'Nenhuma nota fornecida'}

## REGRAS DE IDENTIFICAÇÃO DE FALANTES
1. O LÍDER geralmente faz perguntas, conduz a conversa, dá orientações
2. ${memberName} (liderado) relata situações, responde, compartilha dificuldades, apresenta resultados
3. Use as notas do líder como pista - quando ele escreve "${memberName} disse...", a fala correspondente na transcrição é de ${memberName}
4. Contexto é importante: se alguém está "reportando" algo, provavelmente é ${memberName}
5. Na dúvida, prefira NÃO atribuir do que atribuir errado

## EXTRAÇÃO DE COMPORTAMENTOS
Extraia comportamentos observáveis APENAS de ${memberName}:
- Foque em soft skills: comunicação, iniciativa, colaboração, resiliência, autonomia, criatividade
- Observe padrões de comportamento, não apenas fatos
- Cada feedback deve ter evidência clara da transcrição
- Não invente - se não conseguir identificar claramente que é ${memberName} falando, não inclua
- Limite de 10 feedbacks máximo (qualidade > quantidade)

## TIPOS DE FEEDBACK
- "positive": Comportamentos a reforçar e celebrar
- "development": Áreas de crescimento e oportunidades de melhoria

## OUTPUT OBRIGATÓRIO (JSON válido)
{
  "feedbacks": [
    {
      "id": "fb_1",
      "type": "positive" | "development",
      "content": "Descrição objetiva do comportamento de ${memberName}",
      "evidence": "Trecho exato da transcrição que comprova",
      "coaching_tip": "Sugestão prática para o líder trabalhar esse ponto"
    }
  ],
  "commitments": ["Compromissos explícitos mencionados por ${memberName}"],
  "themes": ["Temas principais da conversa para acompanhamento"]
}

IMPORTANTE:
- Retorne APENAS o JSON, sem texto adicional
- Se não encontrar comportamentos claros de ${memberName}, retorne arrays vazios
- Seja conservador: é melhor menos feedbacks precisos do que muitos imprecisos`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `TRANSCRIÇÃO DA REUNIÃO:\n\n${transcript}` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('Meeting analysis complete');
    
    // Parse JSON response
    const analysis = JSON.parse(content);
    
    // Validate structure
    if (!analysis.feedbacks) analysis.feedbacks = [];
    if (!analysis.commitments) analysis.commitments = [];
    if (!analysis.themes) analysis.themes = [];

    console.log(`Extracted ${analysis.feedbacks.length} feedbacks, ${analysis.commitments.length} commitments, ${analysis.themes.length} themes`);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Meeting processing error:', errorMessage);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        feedbacks: [],
        commitments: [],
        themes: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
