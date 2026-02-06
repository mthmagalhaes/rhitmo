import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface JobCraftingInput {
  role: string;
  responsibilities: string[];
  aspirations: string;
  interests: string[];
}

interface CareerAnalysis {
  alignment_score: number;
  analysis_summary: string;
  key_gaps: string[];
  suggested_focus: string[];
}

const CAREER_COACH_SYSTEM_PROMPT = `
Você é um Senior Career Coach especializado em desenvolvimento profissional e alinhamento de carreira.

SUA MISSÃO:
Analisar o perfil profissional de colaboradores e fornecer insights práticos e motivadores sobre seu alinhamento com a função atual e caminho para suas aspirações.

REGRAS DE OURO:
1. Tom sempre motivador e construtivo - nunca crítico ou desanimador
2. NUNCA sugerir demissão, mudança de empresa ou ações drásticas
3. Focar em micro-ações práticas que podem ser implementadas no dia-a-dia
4. Basear análise em padrões de mercado generalizados, não em dados específicos de empresas
5. Ser realista mas otimista sobre o potencial de crescimento

ANÁLISE DEVE INCLUIR:
- Verificar se as responsabilidades listadas são típicas para o cargo informado
- Identificar possíveis desvios de função (fazendo mais ou menos do esperado)
- Cruzar responsabilidades atuais com aspirações para identificar gaps
- Sugerir ações concretas para aproximar o colaborador de suas aspirações
`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { role, responsibilities, aspirations, interests }: JobCraftingInput = await req.json();

    // Validate input
    if (!role || !responsibilities?.length || !aspirations) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: role, responsibilities, aspirations" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[analyze-job-crafting] Analyzing profile for role: ${role}`);

    const userPrompt = `
Analise o seguinte perfil profissional:

CARGO: ${role}

RESPONSABILIDADES ATUAIS:
${responsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}

ASPIRAÇÕES DE DESENVOLVIMENTO:
${aspirations}

ÁREAS DE INTERESSE:
${interests?.length ? interests.join(', ') : 'Não informado'}

Por favor, forneça uma análise estruturada usando a função analyze_career.
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: CAREER_COACH_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_career",
              description: "Retorna análise estruturada do perfil profissional",
              parameters: {
                type: "object",
                properties: {
                  alignment_score: {
                    type: "number",
                    description: "Pontuação de 0 a 100 indicando o alinhamento entre responsabilidades atuais e o cargo. 80-100: excelente, 50-79: moderado, 0-49: oportunidade de realinhamento"
                  },
                  analysis_summary: {
                    type: "string",
                    description: "Resumo motivador da análise em 2-3 frases. Deve destacar pontos fortes e orientar para as aspirações."
                  },
                  key_gaps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de 3 pontos de atenção ou oportunidades identificadas. Cada item deve ser uma frase curta e objetiva."
                  },
                  suggested_focus: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de 3 sugestões práticas e acionáveis para aproximar o colaborador de suas aspirações. Cada sugestão deve ser específica e implementável no curto prazo."
                  }
                },
                required: ["alignment_score", "analysis_summary", "key_gaps", "suggested_focus"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_career" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error(`[analyze-job-crafting] AI gateway error: ${status}`, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Por favor, adicione créditos em Configurações > Workspace > Uso." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway returned ${status}`);
    }

    const data = await response.json();
    console.log(`[analyze-job-crafting] Raw response:`, JSON.stringify(data, null, 2));

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "analyze_career") {
      console.error("[analyze-job-crafting] Unexpected response format:", data);
      throw new Error("AI did not return expected tool call");
    }

    const analysis: CareerAnalysis = JSON.parse(toolCall.function.arguments);

    // Validate and normalize the response
    const validatedAnalysis: CareerAnalysis = {
      alignment_score: Math.min(100, Math.max(0, Math.round(analysis.alignment_score || 70))),
      analysis_summary: analysis.analysis_summary || "Análise em processamento...",
      key_gaps: (analysis.key_gaps || []).slice(0, 3),
      suggested_focus: (analysis.suggested_focus || []).slice(0, 3)
    };

    // Ensure we have exactly 3 items in each array
    while (validatedAnalysis.key_gaps.length < 3) {
      validatedAnalysis.key_gaps.push("Ponto a ser identificado com mais dados");
    }
    while (validatedAnalysis.suggested_focus.length < 3) {
      validatedAnalysis.suggested_focus.push("Conversar com seu líder sobre oportunidades de desenvolvimento");
    }

    console.log(`[analyze-job-crafting] Analysis complete. Score: ${validatedAnalysis.alignment_score}`);

    return new Response(
      JSON.stringify(validatedAnalysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[analyze-job-crafting] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro ao analisar perfil",
        fallback: true
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
