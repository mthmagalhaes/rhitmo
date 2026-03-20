import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { job_title, level = "Pleno", industry = "Tecnologia" } = await req.json();

    if (!job_title?.trim()) {
      return new Response(JSON.stringify({ error: "job_title é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Você é um especialista em RH e desenvolvimento de competências comportamentais. Gere competências comportamentais em português brasileiro para o cargo informado. Foque em competências comportamentais (não técnicas), específicas para o cargo, com linguagem positiva e orientada a resultados.`;

    const userPrompt = `Gere 7 competências comportamentais essenciais para o cargo de "${job_title}" (nível ${level}, indústria ${industry}).

Para cada competência, forneça:
- name: Nome (2-4 palavras)
- description: Descrição concisa (1 frase, 15-25 palavras)
- levels: Array com 4 objetos, um para cada nível de senioridade (junior, pleno, senior, especialista), cada um com:
  - seniority_level: "junior" | "pleno" | "senior" | "especialista"
  - description: Comportamento esperado neste nível (20-40 palavras, começando com verbo)
  - examples: Array de 2 exemplos práticos observáveis (8-12 palavras cada)

Seja específico para o cargo. Evite genéricos como "trabalho em equipe".`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_competencies",
              description: "Return generated behavioral competencies for the given role",
              parameters: {
                type: "object",
                properties: {
                  competencies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        levels: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              seniority_level: {
                                type: "string",
                                enum: ["junior", "pleno", "senior", "especialista"],
                              },
                              description: { type: "string" },
                              examples: {
                                type: "array",
                                items: { type: "string" },
                              },
                            },
                            required: ["seniority_level", "description", "examples"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name", "description", "levels"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["competencies"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_competencies" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na área de configurações." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-competencies error:", error);
    return new Response(
      JSON.stringify({ error: "Falha ao gerar competências. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
