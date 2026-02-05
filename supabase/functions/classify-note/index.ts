 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const VALID_TAGS = ["1:1", "PDI", "Feedback Difícil", "Check-in", "Reunião Geral", "Brainstorming"];
 
 serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     // Validate authentication
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       return new Response(
         JSON.stringify({ error: "Não autorizado" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const supabaseClient = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_ANON_KEY") ?? "",
       { global: { headers: { Authorization: authHeader } } }
     );
 
     const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
     if (userError || !user) {
       console.error("Auth error:", userError);
       return new Response(
         JSON.stringify({ error: "Usuário não autenticado" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Parse request body
     const { content } = await req.json();
 
     if (!content || typeof content !== "string" || content.trim().length < 10) {
       return new Response(
         JSON.stringify({ error: "Conteúdo muito curto para classificar" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) {
       console.error("LOVABLE_API_KEY not configured");
       return new Response(
         JSON.stringify({ error: "Configuração de IA não encontrada" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log(`[classify-note] Processing for user ${user.id}, content length: ${content.length}`);
 
     // Truncate content to avoid token limits (first 8000 chars should be enough for classification)
     const truncatedContent = content.slice(0, 8000);
 
     const systemPrompt = `Você é um classificador de reuniões corporativas. Analise o texto e retorne ATÉ 2 tags desta lista:
 
 🎯 1:1 - Conversas individuais livres, alinhamento semanal, conexão pessoal
 🚀 PDI - Conversas sobre carreira, futuro, promoções, desenvolvimento de skills
 🚨 Feedback Difícil - Correção de rota, performance baixa, comportamento inadequado, demissão
 ✅ Check-in - Status report, acompanhamento de projetos, prazos, burocracia do dia a dia
 📢 Reunião Geral - Reuniões com 3+ pessoas, alinhamentos de área, townhalls
 🧠 Brainstorming - Ideação, resolução de problemas complexos sem pauta fixa
 
 REGRAS:
 1. Se não tiver certeza absoluta, use apenas UMA tag
 2. Se for misto (ex: 1:1 que virou PDI), use as DUAS tags relevantes
 3. SEMPRE retorne pelo menos uma tag
 4. Retorne APENAS os nomes das tags, sem emojis`;
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-2.5-flash",
         messages: [
           { role: "system", content: systemPrompt },
           { role: "user", content: `Classifique esta reunião/anotação:\n\n${truncatedContent}` }
         ],
         tools: [{
           type: "function",
           function: {
             name: "classify_note",
             description: "Retorna as tags de classificação da nota",
             parameters: {
               type: "object",
               properties: {
                 tags: {
                   type: "array",
                   description: "Lista de tags (máximo 2)",
                   items: { 
                     type: "string",
                     enum: VALID_TAGS
                   }
                 }
               },
               required: ["tags"]
             }
           }
         }],
         tool_choice: { type: "function", function: { name: "classify_note" } }
       }),
     });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error("AI Gateway error:", response.status, errorText);
       
       if (response.status === 429) {
         return new Response(
           JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }),
           { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       if (response.status === 402) {
         return new Response(
           JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no workspace." }),
           { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       
       return new Response(
         JSON.stringify({ error: "Erro ao classificar nota" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const aiResponse = await response.json();
     console.log("[classify-note] AI response:", JSON.stringify(aiResponse));
 
     // Extract tags from tool call response
     let tags: string[] = [];
     
     const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
     if (toolCall?.function?.arguments) {
       try {
         const args = JSON.parse(toolCall.function.arguments);
         if (Array.isArray(args.tags)) {
           // Filter to only valid tags and limit to 2
           tags = args.tags
             .filter((t: string) => VALID_TAGS.includes(t))
             .slice(0, 2);
         }
       } catch (parseError) {
         console.error("Error parsing tool call arguments:", parseError);
       }
     }
 
     // Fallback: if no tags, default to Check-in
     if (tags.length === 0) {
       console.warn("[classify-note] No valid tags found, defaulting to Check-in");
       tags = ["Check-in"];
     }
 
     console.log(`[classify-note] Final tags: ${JSON.stringify(tags)}`);
 
     return new Response(
       JSON.stringify({ tags }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
 
   } catch (error) {
     console.error("[classify-note] Unexpected error:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });