import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AdjustmentType = "more_specific" | "more_generic" | "adjust_level" | "custom";

function buildPrompt(
  competencyName: string,
  competencyDescription: string,
  jobTitle: string,
  level: string,
  adjustmentType: AdjustmentType,
  customPrompt?: string
): string {
  const context = `Competência atual:\nNome: ${competencyName}\nDescrição: ${competencyDescription}\n\nCargo: ${jobTitle}\nNível: ${level}`;

  switch (adjustmentType) {
    case "more_specific":
      return `${context}\n\nTarefa: Torne a descrição MAIS ESPECÍFICA para o cargo ${jobTitle} nível ${level}.\n\nRegras:\n- Mantenha o nome da competência\n- Use terminologia relevante para ${jobTitle}\n- Seja conciso (1-2 frases, máximo 30 palavras)\n- Mantenha tom profissional`;

    case "more_generic":
      return `${context}\n\nTarefa: Torne a descrição MAIS GENÉRICA (aplicável a múltiplos cargos).\n\nRegras:\n- Mantenha o nome da competência\n- Remova jargões específicos do cargo\n- Torne aplicável a diferentes contextos\n- Seja conciso (1-2 frases, máximo 30 palavras)`;

    case "adjust_level":
      return `${context}\n\nTarefa: Ajuste a descrição para refletir expectativas do nível ${level}.\n\nRegras:\n- Mantenha o nome da competência\n- Júnior: ênfase em execução com supervisão\n- Pleno: ênfase em autonomia e ownership\n- Sênior: ênfase em liderança e mentoria\n- Especialista: ênfase em impacto org-level\n- Seja conciso (1-2 frases, máximo 30 palavras)`;

    case "custom":
      return `${context}\n\nInstrução do usuário:\n${customPrompt}\n\nRegras:\n- Siga a instrução do usuário\n- Mantenha o nome da competência (a menos que pedido para mudar)\n- Seja conciso (máximo 30 palavras na descrição)\n- Mantenha tom profissional`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const {
      competency_name,
      competency_description,
      job_title,
      level,
      adjustment_type,
      custom_prompt,
    } = await req.json();

    if (!competency_name?.trim() || !job_title?.trim() || !adjustment_type) {
      return new Response(
        JSON.stringify({ error: "competency_name, job_title e adjustment_type são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = buildPrompt(
      competency_name,
      competency_description || "",
      job_title,
      level || "Pleno",
      adjustment_type,
      custom_prompt
    );

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em RH que ajusta competências comportamentais. Sempre responda usando a tool fornecida.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_adjusted_competency",
              description: "Retorna a competência ajustada",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nome da competência" },
                  description: { type: "string", description: "Descrição ajustada da competência" },
                },
                required: ["name", "description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_adjusted_competency" } },
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

    const adjusted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(adjusted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("adjust-competency error:", error);
    return new Response(
      JSON.stringify({ error: "Falha ao ajustar competência. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
