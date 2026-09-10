import { createClient } from "jsr:@supabase/supabase-js@2";
import { RHITMO_IDENTITY } from "../_shared/rhitmo-constitution.ts";
import { composeSystemPrompt } from "../_shared/soul/loader.ts";

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

    // Fetch review with member info AND ownership chain
    const { data: review, error: reviewError } = await supabase
      .from("performance_reviews")
      .select("*, team_members!performance_reviews_member_id_fkey(id, name, role, work_style_data, feedback_style, recognition_style, chronotype, motivators, teams!inner(leader_user_id, workspaces!inner(owner_id)))")
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      throw new Error("Avaliação não encontrada");
    }

    // SECURITY: ownership check — caller must be the review author, the
    // member's current team leader, or the workspace owner. Without this,
    // any signed-in user could regenerate any other workspace's reviews
    // because the data fetches above run under service_role.
    const callerId = userData.user.id;
    const reviewAuthorId = (review as any).manager_id ?? (review as any).author_id ?? null;
    const team = (review as any).team_members?.teams;
    const teamLeaderId = team?.leader_user_id ?? null;
    const workspaceOwnerId = team?.workspaces?.owner_id ?? null;

    const allowed =
      callerId === reviewAuthorId ||
      callerId === teamLeaderId ||
      callerId === workspaceOwnerId;

    if (!allowed) {
      console.error("[generate-formal-review] ownership check failed", {
        callerId, reviewAuthorId, teamLeaderId, workspaceOwnerId, reviewId,
      });
      return new Response(
        JSON.stringify({ error: "Você não tem permissão para gerar esta avaliação" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const member = review.team_members;
    const periodStart = review.period_start;
    const periodEnd = review.period_end;

    console.log(`Generating formal review for ${member.name}, period: ${periodStart} - ${periodEnd}`);

    // Fetch ALL feedbacks in period (full content, not preview)
    const { data: feedbacks } = await supabase
      .from("feedbacks")
      .select("id, content, type, sentiment, tags, occurred_at, summary, source, source_fidelity")
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

    // Fetch context_evidence (Slack rollups, network signals, processed pulses, etc.)
    const { data: ctxEvidence } = await supabase
      .from("context_evidence")
      .select("id, evidence_type, source_table, occurred_at, title, summary, sentiment, tags")
      .eq("member_id", member.id)
      .gte("occurred_at", periodStart)
      .lte("occurred_at", periodEnd)
      .order("occurred_at", { ascending: true });

    // Fetch pulse_surveys answered in period
    const { data: pulses } = await supabase
      .from("pulse_surveys")
      .select("id, type, name, motivation, anonymity, summary, responses, completed_at")
      .eq("member_id", member.id)
      .eq("status", "completed")
      .gte("completed_at", periodStart)
      .lte("completed_at", periodEnd)
      .order("completed_at", { ascending: true });

    // Fetch peer feedback responses in period
    const { data: peerResponses } = await supabase
      .from("peer_feedback_requests")
      .select("id, response_text, edge_strength_at_request, responded_at")
      .eq("subject_member_id", member.id)
      .eq("status", "answered")
      .gte("responded_at", periodStart)
      .lte("responded_at", periodEnd)
      .order("responded_at", { ascending: true });

    // Fetch 360° reviews (self/peer/upwards) about this member in period
    const { data: reviews360 } = await supabase
      .from("performance_reviews")
      .select("id, review_type, content, classification, created_at")
      .eq("member_id", member.id)
      .in("review_type", ["self", "peer", "upwards"])
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd)
      .order("created_at", { ascending: true });

    // Fetch confirmed Rhitmo recaps in period — used as a CALIBRATION LAYER (not the spine)
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
    const ctxCount = ctxEvidence?.length || 0;
    const pulseCount = pulses?.length || 0;
    const peerCount = peerResponses?.length || 0;
    const reviews360Count = reviews360?.length || 0;
    const quarterlyCount = quarterlies?.length || 0;
    const monthlyCount = monthlies?.length || 0;
    const totalRawEvidence = feedbackCount + meetingCount + ctxCount + pulseCount + peerCount + reviews360Count;
    const totalEvidence = totalRawEvidence; // for evidence_count in DB

    console.log(`Evidence: ${feedbackCount} feedbacks, ${meetingCount} meetings, ${ctxCount} ctx, ${pulseCount} pulses, ${peerCount} peers, ${reviews360Count} 360°, ${quarterlyCount} quarterlies, ${monthlyCount} monthlies`);

    if (totalRawEvidence === 0 && quarterlyCount === 0 && monthlyCount === 0) {
      // Update with empty message
      await supabase
        .from("performance_reviews")
        .update({
          content: "<p>Nenhuma evidência encontrada no período selecionado. Adicione anotações, registre 1:1s, lance pulses ou confirme um Resumo Mensal/Trimestral antes de gerar a review.</p>",
          evidence_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reviewId);

      return new Response(
        JSON.stringify({ success: true, content: "", evidence_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build evidence context — RAW evidence first (the base), recaps last (calibration layer)
    let evidenceText = "";
    const hasConfirmedRecaps = quarterlyCount > 0 || monthlyCount > 0;
    const lowRawEvidence = totalRawEvidence < 3;

    // ============ RAW EVIDENCE (base of the review) ============
    if (feedbacks && feedbacks.length > 0) {
      evidenceText += "\n## 📝 ANOTAÇÕES E FEEDBACKS DO LÍDER:\n\n";
      feedbacks.forEach((f, idx) => {
        const date = new Date(f.occurred_at).toLocaleDateString("pt-BR");
        // Fidelidade da matéria-prima: fala literal (transcrição) vs resumo do provedor.
        const fidelity = (f as { source_fidelity?: string | null }).source_fidelity;
        const fidelityLabel =
          fidelity === "transcript"
            ? " Fidelidade: fala literal"
            : fidelity === "summary"
              ? " Fidelidade: resumo do provedor (parafraseie, não cite como fala literal)"
              : "";
        evidenceText += `[Anotação ${idx + 1} - ${date}] [doc_id: ${f.id}] Tipo: ${f.type}${fidelityLabel}\n`;
        evidenceText += `${f.content}\n`;
        if (f.tags && f.tags.length > 0) evidenceText += `Tags: ${f.tags.join(", ")}\n`;
        if (f.summary) evidenceText += `Resumo: ${f.summary}\n`;
        evidenceText += "\n";
      });
    }

    if (meetings && meetings.length > 0) {
      evidenceText += "\n## 🎙️ REUNIÕES 1:1:\n\n";
      meetings.forEach((m, idx) => {
        const date = new Date(m.created_at).toLocaleDateString("pt-BR");
        evidenceText += `[1:1 ${idx + 1} - ${date}] [doc_id: ${m.id}]\n`;
        if (m.leader_notes) evidenceText += `Notas do líder: ${m.leader_notes}\n`;
        if (m.transcript) evidenceText += `Transcrição: ${m.transcript.substring(0, 500)}\n`;
        if (m.extracted_themes && m.extracted_themes.length > 0) {
          evidenceText += `Temas: ${m.extracted_themes.join(", ")}\n`;
        }
        evidenceText += "\n";
      });
    }

    if (ctxEvidence && ctxEvidence.length > 0) {
      evidenceText += "\n## 🌐 SINAIS DE CONTEXTO (Slack, rede, pulses processados):\n\n";
      ctxEvidence.forEach((e: any, idx: number) => {
        const date = new Date(e.occurred_at).toLocaleDateString("pt-BR");
        evidenceText += `[Sinal ${idx + 1} - ${date}] [doc_id: ${e.id}] Tipo: ${e.evidence_type}\n`;
        if (e.title) evidenceText += `Título: ${e.title}\n`;
        if (e.summary) evidenceText += `Resumo: ${e.summary}\n`;
        if (e.sentiment) evidenceText += `Sentimento: ${e.sentiment}\n`;
        if (e.tags && e.tags.length > 0) evidenceText += `Tags: ${e.tags.join(", ")}\n`;
        evidenceText += "\n";
      });
    }

    if (pulses && pulses.length > 0) {
      evidenceText += "\n## 💓 PULSES RESPONDIDOS PELO LIDERADO:\n\n";
      pulses.forEach((p: any, idx: number) => {
        const date = p.completed_at ? new Date(p.completed_at).toLocaleDateString("pt-BR") : "—";
        evidenceText += `[Pulse ${idx + 1} - ${date}] [doc_id: ${p.id}] Tipo: ${p.type}${p.name ? ` (${p.name})` : ""}\n`;
        if (p.motivation) evidenceText += `Motivação do líder: ${p.motivation}\n`;
        if (p.summary) evidenceText += `Resumo IA: ${typeof p.summary === "string" ? p.summary : JSON.stringify(p.summary)}\n`;
        if (Array.isArray(p.responses) && p.responses.length > 0) {
          const preview = JSON.stringify(p.responses).substring(0, 400);
          evidenceText += `Respostas: ${preview}\n`;
        }
        evidenceText += `Anonimato: ${p.anonymity}\n\n`;
      });
    }

    if (peerResponses && peerResponses.length > 0) {
      evidenceText += "\n## 👥 RESPOSTAS DE PARES (peer feedback):\n\n";
      peerResponses.forEach((p: any, idx: number) => {
        const date = p.responded_at ? new Date(p.responded_at).toLocaleDateString("pt-BR") : "—";
        evidenceText += `[Par ${idx + 1} - ${date}] [doc_id: ${p.id}] Força do laço: ${p.edge_strength_at_request}\n`;
        if (p.response_text) evidenceText += `Resposta (par anônimo): ${p.response_text}\n`;
        evidenceText += "\n";
      });
    }

    if (reviews360 && reviews360.length > 0) {
      evidenceText += "\n## 🔄 AVALIAÇÕES 360° (autoavaliação / pares / upwards):\n\n";
      reviews360.forEach((r: any, idx: number) => {
        const date = new Date(r.created_at).toLocaleDateString("pt-BR");
        const typeLabel = r.review_type === "self" ? "Autoavaliação" : r.review_type === "peer" ? "Avaliação de par" : "Upwards (liderado avalia líder)";
        evidenceText += `[${typeLabel} ${idx + 1} - ${date}] [doc_id: ${r.id}]\n`;
        // Strip HTML tags from content for the prompt (Tiptap stores HTML)
        const plain = (r.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 800);
        if (plain) evidenceText += `${plain}\n`;
        if (r.classification) evidenceText += `Classificação sugerida: ${r.classification}\n`;
        evidenceText += "\n";
      });
    }

    // ============ CALIBRATION LAYER (recaps confirmed by leader) ============
    if (hasConfirmedRecaps) {
      evidenceText += "\n## 🧭 CALIBRAÇÕES JÁ CONFIRMADAS PELO LÍDER (camada de contexto, NÃO única fonte):\n\n";
      evidenceText += "_Use estes recaps para ancorar/triangular conclusões sobre os blocos 3, 5 e 6 — mas a base da review são as evidências cruas acima._\n\n";
    }

    if (quarterlies && quarterlies.length > 0) {
      evidenceText += "### Trimestrais confirmados\n\n";
      quarterlies.forEach((q: any) => {
        const qDate = new Date(q.period_quarter);
        const qLabel = `Q${Math.floor(qDate.getUTCMonth() / 3) + 1} ${qDate.getUTCFullYear()}`;
        evidenceText += `**Trimestre ${qLabel}**\n`;
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
      evidenceText += "### Mensais confirmados\n\n";
      monthlies.forEach((m: any) => {
        const monthLabel = new Date(m.period_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        evidenceText += `**${monthLabel}**${m.low_evidence ? " (poucas evidências)" : ""}\n`;
        if (m.highlight_text) evidenceText += `Mandou bem: ${m.highlight_text}\n`;
        if (m.concern_text) evidenceText += `Atenção: ${m.concern_text}\n`;
        if (m.dominant_pattern) evidenceText += `Padrão do mês: ${m.dominant_pattern}\n`;
        evidenceText += "\n";
      });
    }

    if (lowRawEvidence && hasConfirmedRecaps) {
      evidenceText += "\n## ⚠️ ALERTA DE EVIDÊNCIA BAIXA\nEsta review está sendo gerada com pouca evidência crua (menos de 3 itens entre anotações, 1:1s, pulses, peer e 360°). Os recaps confirmados pelo líder estão presentes, mas é recomendado que o líder confirme cuidadosamente antes de compartilhar. Reflita esse alerta no rodapé da review.\n";
    }

    // ============ REDE DE COLABORAÇÃO (ONA passivo) ============
    // Padrão agregado apenas: com quem a pessoa trabalha de fato e sinais
    // ativos. NUNCA conteúdo de mensagem.
    try {
      const { data: edges } = await supabase
        .from("team_network_edges")
        .select("member_a_id, member_b_id, weight_total")
        .eq("window_days", 30)
        .or(`member_a_id.eq.${member.id},member_b_id.eq.${member.id}`)
        .order("weight_total", { ascending: false })
        .limit(5);

      const peerIds = (edges ?? [])
        .map((e: any) => (e.member_a_id === member.id ? e.member_b_id : e.member_a_id))
        .filter(Boolean);

      let networkText = "";
      if (peerIds.length > 0) {
        const { data: peers } = await supabase
          .from("team_members")
          .select("id, name")
          .in("id", peerIds);
        const names = (peers ?? []).map((p: any) => p.name).filter(Boolean).slice(0, 4);
        if (names.length > 0) {
          networkText += `Colaboração real nos últimos 30 dias (intensidade agregada, sem conteúdo de mensagem): ${names.join(", ")}.\n`;
        }
      }

      const { data: signals } = await supabase
        .from("network_signals")
        .select("signal_type, severity, detected_at")
        .eq("member_id", member.id)
        .is("acknowledged_at", null)
        .order("detected_at", { ascending: false })
        .limit(3);

      if (signals && signals.length > 0) {
        networkText += `Sinais de rede ativos: ${signals
          .map((s: any) => `${s.signal_type} (${s.severity}, ${new Date(s.detected_at).toLocaleDateString("pt-BR")})`)
          .join("; ")}.\n`;
      }

      if (networkText) {
        evidenceText += "\n## 🕸️ REDE DE COLABORAÇÃO (padrão agregado, não é evidência de desempenho isolada):\n\n" + networkText + "\n";
      }
    } catch (err) {
      console.warn("[generate-formal-review] network context skipped:", err);
    }

    // ============ DECISÕES DE CALIBRAÇÃO CONFIRMADAS ============
    try {
      const { data: decisions } = await supabase
        .from("calibration_decisions")
        .select("classification, promotion_recommendation, loss_risk, merit_recommendation, note, confirmed_at, calibration_sessions!inner(cycle_label, period_start, period_end)")
        .eq("member_id", member.id)
        .not("confirmed_at", "is", null)
        .order("confirmed_at", { ascending: false })
        .limit(2);

      const relevant = (decisions ?? []).filter((d: any) => {
        const s = d.calibration_sessions;
        return s && s.period_end >= periodStart && s.period_start <= periodEnd;
      });

      if (relevant.length > 0) {
        evidenceText += "\n## ⚖️ DECISÕES DE CALIBRAÇÃO CONFIRMADAS PELO LÍDER (o Bloco 6 deve ser coerente com elas):\n\n";
        relevant.forEach((d: any) => {
          const s = d.calibration_sessions;
          evidenceText += `**Ciclo ${s.cycle_label}** (confirmada em ${new Date(d.confirmed_at).toLocaleDateString("pt-BR")})\n`;
          if (d.classification) evidenceText += `Desempenho decidido: ${d.classification}\n`;
          if (d.promotion_recommendation) evidenceText += `Promoção decidida: ${d.promotion_recommendation}\n`;
          if (d.merit_recommendation) evidenceText += `Mérito decidido: ${d.merit_recommendation}\n`;
          if (d.loss_risk) evidenceText += `Risco de perda: ${d.loss_risk}\n`;
          if (d.note) evidenceText += `Nota da calibração: ${d.note}\n`;
          evidenceText += "\n";
        });
      }
    } catch (err) {
      console.warn("[generate-formal-review] calibration context skipped:", err);
    }

    const memberName = member.name;
    const firstName = memberName.split(" ")[0];
    const periodLabel = `de ${new Date(periodStart).toLocaleDateString("pt-BR")} a ${new Date(periodEnd).toLocaleDateString("pt-BR")}`;

    // Prompt vive na alma (soul/modes/formal-review-draft.md) — nunca inline.
    const systemPrompt = await composeSystemPrompt({
      mode: "formal-review-draft",
      channel: "document",
      vars: {
        memberName,
        firstName,
        memberRole: member.role || "cargo não definido",
        periodLabel,
      },
    });

    const userPrompt = `EVIDÊNCIAS DO PERÍODO:
- Cruas: ${feedbackCount} anotações, ${meetingCount} 1:1s, ${ctxCount} sinais de contexto, ${pulseCount} pulses, ${peerCount} peer feedbacks, ${reviews360Count} reviews 360°
- Calibração: ${quarterlyCount} trimestral(is) confirmado(s), ${monthlyCount} mensal(is) confirmado(s)

${evidenceText}

Gere a avaliação formal de desempenho de ${memberName} seguindo OS 7 BLOCOS na ordem exata da estrutura. A base são as evidências cruas; os recaps confirmados são camada de ancoragem.${lowRawEvidence && hasConfirmedRecaps ? " ⚠️ Atenção: evidência crua baixa — inclua o aviso final recomendado." : ""}`;


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

    // Strip code fences and any leftover ICON_* placeholders from previous prompt versions
    generatedContent = generatedContent
      .replace(/^```(?:html|markdown|md)?\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .replace(/\{\{ICON_[A-Z_]+\}\}/g, '')
      .replace(/\bICON_[A-Z_]+\b/g, '')
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
