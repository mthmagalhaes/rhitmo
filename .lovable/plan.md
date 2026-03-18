## Relatório Técnico Atualizado — Rhitmo (Março 2026)

Este documento é o estado completo e atualizado da plataforma Rhitmo para uso como contexto por LLMs de apoio.

---

### 1. VISÃO GERAL

Rhitmo é uma plataforma SaaS de gestão de liderança e desenvolvimento de pessoas. Transforma gerentes em líderes de alta performance através de IA e dados comportamentais.

**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Lovable Cloud (Supabase)

**URL publicada:** https://rhitmo.lovable.app

---

### 2. ARQUITETURA DE ROTAS

```text
/                    → Landing (pública, redirect inteligente)
/auth                → Login/Signup
/onboarding          → Onboarding para liderados
/dashboard           → Dashboard do líder (Index.tsx) com DirectReportGuard
/member/:id          → Detalhes do membro (MemberDetails.tsx)
/analytics           → Analytics
/billing             → Billing
/help                → Help Center
/brief/:meetingId    → Brief pré-reunião
/sync/:memberId      → Rhitmo Sync (público, sem auth)
/invite              → Aceitar convite (público)
/admin               → Painel admin (AdminGuard)
/hr                  → Dashboard HR Admin (HRAdminGuard)
```

**DirectReportGuard:** Se o usuário autenticado é um `linked_user_id` em `team_members` (liderado), redireciona para o `DirectReportDashboard` em vez do dashboard do líder.

---

### 3. MODELO DE DADOS (TABELAS PRINCIPAIS)

```text
workspaces
├── id, name, owner_id, is_active, plan_tier (pulse|pro|business)
├── leader_sync_data (JSONB - perfil de liderança)
├── leader_sync_completed_at
└── hr_admin_ids (uuid[])

teams
├── id, name, workspace_id
└── FK → workspaces

team_members
├── id, name, role, email, avatar, team_id
├── linked_user_id (FK auth.users - quando liderado tem conta)
├── invite_token, invite_status
├── work_style_data (JSONB - Rhitmo Sync)
├── skills_data (JSONB - bússola de carreira + ai_analysis)
├── chronotype, feedback_style, recognition_style
├── motivators (JSONB), user_manual (JSONB)
├── birth_year, gender, key_objectives
├── performance_score
└── FK → teams

feedbacks
├── id, content, title, type, source, occurred_at
├── member_id (FK → team_members), manager_id
├── summary, sentiment, coaching_tips (legacy, null em RAG)
├── embedding (vector(1536) - pgvector)
├── action_items (JSONB), tags (text[])
├── bias_alert, visibility
├── meeting_transcript_id (FK → meeting_transcripts)
└── FK → team_members

chat_threads
├── id, user_id, member_id (nullable), title
├── type (text, default 'mentor') — 'mentor' para líder, 'career' para liderado
└── created_at, updated_at

mentor_messages
├── id, user_id, member_id, thread_id (FK → chat_threads)
├── role ('user'|'assistant'), content
└── created_at

performance_reviews
├── id, member_id, title, content, period_type
├── period_start, period_end, coaching_tip
├── shared_with_member (bool), member_viewed_at
└── created_at, updated_at

development_plans
├── id, member_id, status, period_label
├── created_by_member (bool), proposed_at, approved_at
└── leader_comment

development_items
├── id, plan_id (FK → development_plans)
├── title, description, category, status, due_date
├── leader_note, completed_at
└── created_at, updated_at

goals
├── id, member_id, title, description, status
├── metric_target, metric_current, metric_unit
└── start_date, target_date

meeting_transcripts
├── id, member_id, manager_id
├── transcript, processing_status
├── extracted_themes, extracted_commitments
├── leader_notes, duration_seconds, chunk_count
└── error_message

upcoming_meetings
├── id, user_id, member_id, google_event_id
├── title, start_time, end_time, meet_link
├── attendees (JSONB)
├── brief_cache (JSONB), brief_generated_at
└── synced_at

google_calendar_tokens
├── id, user_id, access_token, refresh_token
├── token_expiry, calendar_email
└── created_at, updated_at

user_roles
├── id, user_id (FK auth.users), role (app_role enum)
└── app_role: 'super_admin' | 'support'

user_preferences
├── id, user_id (FK auth.users, UNIQUE)
├── theme_preference (text: 'light' | 'dark' | 'system', default 'system')
├── created_at, updated_at
└── RLS: users can only read/write own row

admin_impersonation
├── admin_user_id, impersonated_user_id, impersonated_email
└── effective_user_id() function for transparent impersonation

waitlist_leads
├── email, name, phone, team_size, status
└── created_at

subscriptions (fonte de verdade para estado de assinatura)
├── id, workspace_id (FK → workspaces, UNIQUE)
├── stripe_subscription_id, stripe_customer_id, stripe_price_id
├── plan_tier (text), status (text), quantity (int)
├── cancel_at_period_end (bool), trial_ends_at
├── current_period_end
└── created_at, updated_at
```

---

### 4. FUNÇÕES RPC DO BANCO

| Função | Propósito |
|---|---|
| `effective_user_id()` | Retorna user impersonado se admin, senão auth.uid() |
| `is_admin()` / `check_is_admin()` | Verifica role super_admin |
| `is_workspace_owner(user_id, member_id)` | Verifica se user é dono do workspace do member |
| `user_owns_team(user_id, team_id)` | Verifica se user é dono do workspace do team |
| `user_is_linked_member(user_id, member_id)` | Verifica se user é o linked_user do member |
| `workspace_is_active(workspace_id)` | Verifica se workspace está ativo |
| `is_hr_admin_of_workspace(workspace_id)` | Verifica se user é HR admin |
| `manage_hr_admin(workspace_id, user_id, action)` | Adiciona/remove HR admin (admin only) |
| `get_hr_dashboard_metrics(workspace_id)` | Métricas agregadas para HR dashboard |
| `match_feedbacks(query_embedding, ...)` | Busca semântica via pgvector (RAG) |
| `submit_rhitmo_sync_v2(...)` | Submissão do Rhitmo Sync (bloqueia re-submissão) |
| `update_member_own_data(...)` | Liderado atualiza seus próprios dados |
| `get_member_for_sync(member_id)` | Busca dados do membro para página de sync |
| `get_invite_details(invite_token)` | Detalhes do convite para onboarding |
| `get_all_users_with_metadata()` | Lista todos os users (admin only) |
| `can_update_own_sync(member_id)` | Verifica se sync ainda não foi preenchido |

---

### 5. EDGE FUNCTIONS

| Função | JWT | LLM | Propósito |
|---|---|---|---|
| `chat-mentor` | sim | OpenAI gpt-4o | Mentor IA do líder (3 camadas: Router → Compressor → RAG Answer) |
| `meu-rhitmo` | sim | OpenAI gpt-4o | Parceiro de carreira do liderado (multi-thread) |
| `analyze-feedback` | sim | OpenAI | Análise síncrona de feedback (legacy) |
| `analyze-feedback-background` | sim | OpenAI | Gera embedding + summary (RAG pipeline) |
| `reanalyze-feedback` | sim | OpenAI | Re-processa feedback existente |
| `classify-note` | sim | Lovable AI | Classificação de notas |
| `analyze-job-crafting` | sim | Lovable AI | Análise de job crafting / bússola de carreira |
| `generate-review` | sim | OpenAI | Gera avaliação de performance |
| `generate-brief` | sim | Lovable AI (gemini-3-flash) | Brief pré-reunião com tool calling |
| `transcribe-audio` | sim | OpenAI Whisper | Transcrição de áudio |
| `extract-text-vision` | sim | OpenAI Vision | Extração de texto de imagens |
| `upload-meeting` | sim | — | Upload de gravação de reunião |
| `reprocess-meeting` | sim | — | Reprocessa transcrição |
| `send-disc-invite` | sim | Resend | Envia convite Rhitmo Sync por email |
| `admin-invite-user` | sim | Resend | Convite admin |
| `admin-delete-user` | sim | — | Deleta usuário (admin) |
| `notify-admin-new-lead` | não | Resend | Notifica admin sobre novo lead |
| `notify-review-shared` | sim | Resend | Notifica que avaliação foi compartilhada |
| `create-checkout-session` | sim | — | Cria sessão Stripe Checkout (Pro/Business) |
| `stripe-webhook` | não | — | Webhook Stripe (sincroniza subscriptions) |
| `create-portal-session` | sim | — | Cria sessão Stripe Customer Portal |
| `cancel-subscription` | sim | — | Agenda cancelamento de assinatura |
| `reactivate-subscription` | sim | — | Reativa assinatura cancelada |
| `get-invoices` | sim | — | Lista faturas do Stripe |
| `update-payment-method` | sim | — | Atualiza método de pagamento (Stripe Setup) |
| `backup-data` | sim | — | Backup de dados |
| `google-calendar-oauth` | não | — | OAuth do Google Calendar |
| `fetch-calendar-events` | não | — | Busca eventos do Google Calendar |

---

### 6. ARQUITETURA DE IA

**Constituição Rhitmo** (`_shared/rhitmo-constitution.ts`): Identidade centralizada, guardrails anti-alucinação, anti-jailbreak, e regras de análise compartilhadas por todas as Edge Functions de IA.

**Mentor Chat (líder) — `chat-mentor`:**
- Pipeline de 3 camadas: (1) Semantic Router decide se precisa contexto, (2) Context Compressor seleciona e comprime notas, (3) GPT-4o gera resposta com RAG
- Integra perfil do liderado (Rhitmo Sync) + perfil do líder (Leader Sync)
- Suporta imagens (multimodal), seleção manual de notas (contextMode), histórico de conversa
- Retry com backoff exponencial no frontend (429/503): 3 tentativas, delays 1s/2s/4s, UI "Reconectando..."
- Threads persistentes na tabela `chat_threads` (type='mentor')

**Meu Rhitmo (liderado) — `meu-rhitmo`:**
- Dialog com sidebar de threads idêntico ao MentorChat
- Threads diferenciadas por `chat_threads.type = 'career'`
- Prompt focado em mentoria de carreira, consome: work_style_data, PDI ativo, avaliações compartilhadas
- Conversas confidenciais (não visíveis ao líder)
- Botão em destaque no header do DirectReportDashboard

**RAG (Retrieval-Augmented Generation):**
- pgvector com HNSW index na tabela `feedbacks.embedding` (vector(1536))
- Embeddings gerados por `text-embedding-3-small` (OpenAI)
- Busca semântica via RPC `match_feedbacks` (cosine similarity, threshold 0.5)
- `analyze-feedback-background` gera embedding + summary (não mais coaching_tips/sentiment)

**Brief pré-reunião — `generate-brief`:**
- Usa Lovable AI Gateway (gemini-3-flash-preview)
- Tool calling para output estruturado (agenda, pendências, contexto, coaching reminder)
- Cache em `upcoming_meetings.brief_cache`

---

### 7. FLUXO DE USUÁRIOS

**Líder (owner do workspace):**
1. Cadastro → Cria workspace → Cria teams → Adiciona members
2. Leader Sync Wizard (perfil de liderança → armazenado em `workspaces.leader_sync_data`)
3. Envia convite Rhitmo Sync para liderados (por email)
4. Registra notas/feedbacks → embedding automático → RAG
5. Usa Mentor Chat para coaching contextual
6. Gera Performance Reviews com IA
7. Gerencia PDI (development_plans + development_items)
8. Compartilha avaliações com liderados
9. Conecta Google Calendar → Briefs pré-reunião automáticos

**Liderado (linked member):**
1. Recebe convite → Preenche Rhitmo Sync (wizard comportamental)
2. Aceita invite → Cria conta → `linked_user_id` vinculado
3. DirectReportGuard redireciona para DirectReportDashboard
4. Visualiza: feedbacks recebidos, avaliações compartilhadas, PDI
5. Preenche Skills Map (bússola de carreira) → IA analisa gaps
6. Usa Meu Rhitmo (parceiro de carreira confidencial)
7. Propõe itens no PDI

**HR Admin:**
- Adicionado por super_admin via `manage_hr_admin()`
- Acessa `/hr` com métricas agregadas do workspace
- Sem acesso a dados individuais de feedback

**Super Admin:**
- Role `super_admin` em `user_roles`
- Acessa `/admin` com overview, gestão de users, suporte
- Pode impersonar usuários via `admin_impersonation`

---

### 8. COMPONENTES PRINCIPAIS

| Componente | Descrição |
|---|---|
| `AppLayout.tsx` | Layout com sidebar (AppSidebar) |
| `AppSidebar.tsx` | Navegação lateral com glassmorphism (dashboard, analytics, billing, help) |
| `DirectReportGuard.tsx` | Guard que redireciona liderados para seu dashboard |
| `DirectReportDashboard.tsx` | Dashboard completo do liderado (tabs: Visão Geral, Notas, Carreira, Perfil) |
| `MentorChat.tsx` | Dialog do Mentor IA do líder (sidebar de threads, RAG, attachments, voice input) |
| `MeuRhitmo.tsx` | Dialog do parceiro de carreira do liderado (mesma estrutura do MentorChat) |
| `TeamMemberCard.tsx` | Card do membro com indicador de saúde (verde/amarelo/vermelho/cinza) |
| `FeedbackTimeline.tsx` | Timeline de feedbacks/notas |
| `BiasDetectionPanel.tsx` | Painel de detecção de viés em notas |
| `GoalsManager.tsx` | Gerenciamento de objetivos |
| `PerformanceReviewList.tsx` | Lista de avaliações de performance |
| `NewReviewDialog.tsx` | Dialog para gerar avaliação com IA |
| `NewPDIDialog.tsx` | Dialog para criar PDI |
| `ContextPicker.tsx` | Seletor de contexto para Mentor Chat (auto/manual) |
| `CalendarWidget.tsx` | Widget de calendário com reuniões do Google |
| `LeaderSyncWizard.tsx` | Wizard de perfil de liderança |
| `WorkspaceOnboarding.tsx` | Onboarding do workspace |
| `SkillsMapCard.tsx` | Card de bússola de carreira do liderado |
| `MeetingRecorder.tsx` | Gravador de reuniões |
| `VoiceInput.tsx` | Input de voz (Whisper) |
| `ProfileSettingsDialog.tsx` | Configurações de perfil (nome, cargo, aparência, manutenção) |
| `ThemeProvider.tsx` | Context provider para tema (light/dark/system) |
| `ThemeSelector.tsx` | Seletor visual de tema com 3 cards (Claro/Escuro/Sistema) |
| `OnboardingModal.tsx` | Modal de onboarding do liderado |
| `WorkStyleCard.tsx` | Card do perfil comportamental (Rhitmo Sync) |

---

### 9. SISTEMA DE TEMAS (Dark / Light / System)

**Arquitetura:**
- `ThemeProvider` (context) → `useThemeManager` hook → persiste em `user_preferences` (Supabase) + `localStorage` (fallback)
- Script inline no `<head>` do `index.html` aplica classe `.dark` antes do primeiro render (sem flash)
- Preferência `system` escuta `prefers-color-scheme` via `matchMedia`

**Paleta Light (Creme/Bento):**
- Background: `#F5F3EE` (38 25% 95%)
- Primary: `#7C3AED` (262 83% 58%)
- Foreground: `#1A1035` (258 52% 15%)

**Paleta Dark (cinza escuro suave, não preto):**
- Background: `#1a1a1f` (240 10% 11%)
- Primary: `#a78bfa` (263 86% 76%) — roxo mais claro
- Foreground: `#f0eff4` (250 10% 95%)
- Card: `#22222a` (240 10% 15%)
- Muted: `#2c2c36` (240 10% 18%)
- Border: `#2e2e3a` (240 10% 20%)

**Sidebar Glassmorphism:**
- Light: `rgba(255, 255, 255, 0.55)` + `blur(16px) saturate(180%)` + `border: rgba(255,255,255,0.3)`
- Dark: `rgba(26, 26, 31, 0.7)` + `blur(16px) saturate(180%)` + `border: rgba(255,255,255,0.06)`
- Implementado via utility class `.sidebar-glass` no `index.css` com override `.dark .sidebar-glass`

**Componentes:**
- `ThemeSelector`: 3 cards lado a lado com preview visual (retângulo claro, escuro, ou dividido), borda primária no selecionado
- Integrado em `ProfileSettingsDialog` na seção "Aparência"
- Mudança de tema é imediata (não depende do botão "Salvar")

---

### 10. PLANOS E LIMITES

| Feature | Pulse (grátis) | Pro (R$49/mês) | Business (R$69/mês por líder) |
|---|---|---|---|
| Liderados por workspace | 3 | 5 | 8 |
| Teams | 1 | 3 | Ilimitado |
| Mentor Chat | 20 msgs/mês | Ilimitado | Ilimitado |
| Meu Rhitmo (liderado) | Não | Sim | Sim |
| Analytics | Básico | Completo | Completo |
| Gravação de reuniões | Não | 4h/mês | 8h/mês |
| HR Dashboard | Não | Não | Sim |

**Notas:**
- Business requer mínimo 3 líderes (R$207/mês mín.) — self-service via `BusinessQuantityDialog` com validação frontend + edge function
- Pro inclui 14 dias de trial gratuito
- Quotas de gravação são apenas marketing (sem validação técnica implementada)
- `subscriptions` é a fonte de verdade para estado da assinatura (sobrepõe `workspaces.plan_tier`)

Hook: `usePlanLimits.ts`

---

### 11. INTEGRAÇÕES EXTERNAS

- **OpenAI** (gpt-4o, gpt-4o-mini, Whisper, text-embedding-3-small, Vision): Mentor Chat, análise de feedback, transcrição, embeddings
- **Lovable AI Gateway** (Gemini): classify-note, analyze-job-crafting, generate-brief
- **Google Calendar** (OAuth2): Sincronização de reuniões, briefs pré-reunião
- **Resend**: Envio de emails (convites, notificações)
- **Stripe** (Checkout, Customer Portal, Webhooks, Subscriptions): Pagamentos, gestão de assinaturas, faturas

---

### 12. STORAGE BUCKETS

| Bucket | Público | Uso |
|---|---|---|
| `chat-attachments` | Sim | Anexos do Mentor Chat |
| `meeting-recordings` | Sim | Gravações de reuniões |
| `data-backups` | Não | Backups de dados |

---

### 13. SECRETS CONFIGURADOS

`OPENAI_API_KEY`, `LOVABLE_API_KEY`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`

---

### 14. PADRÕES DE CÓDIGO

- **Queries**: TanStack React Query com `useQuery` / `useMutation`
- **Auth**: `useAuth()` hook customizado com `supabase.auth`
- **Linked member**: `useLinkedMember()` hook para detectar se user é liderado
- **Admin**: `useAdmin()` hook para verificar role super_admin
- **Theme**: `useTheme()` via `ThemeProvider` (context) — retorna `theme`, `setTheme`, `resolvedTheme`
- **UI**: shadcn/ui + Radix primitives + Tailwind (tokens semânticos HSL)
- **Markdown**: `react-markdown` para renderizar respostas de IA
- **Sanitização**: DOMPurify + marked para conteúdo HTML seguro
- **Dates**: date-fns com locale pt-BR
- **Resizable panels**: react-resizable-panels (sidebar dos chats)
- **State management**: React state local + React Query cache (sem Redux/Zustand)

---

### 15. DESIGN SYSTEM

**Estética:** "Creme / Bento" — high-end, Soft UI, tátil. Bordas arredondadas (`rounded-2xl`/`rounded-3xl`), sombras ultra-suaves, layouts assimétricos (Bento Grid).

**Sidebar:** Glassmorphism (translúcido com blur) — usa utility `.sidebar-glass` que adapta automaticamente entre light e dark. Menu items com active state `bg-[rgba(124,58,237,0.08)]` e hover `bg-[rgba(124,58,237,0.05)]`, `rounded-[10px]`.

**Sheet overlay (mobile):** `bg-black/40` (reduzido de 80% para combinar com glassmorphism).

**Cores via tokens semânticos:** Todos os componentes usam variáveis CSS HSL (`--background`, `--primary`, `--muted`, etc.) definidas em `index.css`. Nunca usar cores hardcoded em componentes.

**Tipografia:** Inter (sans), Lora (serif), Space Mono (mono). Headlines com `tracking-tight` + `font-bold`.

**Billing page:** Design Creme/Bento com `rounded-3xl`, `shadow-lg`, badges com cores suaves (`bg-amber-50`, `bg-green-50`), tipografia premium (`text-5xl` para preços).

---

### 16. CONVENÇÕES IMPORTANTES

- Idioma da UI: Português brasileiro
- Idioma do código: Inglês (variáveis, funções, componentes)
- Prompts de IA: Português brasileiro
- RLS: Todas as tabelas têm RLS habilitado com policies baseadas em `auth.uid()`, `effective_user_id()`, e funções helper (`is_workspace_owner`, `user_is_linked_member`, etc.)
- Roles: Armazenados em tabela separada `user_roles` (nunca no perfil)
- `mentor_messages.member_id` é NOT NULL no schema atual do types.ts (mas a edge function meu-rhitmo trata como opcional)
- Dashboard do líder inclui legenda visual dos indicadores de saúde (bolinhas coloridas: verde ≤7d, amarelo 8-14d, vermelho >14d, cinza sem notas)
- Tema salvo em `user_preferences` com fallback para `localStorage` quando não autenticado
- `subscriptions` é fonte de verdade para estado de assinatura (sobrepõe `workspaces.plan_tier`)
- Business requer mínimo 3 líderes (validado em frontend via `BusinessQuantityDialog` e em `create-checkout-session` edge function)
- Trial de 14 dias no plano Pro (configurado via `subscription_data[trial_period_days]` no Stripe Checkout)
