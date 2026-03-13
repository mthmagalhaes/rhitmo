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
├── id, name, owner_id, is_active, plan_tier (pulse|flow|maestro)
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

admin_impersonation
├── admin_user_id, impersonated_user_id, impersonated_email
└── effective_user_id() function for transparent impersonation

waitlist_leads
├── email, name, phone, team_size, status
└── created_at
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
| `AppSidebar.tsx` | Navegação lateral (dashboard, analytics, billing, help) |
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
| `ProfileSettingsDialog.tsx` | Configurações de perfil |
| `OnboardingModal.tsx` | Modal de onboarding do liderado |
| `WorkStyleCard.tsx` | Card do perfil comportamental (Rhitmo Sync) |

---

### 9. PLANOS E LIMITES

| Feature | Pulse (free) | Flow | Maestro |
|---|---|---|---|
| Membros por workspace | 5 | 15 | Ilimitado |
| Teams | 1 | 3 | Ilimitado |
| Mentor Chat | Sim | Sim | Sim |
| Analytics | Básico | Completo | Completo |
| HR Dashboard | Não | Não | Sim |

Hook: `usePlanLimits.ts`

---

### 10. INTEGRAÇÕES EXTERNAS

- **OpenAI** (gpt-4o, gpt-4o-mini, Whisper, text-embedding-3-small, Vision): Mentor Chat, análise de feedback, transcrição, embeddings
- **Lovable AI Gateway** (Gemini): classify-note, analyze-job-crafting, generate-brief
- **Google Calendar** (OAuth2): Sincronização de reuniões, briefs pré-reunião
- **Resend**: Envio de emails (convites, notificações)

---

### 11. STORAGE BUCKETS

| Bucket | Público | Uso |
|---|---|---|
| `chat-attachments` | Sim | Anexos do Mentor Chat |
| `meeting-recordings` | Sim | Gravações de reuniões |
| `data-backups` | Não | Backups de dados |

---

### 12. SECRETS CONFIGURADOS

`OPENAI_API_KEY`, `LOVABLE_API_KEY`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`

---

### 13. PADRÕES DE CÓDIGO

- **Queries**: TanStack React Query com `useQuery` / `useMutation`
- **Auth**: `useAuth()` hook customizado com `supabase.auth`
- **Linked member**: `useLinkedMember()` hook para detectar se user é liderado
- **Admin**: `useAdmin()` hook para verificar role super_admin
- **UI**: shadcn/ui + Radix primitives + Tailwind
- **Markdown**: `react-markdown` para renderizar respostas de IA
- **Sanitização**: DOMPurify + marked para conteúdo HTML seguro
- **Dates**: date-fns com locale pt-BR
- **Resizable panels**: react-resizable-panels (sidebar dos chats)
- **State management**: React state local + React Query cache (sem Redux/Zustand)

---

### 14. CONVENÇÕES IMPORTANTES

- Idioma da UI: Português brasileiro
- Idioma do código: Inglês (variáveis, funções, componentes)
- Prompts de IA: Português brasileiro
- RLS: Todas as tabelas têm RLS habilitado com policies baseadas em `auth.uid()`, `effective_user_id()`, e funções helper (`is_workspace_owner`, `user_is_linked_member`, etc.)
- Roles: Armazenados em tabela separada `user_roles` (nunca no perfil)
- `mentor_messages.member_id` é NOT NULL no schema atual do types.ts (mas a edge function meu-rhitmo trata como opcional)
- Dashboard do líder inclui legenda visual dos indicadores de saúde (bolinhas coloridas: verde ≤7d, amarelo 8-14d, vermelho >14d, cinza sem notas)
