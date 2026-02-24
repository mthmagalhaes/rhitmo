import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RHITMO_IDENTITY, GUARDRAILS_PROMPT } from "../_shared/rhitmo-constitution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { meetingId } = await req.json();
    if (!meetingId) {
      return new Response(JSON.stringify({ error: "meetingId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for reads and cache writes
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. Fetch meeting
    const { data: meeting, error: meetingErr } = await adminClient
      .from("upcoming_meetings")
      .select("*")
      .eq("id", meetingId)
      .single();

    if (meetingErr || !meeting) {
      return new Response(JSON.stringify({ error: "Meeting not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (meeting.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!meeting.member_id) {
      return new Response(
        JSON.stringify({ error: "Meeting has no linked member" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch member
    const { data: member } = await adminClient
      .from("team_members")
      .select("id, name, role, work_style_data")
      .eq("id", meeting.member_id)
      .single();

    const memberName = member?.name ?? "Liderado";
    const memberRole = member?.role ?? "";

    // 4. Fetch pending action items from last 10 feedbacks
    const { data: feedbacks } = await adminClient
      .from("feedbacks")
      .select("action_items, title, occurred_at")
      .eq("member_id", meeting.member_id)
      .neq("action_items", "[]")
      .order("occurred_at", { ascending: false })
      .limit(10);

    const pendingItems: { description: string; from_note: string; date: string }[] = [];
    if (feedbacks) {
      for (const fb of feedbacks) {
        const items = fb.action_items as any[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (item.status === "done") continue;
          pendingItems.push({
            description: item.text || item.description || String(item),
            from_note: fb.title || "Nota sem título",
            date: fb.occurred_at ? new Date(fb.occurred_at).toLocaleDateString("pt-BR") : "",
          });
          if (pendingItems.length >= 10) break;
        }
        if (pendingItems.length >= 10) break;
      }
    }

    // 5. Fetch last 5 notes for context
    const { data: recentNotes } = await adminClient
      .from("feedbacks")
      .select("title, content, occurred_at")
      .eq("member_id", meeting.member_id)
      .order("occurred_at", { ascending: false })
      .limit(5);

    const notesContext = (recentNotes || [])
      .map(
        (n) =>
          `- [${new Date(n.occurred_at).toLocaleDateString("pt-BR")}] ${n.title || "Sem título"}: ${(n.content || "").substring(0, 300)}`
      )
      .join("\n");

    const pendingContext =
      pendingItems.length > 0
        ? pendingItems.map((p) => `- ${p.description} (de: ${p.from_note}, ${p.date})`).join("\n")
        : "Nenhuma pendência identificada.";

    const startFormatted = new Date(meeting.start_time).toLocaleString("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // 6. Call AI with tool calling
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Você está preparando um brief pré-reunião para o líder.

Reunião: ${meeting.title || "1:1"} com ${memberName} (${memberRole})
Data/hora: ${startFormatted}

Histórico recente (últimas notas):
${notesContext || "Nenhuma nota registrada ainda."}

Action items pendentes:
${pendingContext}

Gere um brief estruturado usando a função generate_brief.
Máximo 3 itens de agenda. Máximo 5 pendências.
Baseie-se APENAS nas notas fornecidas. Se não há notas, sugira tópicos genéricos de 1:1 como check-in de bem-estar e alinhamento de prioridades.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: RHITMO_IDENTITY + "\n" + GUARDRAILS_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_brief",
              description: "Generate a structured pre-meeting brief",
              parameters: {
                type: "object",
                properties: {
                  suggested_agenda: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string" },
                        rationale: { type: "string" },
                      },
                      required: ["topic", "rationale"],
                      additionalProperties: false,
                    },
                  },
                  pending_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        from_note: { type: "string" },
                        date: { type: "string" },
                      },
                      required: ["description", "from_note", "date"],
                      additionalProperties: false,
                    },
                  },
                  context_summary: { type: "string" },
                  coaching_reminder: { type: "string" },
                },
                required: ["suggested_agenda", "pending_items", "context_summary", "coaching_reminder"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_brief" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI error:", status, errorText);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let brief: any;

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      brief = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content as JSON
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        brief = JSON.parse(jsonMatch[0]);
      } else {
        brief = {
          suggested_agenda: [{ topic: "Check-in geral", rationale: "Alinhar prioridades da semana" }],
          pending_items: [],
          context_summary: "Sem histórico suficiente para gerar contexto detalhado.",
          coaching_reminder: "Comece a reunião perguntando como o liderado está se sentindo.",
        };
      }
    }

    // 8. Cache the brief
    await adminClient
      .from("upcoming_meetings")
      .update({
        brief_cache: brief,
        brief_generated_at: new Date().toISOString(),
      })
      .eq("id", meetingId);

    // 9. Return
    return new Response(JSON.stringify({ brief, member_name: memberName, member_id: meeting.member_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-brief error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
