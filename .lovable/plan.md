# Plano: Relatório Detalhado Rhitmo — Landing + Plataforma (Abril/2026)

## Objetivo

Entregar um documento consolidado, executivo e técnico, sobre o **estado atual** da Rhitmo — combinando a perspectiva de **Landing Page** (marketing/posicionamento), **Plataforma** (produto/UX/features) e **Engenharia** (arquitetura, banco, IA, integrações, custos, observabilidade pós Ondas 3/4/4.5).

Não é uma reescrita do `rhitmo-technical-report-april-2026.md` (que cobre até 17/Abr). É uma **fotografia atual de 30/Abr/2026** que incorpora as Ondas 3, 4 e 4.5 (Event Bus, ai-router, observabilidade, feature flags, custo IA, testes).

## Formato de entrega

Como tem dimensão de **deliverable** (não feature de produto), gero como **artefato baixável**:

- **Markdown** em `/mnt/documents/rhitmo-relatorio-completo-abril-2026.md` (fonte editável)
- **PDF** em `/mnt/documents/rhitmo-relatorio-completo-abril-2026.pdf` (apresentável)

PDF gerado via `pandoc` + `weasyprint` ou `pandoc + xelatex`, com capa, sumário e estilo "Rhitmo" (creme, Lora nos títulos).

## Estrutura do relatório (capítulos)

```
1. Sumário Executivo
   - O que é Rhitmo, problema, solução, momento atual
   - Métricas-chave e estado de maturidade

2. Landing Page (rhitmo.co)
   2.1 Posicionamento e mensagens (hero, headlines PT/EN/ES)
   2.2 Estrutura de seções (hero, prova, features, pricing, FAQ, CTAs)
   2.3 Estratégia de conversão (sem cartão, plano grátis Pulse, "preço de lançamento")
   2.4 i18n (PT/EN/ES) e tom Early Adopter
   2.5 SEO/legal (Privacy Policy, Terms, Roadmap, Help Center)

3. Plataforma — Visão de Produto
   3.1 Personas (Líder, Liderado, HR Admin, Owner, Super Admin)
   3.2 Jornadas principais (onboarding líder, onboarding HR, convite liderado, ciclo 1:1, ciclo Review)
   3.3 Modelo "Workspace = Empresa"
   3.4 Planos e limites (Pulse 2 / Pro 5 / Business 10 / Enterprise)

4. UX e Design System
   4.1 Estética "Creme / Bento" (Soft UI, rounded-2xl/3xl, shadows difusas)
   4.2 Tipografia (Lora headings, Inter body, sem em-dash)
   4.3 Componentes-chave (Bento Grid dashboard, Floating Sidebar, Split Auth)
   4.4 Avatares proprietários (24 SVGs) e Rhythm Wave
   4.5 Acessibilidade e responsivo (max-w-5xl)
   4.6 Padrões críticos: Padlock vs Eye (privado vs shared), "Magic Paste"

5. Features por Área
   5.1 Diário de Bordo (FeedbackTimeline, filtros, manual tags)
   5.2 Mentor Chat (3 layers, RAG, threads multimodais)
   5.3 Avaliações Formais (Tiptap, evidências, competências, lifecycle)
   5.4 PDI (member-owned, NewPDIDialog)
   5.5 Career Compass + Pulse Card (portal liderado)
   5.6 Meu Rhitmo (parceiro de carreira IA)
   5.7 Pre-meeting Briefs e Smart Nudges
   5.8 Bias Detection (client-side ProseMirror)
   5.9 Recall.ai (bot, multi-member diarization, leader presence)
   5.10 Slack (comandos, App Home, ambient, privacidade)
   5.11 Google Calendar + Extensão Chrome (legado)
   5.12 HR Dashboard (Health Score, Risk Table, Engagement Heatmap)
   5.13 Admin / Command Center (Funnel, Cohorts, Drill-down)

6. Arquitetura Técnica
   6.1 Stack (React 18, Vite 5, TS, Tailwind v3, Shadcn, Tiptap, react-i18next)
   6.2 Backend (Supabase: ~53 tabelas, ~67 Edge Functions Deno, pgvector, pgmq)
   6.3 RLS e Roles (5 papéis, has_role, effective_user_id, security definer)
   6.4 AccountContext + role resolution priority
   6.5 Integrações (OpenAI, Lovable AI Gateway, Recall.ai, Stripe, Resend, Slack, Google)

7. Plataforma de IA
   7.1 Constituição Rhitmo (centralizada)
   7.2 Mentor Chat — pipeline de 3 camadas
   7.3 ai-router (Onda 3) — tasks: classify_intent, summarize_text, extract_action_items
   7.4 RAG e embeddings (text-embedding-3-small, threshold 0.5)
   7.5 Modelos por uso (Gemini 2.5 Flash padrão, gpt-4o-mini router, Whisper)
   7.6 Bias detection client-side
   7.7 Performance Reviews — anti-alucinação + citação obrigatória

8. Infraestrutura de Notificações
   8.1 Event Bus (Onda 3.2 + 4.3 + 4.5) — tabela `events`, `emit()`, dispatcher
   8.2 Templates registry (feedback-shared, review-shared, etc.)
   8.3 Feature flags (USE_EVENT_BUS_FOR_*) — rollback seguro
   8.4 ActivitySheet — único ponto de notificações in-app
   8.5 Fila pgmq + Resend (notify.rhitmo.co)

9. Observabilidade e Qualidade (Onda 4 + 4.5)
   9.1 Logger centralizado (`_shared/logger.ts`)
   9.2 `function_logs` + AdminObservability dashboard
   9.3 Custo IA por workspace (aiPricing.ts + estimatedCostUsd)
   9.4 Testes Deno (event-dispatcher, ai-router, helpers)
   9.5 Safe Supabase wrappers (safeRpc, tryRpc, safeFunctionInvoke)

10. Segurança e Privacy
    10.1 Email verification obrigatória, sem signup anônimo
    10.2 Strict ownership (manager_id apenas)
    10.3 Edge function ownership chain check + OAuth nonce
    10.4 Storage privado (meeting-recordings, chat-attachments)
    10.5 Impersonação auditada
    10.6 Slack 3-layer privacy

11. Monetização
    11.1 Stripe customizado (não Lovable Payments)
    11.2 Funil checkout → webhook → workspace.plan_tier
    11.3 Limites enforced (usePlanLimits + edge validation)
    11.4 Modelo econômico Abril/2026 (margens 58-70%)

12. Estado Atual (Abril/2026) — Ondas concluídas
    - Onda 1: Refactor Command Center
    - Onda 2: ActivationCohorts + drill-down
    - Onda 3: ai-router + Event Bus
    - Onda 4: Observabilidade + testes + emit migration
    - Onda 4.5: Closure (cost tracking, feature flags, full migration)

13. Backlog e Próximas Ondas
    - Wave 5 candidatos: migrar 5–10 funções para ai-router, Rate Limiting
    - Cobertura de testes além de helpers
    - Possível instrumentação total das funções AI restantes

14. Anexos
    A. Catálogo completo de Edge Functions (~67)
    B. Lista de tabelas (53)
    C. Comandos Slack
    D. Eventos canônicos do Event Bus
    E. Modelos de IA por função
```

## Como vou montar (passos de execução)

1. Ler em chunks o `Landing.tsx` (1453 linhas) para extrair seções, headlines e CTAs reais (PT/EN/ES).
2. Mapear `AppSidebar.tsx`, `Index.tsx`, `HRDashboard.tsx`, `MemberDetails.tsx`, `Admin.tsx` para inventário definitivo de telas/features.
3. Cruzar com memórias já indexadas (`event-bus`, `feature-flags`, `observability-logger`, `ai-router`, `papeis-e-permissoes`, design system, AI specs).
4. Consultar `psql` para contagens reais (workspaces, feedbacks, reviews, edge function logs últimos 7d) — dá vida ao "Estado Atual".
5. Escrever Markdown em `/mnt/documents/`.
6. Converter para PDF via pandoc com CSS estilizado (creme + Lora). Renderizar páginas como imagem para QA visual antes de entregar.
7. Emitir `<lov-artifact>` para .md e .pdf.

## O que NÃO está no escopo

- Nenhuma alteração de código no projeto.
- Não mexo em memórias nem migrations.
- Não atualizo o `rhitmo-technical-report-april-2026.md` existente (esse é histórico v1.1 de 17/Abr; o novo é v2.0 de 30/Abr e fica em `/mnt/documents`).

## Resultado

Dois arquivos baixáveis prontos para uso interno (deck para investidor, brief para novo dev/designer, base para due diligence) com a fotografia consolidada de tudo que existe hoje na Rhitmo.

Aprova para gerar?
