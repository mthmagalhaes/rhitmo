import { createClient } from "jsr:@supabase/supabase-js@2";
import { RHITMO_IDENTITY, GUARDRAILS_PROMPT } from "../_shared/rhitmo-constitution.ts";

// Lucide SVG icons for review sections (inline, no client JS needed)
const ICON_SUMMARY = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon-svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
const ICON_STRENGTHS = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon-svg"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>`;
const ICON_DEVELOPMENT = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon-svg"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`;
const ICON_NEXT_STEPS = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon-svg"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;

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

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reviewId } = await req.json();
    if (!reviewId) {
      return new Response(JSON.stringify({ error: "reviewId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for data access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch review with member info
    const { data: review, error: reviewError } = await supabase
      .from("performance_reviews")
      .select("*, team_members!performance_reviews_member_id_fkey(id, name, role, work_style_data, feedback_style, recognition_style, chronotype, motivators)")
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      throw new Error("Avaliação não encontrada");
    }

    const member = review.team_members;
    const periodStart = review.period_start;
    const periodEnd = review.period_end;

    console.log(`Generating formal review for ${member.name}, period: ${periodStart} - ${periodEnd}`);

    // Fetch ALL feedbacks in period (full content, not preview)
    const { data: feedbacks } = await supabase
      .from("feedbacks")
      .select("id, content, type, sentiment, tags, occurred_at, summary")
      .eq("member_id", member.id)
      .gte("occurred_at", periodStart)
      .lte("occurred_at", periodEnd)
      .order("occurred_at", { ascending: true });

    // Fetch meeting transcripts in period
    const { data: meetings } = await supabase
      .from("meeting_transcripts")
      .select("id, leader_notes, transcript, extracted_themes, created_at, duration_seconds")
      .eq("member_id", member.id)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd)
      .eq("processing_status", "completed")
      .order("created_at", { ascending: true });

    // Fetch confirmed Rhitmo recaps in period — these are the calibrated spine of the review
    const { data: quarterlies } = await supabase
      .from("quarterly_recaps")
      .select("period_quarter, highlights, recurring_patterns, evolution_vs_previous, classification, turnover_risk, turnover_risk_reason, next_action_key, next_action_note, source_monthly_recap_ids")
      .eq("member_id", member.id)
      .eq("status", "confirmed")
      .gte("period_quarter", periodStart)
      .lte("period_quarter", periodEnd)
      .order("period_quarter", { ascending: true });

    const { data: monthlies } = await supabase
      .from("monthly_recaps")
      .select("period_month, highlight_text, concern_text, dominant_pattern, low_evidence")
      .eq("member_id", member.id)
      .eq("status", "confirmed")
      .gte("period_month", periodStart)
      .lte("period_month", periodEnd)
      .order("period_month", { ascending: true });

    const feedbackCount = feedbacks?.length || 0;
    const meetingCount = meetings?.length || 0;
    const quarterlyCount = quarterlies?.length || 0;
    const monthlyCount = monthlies?.length || 0;
    const totalEvidence = feedbackCount + meetingCount;

    console.log(`Evidence: ${feedbackCount} feedbacks, ${meetingCount} meetings, ${quarterlyCount} quarterlies, ${monthlyCount} monthlies`);

    if (totalEvidence === 0 && quarterlyCount === 0 && monthlyCount === 0) {
      // Update with empty message
      await supabase
        .from("performance_reviews")
        .update({
          content: "<p>Nenhuma evidência encontrada no período selecionado. Adicione anotações, registre 1:1s ou confirme um Resumo Mensal/Trimestral antes de gerar a review.</p>",
          evidence_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reviewId);

      return new Response(
        JSON.stringify({ success: true, content: "", evidence_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build evidence context — recaps confirmados pelo líder vêm PRIMEIRO (são a espinha)
    let evidenceText = "";
    const hasConfirmedRecaps = quarterlyCount > 0 || monthlyCount > 0;

    if (quarterlies && quarterlies.length > 0) {
      evidenceText += "\n## CALIBRAÇÕES TRIMESTRAIS CONFIRMADAS PELO LÍDER (espinha da review):\n\n";
      quarterlies.forEach((q: any) => {
        const qDate = new Date(q.period_quarter);
        const qLabel = `Q${Math.floor(qDate.getUTCMonth() / 3) + 1} ${qDate.getUTCFullYear()}`;
        evidenceText += `### Trimestre ${qLabel}\n`;
        if (Array.isArray(q.highlights) && q.highlights.length > 0) {
          evidenceText += `Destaques validados:\n`;
          q.highlights.forEach((h: any) => {
            evidenceText += `- ${h.title}: ${h.detail} (origem: ${h.source_month})\n`;
          });
        }
        if (Array.isArray(q.recurring_patterns) && q.recurring_patterns.length > 0) {
          evidenceText += `Padrões recorrentes:\n`;
          q.recurring_patterns.forEach((p: any) => {
            evidenceText += `- [${p.polarity}] ${p.pattern} — ${p.frequency_note}\n`;
          });
        }
        if (q.evolution_vs_previous) evidenceText += `Evolução vs trimestre anterior: ${q.evolution_vs_previous}\n`;
        if (q.classification) evidenceText += `Classificação validada: ${q.classification}\n`;
        if (q.turnover_risk) evidenceText += `Risco turnover: ${q.turnover_risk}${q.turnover_risk_reason ? ` (${q.turnover_risk_reason})` : ""}\n`;
        if (q.next_action_key) evidenceText += `Próxima ação acordada: ${q.next_action_key}${q.next_action_note ? ` — ${q.next_action_note}` : ""}\n`;
        evidenceText += "\n";
      });
    }

    if (monthlies && monthlies.length > 0) {
      evidenceText += "\n## RESUMOS MENSAIS CONFIRMADOS PELO LÍDER:\n\n";
      monthlies.forEach((m: any) => {
        const monthLabel = new Date(m.period_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        evidenceText += `### ${monthLabel}${m.low_evidence ? " (poucas evidências)" : ""}\n`;
        if (m.highlight_text) evidenceText += `Mandou bem: ${m.highlight_text}\n`;
        if (m.concern_text) evidenceText += `Atenção: ${m.concern_text}\n`;
        if (m.dominant_pattern) evidenceText += `Padrão do mês: ${m.dominant_pattern}\n`;
        evidenceText += "\n";
      });
    }

    if (feedbacks && feedbacks.length > 0) {
      evidenceText += `\n## ANOTAÇÕES E FEEDBACKS DO LÍDER ${hasConfirmedRecaps ? "(suporte/citação para os recaps acima)" : ""}:\n\n`;
      feedbacks.forEach((f, idx) => {
        const date = new Date(f.occurred_at).toLocaleDateString("pt-BR");
        evidenceText += `[Anotação ${idx + 1} - ${date}] Tipo: ${f.type}\n`;
        evidenceText += `${f.content}\n`;
        if (f.tags && f.tags.length > 0) {
          evidenceText += `Tags: ${f.tags.join(", ")}\n`;
        }
        if (f.summary) {
          evidenceText += `Resumo: ${f.summary}\n`;
        }
        evidenceText += "\n";
      });
    }

    if (meetings && meetings.length > 0) {
      evidenceText += "\n## REUNIÕES 1:1:\n\n";
      meetings.forEach((m, idx) => {
        const date = new Date(m.created_at).toLocaleDateString("pt-BR");
        evidenceText += `[1:1 ${idx + 1} - ${date}]\n`;
        if (m.leader_notes) {
          evidenceText += `Notas do líder: ${m.leader_notes}\n`;
        }
        if (m.transcript) {
          evidenceText += `Transcrição: ${m.transcript.substring(0, 500)}\n`;
        }
        if (m.extracted_themes && m.extracted_themes.length > 0) {
          evidenceText += `Temas: ${m.extracted_themes.join(", ")}\n`;
        }
        evidenceText += "\n";
      });
    }

    const memberName = member.name;
    const firstName = memberName.split(" ")[0];
    const periodLabel = `de ${new Date(periodStart).toLocaleDateString("pt-BR")} a ${new Date(periodEnd).toLocaleDateString("pt-BR")}`;

    const systemPrompt = `# RHITMO - GERADOR DE AVALIAÇÃO FORMAL DE DESEMPENHO

## IDENTIDADE
${RHITMO_IDENTITY}

## REGRAS DE OURO
${GUARDRAILS_PROMPT}

## MISSÃO
Gerar um RASCUNHO de avaliação formal de desempenho para **${memberName}** (${member.role || "cargo não definido"}).
Período: ${periodLabel}.

## CRÍTICO - FORMATO DE OUTPUT
- Retorne APENAS HTML puro, sem explicações
- NÃO use code fences (\`\`\`html ou \`\`\`)
- Comece DIRETAMENTE com <div class="review-section">

## FORMATO DE SAÍDA: HTML COM CLASSES SEMÂNTICAS

Gere HTML estruturado usando EXATAMENTE este formato. Use as classes CSS indicadas — elas serão estilizadas automaticamente.

### ESTRUTURA OBRIGATÓRIA (copie exatamente):

<div class="review-section">
  <div class="section-header">
    <span class="section-icon">{{ICON_SUMMARY}}</span>
    <h2 class="section-title">Resumo Executivo</h2>
  </div>
  <p>Visão geral do período em 2-3 frases.</p>
</div>

<div class="review-section">
  <div class="section-header">
    <span class="section-icon">{{ICON_STRENGTHS}}</span>
    <h2 class="section-title">Pontos Fortes</h2>
  </div>
  <div class="strength-item">
    <h3 class="strength-subtitle">Nome do Ponto Forte</h3>
    <p class="strength-detail">Descrição com evidência. <span class="evidence-tag">(Anotação de 12/mar)</span></p>
  </div>
  <!-- Repetir strength-item para cada ponto forte (2-4 itens) -->
</div>

<div class="review-section">
  <div class="section-header">
    <span class="section-icon">{{ICON_DEVELOPMENT}}</span>
    <h2 class="section-title">Áreas de Desenvolvimento</h2>
  </div>
  <div class="development-item">
    <h3 class="development-subtitle">Nome da Área</h3>
    <p class="development-detail">Descrição construtiva com evidência. <span class="evidence-tag">(1:1 de 15/fev)</span></p>
  </div>
  <!-- Repetir development-item para cada área (1-3 itens) -->
</div>

<div class="review-section">
  <div class="section-header">
    <span class="section-icon">{{ICON_NEXT_STEPS}}</span>
    <h2 class="section-title">Próximos Passos</h2>
  </div>
  <ul class="next-steps-list">
    <li>Ação concreta e mensurável 1</li>
    <li>Ação concreta e mensurável 2</li>
    <li>Ação concreta e mensurável 3</li>
  </ul>
</div>

## REGRAS CRÍTICAS

1. **Anti-Alucinação**: Use APENAS as evidências fornecidas. Cite a fonte com <span class="evidence-tag">(Anotação de 12/mar)</span> ou <span class="evidence-tag">(1:1 de 15/fev)</span>.
2. **NÃO invente** fatos, comportamentos ou situações não documentados.
3. **Se houver poucas evidências**, seja honesto: "Com base nas evidências disponíveis..."
4. **Tom**: Profissional, construtivo, respeitoso.
5. **Tamanho**: 200-400 palavras no total.
6. **Foco em ${memberName}**: Analise APENAS ações de ${firstName}. Ignore ações de outras pessoas.
7. Liste 2-4 pontos fortes e 1-3 áreas de desenvolvimento.
8. **NÃO use Markdown** (##, **, -, etc.). Use APENAS o HTML com classes indicado acima.
9. **NÃO use blocos de código**. Retorne HTML puro.
10. **PRIORIDADE DOS RECAPS RHITMO**: Se houver "CALIBRAÇÕES TRIMESTRAIS CONFIRMADAS PELO LÍDER" ou "RESUMOS MENSAIS CONFIRMADOS PELO LÍDER" no contexto, eles são a **espinha** da review — o líder já calibrou esses padrões. Estruture a review em cima deles. Use os feedbacks brutos APENAS como suporte/citação. NÃO refaça a calibração que o líder já validou. Quando citar, prefira referências aos trimestres/meses confirmados (ex: <span class="evidence-tag">(Trimestral Q1 2026)</span> ou <span class="evidence-tag">(Mensal de fev/2026)</span>).`;

    const userPrompt = `EVIDÊNCIAS DO PERÍODO (${quarterlyCount} trimestral${quarterlyCount === 1 ? "" : "is"} confirmado${quarterlyCount === 1 ? "" : "s"}, ${monthlyCount} mensal${monthlyCount === 1 ? "" : "is"} confirmado${monthlyCount === 1 ? "" : "s"}, ${totalEvidence} registros brutos):

${evidenceText}

Gere a avaliação formal de desempenho de ${memberName} em HTML puro, seguindo a estrutura obrigatória.${hasConfirmedRecaps ? " Lembre-se: os recaps confirmados pelo líder são a espinha — não recomece do zero." : ""}`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log("Calling Lovable AI...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let aiResponse;
    try {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      const err = fetchError as { name?: string };
      if (err.name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "Timeout na geração. Tente novamente." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchError;
    }

    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let generatedContent = aiData.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error("IA não retornou conteúdo");
    }

    // Replace icon placeholders with Lucide SVGs
    generatedContent = generatedContent
      .replace(/\{\{ICON_SUMMARY\}\}/g, ICON_SUMMARY)
      .replace(/\{\{ICON_STRENGTHS\}\}/g, ICON_STRENGTHS)
      .replace(/\{\{ICON_DEVELOPMENT\}\}/g, ICON_DEVELOPMENT)
      .replace(/\{\{ICON_NEXT_STEPS\}\}/g, ICON_NEXT_STEPS);

    // Strip Markdown code fences
    generatedContent = generatedContent
      .replace(/^```html\n?/gm, '')
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();

    console.log("Review generated successfully");

    // Generate coaching tip (second AI call)
    let coachingTip = null;
    try {
      const workStyle = member.work_style_data;
      const feedbackStyle = member.feedback_style;
      const recognitionStyle = member.recognition_style;
      const chronotype = member.chronotype;
      const motivators = member.motivators;

      const hasProfile = workStyle || feedbackStyle || recognitionStyle || chronotype || motivators;

      let profileContext = "";
      if (hasProfile) {
        profileContext = `## PERFIL RHITMO SYNC DO LIDERADO:\n`;
        if (workStyle && typeof workStyle === "object") {
          profileContext += `- Estilo de trabalho: ${JSON.stringify(workStyle)}\n`;
        }
        if (feedbackStyle) profileContext += `- Estilo de feedback preferido: ${feedbackStyle}\n`;
        if (recognitionStyle) profileContext += `- Estilo de reconhecimento: ${recognitionStyle}\n`;
        if (chronotype) profileContext += `- Cronotipo: ${chronotype}\n`;
        if (motivators && Array.isArray(motivators) && motivators.length > 0) {
          profileContext += `- Motivadores: ${JSON.stringify(motivators)}\n`;
        }
      }

      const coachingSystemPrompt = `${RHITMO_IDENTITY}

Você é um coach de liderança especializado em ajudar líderes a conduzir conversas de feedback de forma eficaz e empática.

Gere dicas práticas e personalizadas para o líder conduzir a conversa de apresentação desta avaliação formal com ${firstName}.

${hasProfile ? profileContext : "⚠️ O perfil Rhitmo Sync deste liderado ainda não foi preenchido. As dicas abaixo são genéricas. Quando o liderado preencher seu perfil, as dicas serão personalizadas."}

## REGRAS:
- Gere 3-5 dicas curtas e acionáveis em Markdown (lista com -)
- Se houver perfil, calibre as dicas pelo estilo de comunicação e preferências do liderado
- Inclua sugestões sobre: tom da conversa, ordem de apresentação (começar por pontos fortes?), como abordar áreas de desenvolvimento, e como encerrar a conversa
- Máximo 150 palavras
- Tom: profissional, empático, prático`;

      const coachingUserPrompt = `Avaliação que será apresentada:\n\n${generatedContent.substring(0, 1500)}`;

      const coachingResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: coachingSystemPrompt },
            { role: "user", content: coachingUserPrompt },
          ],
        }),
      });

      if (coachingResponse.ok) {
        const coachingData = await coachingResponse.json();
        coachingTip = coachingData.choices?.[0]?.message?.content || null;
        console.log("Coaching tip generated successfully");
      } else {
        console.error("Coaching tip generation failed:", coachingResponse.status);
      }
    } catch (coachingError) {
      console.error("Error generating coaching tip:", coachingError);
    }

    // Save to database
    const updatePayload: Record<string, unknown> = {
      content: generatedContent,
      evidence_count: totalEvidence,
      updated_at: new Date().toISOString(),
    };
    if (coachingTip) {
      updatePayload.coaching_tip = coachingTip;
    }

    const { error: updateError } = await supabase
      .from("performance_reviews")
      .update(updatePayload)
      .eq("id", reviewId);

    if (updateError) {
      console.error("DB update error:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
        evidence_count: totalEvidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-formal-review:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
