Plano de ação em 3 frentes, na ordem que minimiza retrabalho — começamos pelo ajuste rápido de respiro, depois trocamos os mockups (mudança visual de maior impacto), e por último elaboramos a FAQ.

---

## Frente 1 — Diminuir distância entre seções (rápido, ~10 min)

Hoje quase todas as `<section>` da `Landing.tsx` usam `py-28` (112px topo + 112px base), o que dá ~224px entre uma seção e outra. Vamos baixar para `py-20` (80px) — corte de ~28% — mantendo `py-28` apenas no Hero, que precisa de respiro.

Alvos em `src/pages/Landing.tsx`:
- L635 `#pricing`
- L1150 `#impacto`
- L1216 (Líderes / Liderados / RH)
- L1275 `#faq`
- L1302 footer (`py-20` já está ok)

Também reduzimos o `space-y-28` interno da seção de personas (L1217) para `space-y-20`, para diminuir a distância entre Líderes ↔ Liderados ↔ RH.

Sem mudança de copy, sem mudança de layout.

---

## Frente 2 — Trocar mockups de "Para Líderes" e "Para RH"

Texto e estrutura ficam iguais. Trocamos só os visuais para algo mais fiel ao produto real e mais "uau".

**Para Líderes (hoje: `<SimpleChatMockup />` — chat genérico)**  
Proposta: Mockup de **DM da Rhitmo no Slack com o Brief de 1:1** — header Rhitmo, bloco "1:1 com [nome] em 1h" + 3 bullets de contexto (último 1:1, sinal de pulse, peer feedback) + botões "Abrir pauta completa" / "Adicionar item". É a feature mais distintiva (proactive prep DMs ~18h antes) e conecta direto com o "Slack" do pricing.

Alternativas se preferir: (a) screenshot real de `/lider/inicio` (Bento com 1:1s + Mentor + Pulse), (b) tela da pauta de 1:1 com action items.

**Para RH (hoje: `analyticsScreenshot` estático)**  
Proposta: Mockup do **HR Risk Alerts** — card "Alertas de risco" com 3 linhas: pessoa + sinal (ex: "Pulse caiu 2 pontos em 2 semanas", "Sem 1:1 há 18 dias", "Peer feedback negativo recorrente") + chip de severidade. É o que diferencia "RH com IA" de "dashboard de RH".

Alternativas: (a) Health Score 40/30/30 com breakdown, (b) Timeline cross-team de `/lider/contexto` filtrado por sinal.

Implementação: criamos `LeaderBriefMockup.tsx` e `HRRiskMockup.tsx` em `src/components/landing/`, no mesmo padrão do `SimpleChatMockup` (puro JSX + Tailwind, sem dados reais), e trocamos L1232 e L1267.

Antes de codar, **preciso que você confirme as duas escolhas** (sugestão default = Brief Slack DM + Risk Alerts).

---

## Frente 3 — Expandir FAQ (5 → 9 perguntas, respostas mais elaboradas)

Hoje a FAQ está em L257–263 (pt) e L456+ (en), cobrindo: substituir RH, IA escreve, viés, treinamento, segurança.

Análise da plataforma → temas ausentes que valem virar pergunta:

1. **Brief / 1:1 com memória** (Slack DM antes da reunião, pauta a partir do histórico).
2. **Evidências e citações** (citations auditable trail — toda afirmação da IA tem `[doc:UUID]` clicável).
3. **Peer / 360° / Self / Upwards review** (como funcionam os 4 tipos).
4. **Slack bidirecional** (o que dá pra fazer só pelo Slack — `/rhitmo`, conversa em DM, briefs, pulses).
5. **Recall.ai / transcrição** (bot entra em Meet/Zoom/Teams, vira evidência, líder vê transcrição, liderado não).
6. **Quanto tempo para começar a ter valor** (onboarding < 5 min, primeiro brief em ~1 semana, review pronta no fim do trimestre).
7. **Integrações** (Slack, Google Calendar, Meet/Zoom/Teams via Recall, HRIS roadmap).
8. **LGPD + privacidade** (notas privadas por padrão, RLS por liderança, dados do liderado não vazam).
9. **Cancelamento e dados** (cancel a qualquer momento, exporta histórico).

Mantemos as 5 atuais com respostas reescritas mais densas (2–3 frases cada, sem virar parágrafo). Aplicamos espelhamento em `pt-BR` (L257) e `en` (L456).

---

## Por onde começar

Sugestão de execução em uma única ida ao código:
1. Frente 1 (respiro) → muda só classes utilitárias, baixo risco.
2. Frente 3 (FAQ) → puramente conteúdo nos objetos `pt`/`en`.
3. Frente 2 (mockups) → maior, depende da sua escolha entre as duas opções de cada lado.

**Aguardo confirmação:**
- Para Líderes: **Brief Slack DM** (sugerido) ou outra das alternativas?
- Para RH: **HR Risk Alerts** (sugerido) ou outra?
- Pode tocar Frente 1 + Frente 3 já junto, ou prefere uma de cada vez?