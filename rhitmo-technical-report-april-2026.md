# Rhitmo — Relatório Técnico Completo

> **Versão:** 1.1  
> **Data:** 17 de Abril de 2026  
> **Propósito:** Fonte da verdade consolidada para arquitetura, modelos de dados, Edge Functions, integrações e decisões técnicas.  
> **Atualização:** Este documento deve ser consultado e atualizado periodicamente para manter a consistência entre agentes de IA e colaboradores humanos.

---

## Sumário

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitetura de Dados](#3-arquitetura-de-dados)
4. [Autenticação e Segurança](#4-autenticação-e-segurança)
5. [Edge Functions — Catálogo Completo](#5-edge-functions--catálogo-completo)
6. [Sistema de IA](#6-sistema-de-ia)
7. [Integração Recall.ai](#7-integração-recallai)
8. [Integração Slack](#8-integração-slack)
9. [Integração Google Calendar](#9-integração-google-calendar)
10. [Extensão Chrome](#10-extensão-chrome)
11. [Sistema de Emails](#11-sistema-de-emails)
12. [Monetização e Billing](#12-monetização-e-billing)
13. [Frontend — Componentes Chave](#13-frontend--componentes-chave)
14. [Design System](#14-design-system)
15. [Internacionalização (i18n)](#15-internacionalização-i18n)
16. [Administração e Super Admin](#16-administração-e-super-admin)
17. [Custos Operacionais](#17-custos-operacionais)
18. [Command Center — Painel Admin](#18-command-center--painel-admin)

---

## 1. Visão Geral do Produto

**Rhitmo** é um AI-Native Leadership Partner — não apenas um app de anotações, mas um "Service-as-Software" que entrega resultados (avaliações de desempenho, PDIs, briefings) usando IA como Chief of Staff.

### Princípios Fundamentais

| Princípio | Descrição |
|---|---|
| **Privacy First** | Arquitetura "Zero Trust". Notas do líder são privadas por default. Compartilhamento é ação explícita. |
| **Mirror Function** | IA detecta contradições na liderança ("Você disse que a prioridade era X, mas 30% das 1:1s foram sobre Y"). |
| **Magic Paste** | Prioriza importação de texto (Tactiq/Google Meet/Fireflies) sobre upload de áudio para reduzir fricção e custo. |
| **Service-as-Software** | Não vende a ferramenta; vende o resultado (avaliações completas, PDIs acionáveis, preparação para 1:1s). |

### Modelo de Negócio

| Plano | Preço | Liderados | Features principais |
|---|---|---|---|
| **Pulse** (grátis) | R$0 | 2 | Notas, Mentor Chat, Bias Detection |
| **Pro** | R$49/mês | 5 | + Recall.ai Bot, Meu Rhitmo, Avaliações, PDI |
| **Business** | R$69/mês | 10 | + Reuniões ilimitadas*, Analytics avançado |
| **Enterprise** | Sob consulta | Ilimitado | SSO, SAML, SLA dedicado |

---

## 2. Stack Tecnológico

### Frontend

| Tecnologia | Versão | Propósito |
|---|---|---|
| React | 18 | UI framework |
| Vite | 5 | Build tool |
| TypeScript | 5 | Type safety |
| Tailwind CSS | v3 | Styling |
| Shadcn/ui | Latest | Component library |
| Lucide React | Latest | Iconografia |
| Tiptap | Latest | Rich text editor (avaliações, notas) |
| react-i18next | v15 | Internacionalização |

### Backend (Lovable Cloud / Supabase)

| Componente | Detalhes |
|---|---|
| **Database** | PostgreSQL + pgvector (embeddings 1536d) |
| **Auth** | Supabase Auth (email/password, Google OAuth) |
| **Edge Functions** | Deno runtime, ~50 funções |
| **Storage** | Buckets privados (`meeting-recordings`, `chat-attachments`) |
| **Realtime** | Para notificações e updates em tempo real |

### Integrações Externas

| Serviço | Propósito | Custo |
|---|---|---|
| OpenAI | Router semântico (gpt-4o-mini), análise de notas, OCR | Pay-as-you-go |
| Lovable AI Gateway | Respostas RAG, classificação, avaliações, briefs (Gemini) | $0.00 (incluso) |
| Recall.ai | Transcrição automática de reuniões via bot | ~$0.45/hora |
| Stripe | Pagamentos e assinaturas | 3,99% + R$0,39/tx |
| Resend | Emails transacionais | Free tier (3k/mês) |
| Slack API | Bot, comandos slash, OAuth | Grátis |
| Google Calendar API | Sincronização de eventos, OAuth | Grátis |

---

## 3. Arquitetura de Dados

### Modelo "Workspace = Empresa"

```
Workspace (empresa)
├── Teams (times)
│   ├── leader_user_id → auth.users
│   └── Team Members (liderados)
│       ├── linked_user_id → auth.users (quando convidado e vinculado)
│       ├── Feedbacks (notas do Diário de Bordo)
│       ├── Meeting Transcripts
│       ├── Goals (metas)
│       ├── Development Plans → Development Items (PDI)
│       ├── Performance Reviews
│       └── Mentor Messages → Chat Threads
├── Subscriptions (Stripe)
├── Competency Frameworks → Competencies → Job Roles
└── Slack Integrations
```

### Tabelas Principais

| Tabela | Chave de Ownership | Descrição |
|---|---|---|
| `workspaces` | `owner_id` | Empresa/organização |
| `teams` | `leader_user_id` | Time com líder designado |
| `team_members` | `team_id`, `linked_user_id` | Liderados (com ou sem conta) |
| `feedbacks` | `manager_id` (criador) | Diário de Bordo — notas do líder |
| `meeting_transcripts` | `manager_id` | Transcrições de reuniões |
| `performance_reviews` | `member_id` (pertence ao membro, criado pelo líder) | Avaliações de desempenho |
| `development_plans` | `member_id` | Planos de desenvolvimento |
| `goals` | `member_id` | Metas individuais |
| `mentor_messages` | `user_id`, `member_id` | Histórico do Mentor Chat |
| `chat_threads` | `user_id` | Threads de conversa (Mentor / Meu Rhitmo) |
| `recall_bots` | `user_id` | Bots agendados para reuniões |
| `upcoming_meetings` | `user_id` | Reuniões sincronizadas do Google Calendar |
| `user_roles` | `user_id` | Roles separadas (super_admin, support) |

### RLS (Row Level Security) — Regras Críticas

| Regra | Descrição |
|---|---|
| **Strict Ownership** | `member_id` presente NÃO garante acesso de leitura. Apenas `manager_id` (criador) tem acesso total. |
| **Member View** | Membros só veem registros com `visibility = 'shared'`. |
| **Transcripts** | Raw `meeting_transcripts` são exclusivas do manager. Membros nunca veem transcrições brutas. |
| **Data Isolation** | `team_members` nunca vazam entre `workspaces` diferentes. |
| **Effective User** | Função `effective_user_id()` suporta impersonação por super_admin. |
| **HR Admin** | Acesso a métricas agregadas, sem acesso a conteúdo privado de notas. |

### Funções Auxiliares de RLS

| Função | Propósito |
|---|---|
| `rls_check_member_access(_team_id)` | Verifica se usuário é líder ou owner do time |
| `rls_check_member_read_access(_team_id)` | Inclui HR Admins no check |
| `rls_check_workspace_access(_workspace_id)` | Owner, HR Admin ou líder de time no workspace |
| `is_team_leader(_user_id, _member_id)` | Verifica liderança direta |
| `effective_user_id()` | Retorna ID real ou impersonado |

---

## 4. Autenticação e Segurança

### Política de Auth

- **Email verification obrigatória** (auto-confirm desativado em produção)
- **Sem signup anônimo** — sempre formulário padrão
- **Google OAuth** habilitado para signup/login
- **Refresh token rotation** automática
- **Proteção contra sessões zumbi**: signOut local imediato se `Refresh Token Not Found`

### Hierarquia de Papéis

```
Super Admin (user_roles.role = 'super_admin')
  └── HR Admin (workspaces.hr_admin_ids[])
        └── Líder (teams.leader_user_id)
              └── Membro Vinculado (team_members.linked_user_id)
```

**Prioridade de resolução:** HR Admin > Líder > Membro Vinculado.

### Fluxo de Convites

1. Líder cria membro com email → `invite_token` UUID gerado
2. Link `/invite?code={token}` enviado via email
3. RPC `get_invite_status` retorna status: `pending` | `already_accepted` | `not_found`
4. Membro aceita → `linked_user_id` vinculado, `invite_status = 'accepted'`

### Impersonação (Super Admin)

- Tabela `admin_impersonation` armazena sessões ativas
- `effective_user_id()` retorna o ID impersonado quando ativo
- Todas as queries RLS respeitam a impersonação

---

## 5. Edge Functions — Catálogo Completo

### IA e Análise

| Função | Modelo | Propósito |
|---|---|---|
| `chat-mentor` | gpt-4o-mini (router) + Gemini 2.5 Flash (resposta) | Mentor Chat IA do líder |
| `meu-rhitmo` | Gemini 2.5 Flash | Chat IA do liderado (parceiro de carreira) |
| `classify-note` | Gemini 2.5 Flash | Classificação automática de notas |
| `generate-review` | Gemini 2.5 Flash | Geração de avaliações de desempenho |
| `generate-formal-review` | Gemini 2.5 Flash | Avaliações formais com competências |
| `generate-brief` | Gemini 3 Flash Preview | Briefings pré-reunião |
| `generate-nudges` | Gemini 2.5 Flash | Smart nudges para líderes |
| `analyze-feedback` | gpt-4o-mini | Análise rápida de feedback |
| `analyze-feedback-background` | gpt-4o-mini | Análise assíncrona + embeddings |
| `analyze-job-crafting` | Gemini 3 Flash Preview | Perfil de estilo de trabalho |
| `generate-competencies` | Gemini 2.5 Flash | Geração de competências para cargos |
| `adjust-competency` | Gemini 2.5 Flash | Ajuste de descrições de competência |
| `extract-text-vision` | gpt-4o | OCR de imagens |
| `transcribe-audio` | Whisper-1 | Transcrição de áudio (upload manual, legado) |
| `reanalyze-feedback` | gpt-4o-mini | Reprocessamento de feedback existente |

### Recall.ai (Transcrição de Reuniões)

| Função | Propósito |
|---|---|
| `schedule-recall-bot` | Agendamento manual de bot |
| `recall-webhook` | Webhook receptor de eventos do Recall.ai |
| `upload-meeting` | Upload de áudio da extensão Chrome |
| `reprocess-meeting` | Reprocessamento de transcrição existente |

### Google Calendar

| Função | Propósito |
|---|---|
| `fetch-calendar-events` | Sincronização de eventos + auto-schedule de bots |
| `google-calendar-oauth` | Fluxo OAuth para calendário |

### Slack

| Função | Propósito |
|---|---|
| `slack-bot` | Roteador central de comandos, interações e eventos |
| `slack-link` | Vinculação de contas Slack ↔ Rhitmo |
| `slack-oauth-callback` | Callback OAuth do Slack |
| `invite-member-slack` | Convite de liderados via DM |

### Pagamentos (Stripe)

| Função | Propósito |
|---|---|
| `create-checkout-session` | Criação de sessão de checkout |
| `stripe-webhook` | Webhook de eventos do Stripe |
| `cancel-subscription` | Cancelamento de assinatura |
| `reactivate-subscription` | Reativação de assinatura |
| `update-subscription` | Upgrade/downgrade de plano |
| `update-payment-method` | Atualização de método de pagamento |
| `create-portal-session` | Portal do cliente Stripe |
| `get-invoices` | Listagem de faturas |

### Emails

| Função | Propósito |
|---|---|
| `auth-email-hook` | Hook de emails de autenticação (custom templates) |
| `send-transactional-email` | Envio de emails transacionais via Resend |
| `process-email-queue` | Processamento de fila pgmq |
| `handle-email-suppression` | Gestão de bounces/complaints |
| `handle-email-unsubscribe` | Processamento de cancelamento |
| `preview-transactional-email` | Preview de templates |

### Notificações e Leads

| Função | Propósito |
|---|---|
| `notify-admin-new-lead` | Notificação de novo lead ao admin |
| `notify-review-shared` | Notificação de avaliação compartilhada |
| `notify-review-acknowledged` | Notificação de avaliação confirmada |
| `send-disc-invite` | Envio de convite DISC/Rhitmo Sync |
| `enterprise-contact` | Formulário de contato enterprise |

### Admin e Utilidades

| Função | Propósito |
|---|---|
| `admin-invite-user` | Convite de usuários via admin |
| `admin-delete-user` | Exclusão de usuários via admin |
| `admin-reset-password` | Reset de senha via admin |
| `bulk-onboard` | Cadastro em massa (até 100 usuários) |
| `backup-data` | Backup de dados do workspace |
| `generate-extension-token` | Geração de token para extensão Chrome |

---

## 6. Sistema de IA

### Constituição Rhitmo

Todas as Edge Functions de IA seguem a **Constituição Rhitmo** (`supabase/functions/_shared/rhitmo-constitution.ts`), que centraliza:
- Identidade da marca e tom de voz
- Guardrails de segurança (anti-alucinação, anti-jailbreak)
- Regras de análise e formatação
- Protocolo de identidade blindada e flexibilidade de nomes

### Mentor Chat — Pipeline de 3 Camadas

| Camada | Modelo | Custo | Propósito |
|---|---|---|---|
| **Layer 1** — Router Semântico | gpt-4o-mini | $0.000048/msg | Decide se contexto é necessário |
| **Layer 2** — Compressor de Contexto | JavaScript puro | $0.00 | Destila notas relevantes (RAG histórico) |
| **Layer 3** — Resposta RAG | Gemini 2.5 Flash (Lovable AI) | $0.00 | Resposta calibrada pelo perfil comportamental |

**Features avançadas:**
- Transcrições longas (>800 palavras): pipeline de summarização em 2 passos
- Busca semântica via `match_feedbacks` (pgvector, threshold 0.5)
- Retry com backoff exponencial para rate limiting
- Consciência de contexto ao mencionar membros no Slack

### Detecção de Viés (Bias Detection)

- Implementação **100% client-side** (extensão Tiptap + ProseMirror)
- Vocabulário de termos codificados por gênero e generalizações
- Sublinhados ondulados (`Decoration.inline`) em tempo real
- Sugestões de alternativas neutras focadas em evidências observáveis
- Latência zero — sem chamada de API

### Avaliações de Desempenho (Performance Reviews)

- Coleta automática de evidências via RPC `get_review_evidence`
- Geração por IA com regras anti-alucinação (citar fonte de cada afirmação)
- Output em HTML puro para integração com Tiptap
- Seções: Resumo, Pontos Fortes, Desenvolvimento, Próximos Passos
- Avaliação por competências vinculada a cargos (`job_roles`)
- Coaching tips exclusivos para o líder (não compartilhados)

### Pre-Meeting Briefs

- Consolidam: última conversa, tendências de humor, itens de ação, metas
- Sugestões de coaching baseadas no perfil DISC/comportamental
- Gerados via `generate-brief` (Gemini 3 Flash Preview)
- Cache em `upcoming_meetings.brief_cache`

### RAG e Embeddings

- Embeddings: `text-embedding-3-small` (1536 dimensões)
- Armazenados em `feedbacks.embedding` (pgvector)
- Gerados assincronamente via `analyze-feedback-background`
- Busca via RPC `match_feedbacks` com threshold 0.5
- Merge com notas recentes para contexto profundo

---

## 7. Integração Recall.ai

### Arquitetura

```
Google Calendar Sync → Auto-schedule bot (2 min antes)
                         ↓
                    Recall.ai API (us-west-2)
                         ↓
                    Webhook events → recall-webhook
                         ↓
                    Transcript processing → Feedback creation
                         ↓
                    Background analysis (analyze-feedback-background)
```

### Configuração do Bot

```json
{
  "bot_name": "Rhitmo",
  "recording_config": {
    "transcript": {
      "provider": {
        "recallai_streaming": {
          "mode": "prioritize_accuracy",
          "language_code": "auto"
        }
      }
    }
  },
  "automatic_leave": {
    "waiting_room_timeout": 120,
    "in_call_not_recording_timeout": 180,
    "noone_joined_timeout": 300
  },
  "chat": {
    "on_bot_join": { "send_to": "everyone", "pin": true },
    "on_participant_join": { "exclude_host": true }
  }
}
```

### Billing Model

| Componente | Custo |
|---|---|
| Machine Time (joining → done) | ~$0.25–0.35/hora |
| Transcription (recallai_streaming) | $0.15/hora |
| **Total efetivo** | **~$0.40–0.50/hora** |

### Deduplicação (corrigido 15/04/2026)

1. **Primário:** por `meeting_id` (referência `upcoming_meetings`)
2. **Fallback:** por `meeting_url` (evita duplicação em reuniões recorrentes)
3. Status excluídos do fallback: `error`, `done`, `skipped_no_leader`

### Detecção de Presença do Líder

- `leader_email` salvo no registro `recall_bots`
- Verificação **síncrona** no `bot.in_call_recording` (sem setTimeout — não funciona em Deno)
- Re-check no `bot.done` se ainda não detectado
- Se líder ausente: status `skipped_no_leader`, transcrição descartada

### Multi-Member Diarization

- O webhook identifica todos os liderados participantes via `google_event_id` ou `meeting_url`
- Gera registros individuais de feedback e transcrição para cada membro
- Speaker names extraídos da `speaker_timeline` do transcript

---

## 8. Integração Slack

### Arquitetura

Edge Function `slack-bot` centraliza todo o roteamento:
- Comandos slash
- Interações (botões, modais)
- Eventos (mensagens DM, App Home)

**Padrão de resposta:** confirmação imediata (200 OK vazio em <3s) + processamento assíncrono via `response_url`.

### Ecossistema de Comandos

| Comando | Propósito |
|---|---|
| `/rhitmo` | Menu principal |
| `/nota` | Registrar feedback rápido |
| `/kudos` | Reconhecimento público |
| `/brief` | Resumo pré-reunião |
| `/meu-pdi` | Status do PDI (liderado) |
| `/mentor` | Coaching IA contextual |
| `/meu-rhitmo` | Parceiro de carreira IA (liderado) |

### Proteção de Privacidade

- Detecção de tipo de canal via prefixo de ID (C=Público, D=DM, G=Privado)
- Cache de 5 min da API `conversations.info`
- Ações sensíveis redirecionadas para DMs
- Avisos de privacidade em canais públicos

### OAuth Bidirecional

- Slack → Rhitmo: vinculação automática via `slack-link`
- Rhitmo → Slack: convite de liderados via DM (`invite-member-slack`)
- Tabela `slack_integrations` para mapeamento

---

## 9. Integração Google Calendar

### Fluxo de Sincronização

1. OAuth via `google-calendar-oauth` (client_id + client_secret)
2. Tokens armazenados em `google_calendar_tokens`
3. `fetch-calendar-events` roda periodicamente:
   - Busca eventos das próximas 48h com paginação
   - Match de participantes com `team_members` por email (normalizado)
   - Upsert em `upcoming_meetings`
   - Auto-schedule de bots Recall.ai se `auto_transcribe = true`
4. Cleanup de reuniões passadas (>1h)

### Renovação de Tokens

- Automática via `refresh_token` quando `token_expiry` expirado
- Se refresh falhar: deleta token, retorna 401 pedindo reconexão
- Utiliza `supabase.auth.getUser()` para manter sessão viva

---

## 10. Extensão Chrome

### Arquitetura

- **Manifest V3** com APIs `tabCapture` e `offscreen`
- Gravação automática de áudio no Google Meet
- Detecção de reuniões com seletores robustos e localizados (PT/EN)
- Fallback: presença de ≥2 elementos `<video>`

### Autenticação

- Extension Tokens dedicados e persistentes (`extension_tokens` table)
- Gerados via `generate-extension-token`
- Hash armazenado (não o token em texto plano)

### Upload

- Áudio enviado no campo `file` para Edge Function `upload-meeting`
- Processamento via Whisper-1 (fallback para upload manual)

---

## 11. Sistema de Emails

### Infraestrutura

- **Domínio:** `notify.rhitmo.co`
- **Provider:** Resend (free tier: 3k/mês)
- **Fila:** pgmq para entrega resiliente
- **Templates:** React Email com branding consistente

### Fluxos

| Tipo | Função | Templates |
|---|---|---|
| **Auth** | `auth-email-hook` | signup, recovery, magic-link, email-change, reauthentication |
| **Transacional** | `send-transactional-email` | leader-welcome, member-welcome, hr-admin-welcome, sync-completed, sync-invite, review-shared, review-acknowledged, waitlist-confirmation, admin-new-lead, enterprise-lead |
| **Processamento** | `process-email-queue` | Dequeue + envio via Resend |
| **Supressão** | `handle-email-suppression` | Gestão de bounces/complaints |
| **Unsubscribe** | `handle-email-unsubscribe` | Página `/unsubscribe` |

---

## 12. Monetização e Billing

### Stack de Pagamento

- **Stripe** via Edge Functions customizadas (não Lovable Payments nativo)
- Preserva configurações de produto, planos e assinaturas existentes

### Fluxo

```
Landing/Billing → create-checkout-session → Stripe Checkout
                                              ↓
                                        stripe-webhook → subscriptions table
                                              ↓
                                        update workspace.plan_tier
```

### Limites por Plano

| Recurso | Pulse | Pro | Business |
|---|---|---|---|
| Liderados | 2 | 5 | 10 |
| Mentor Chat | ✓ | ✓ | ✓ |
| Meu Rhitmo (liderado) | ✗ | ✓ | ✓ |
| Recall.ai Bot | ✗ | ✓ | ✓ |
| Avaliações formais | ✗ | ✓ | ✓ |
| PDI | ✗ | ✓ | ✓ |
| Competency Framework | ✗ | ✓ | ✓ |

**Aplicação:** Hook `usePlanLimits` no frontend + validação nas Edge Functions.

---

## 13. Frontend — Componentes Chave

### Estado Global

- **`AccountContext`** — orquestrador central de `role`, `workspaceId`, `isLinkedMember`
- **`AuthContext`** — sessão, login/logout, proteção contra sessões zumbi
- **`AuthEventProvider`** — eventos de auth (password recovery, etc.)

### Dashboards

| Dashboard | Rota | Usuário |
|---|---|---|
| Dashboard do Líder | `/` | Líder/Owner |
| Meu Painel (liderado) | `/` | Membro vinculado |
| HR Dashboard | `/hr-dashboard` | HR Admin |
| Admin Panel | `/admin` | Super Admin |

### Features Principais por Componente

| Componente | Feature |
|---|---|
| `FeedbackTimeline` | Diário de Bordo com filtros por tipo/sentimento |
| `MentorChat` | Chat IA com threads e contexto por membro |
| `GoalsManager` | Gestão de metas com progresso |
| `NewPDIDialog` | Criação de PDI com IA |
| `PerformanceReviewList` | Lista de avaliações com ações |
| `FormalReviewSheet` | Editor de avaliação formal (Tiptap + competências) |
| `BiasDetectionPanel` | Alertas de viés em tempo real |
| `UpcomingMeetingsCard` | Reuniões com briefs e status do bot |
| `SetupChecklist` | Onboarding progressivo |
| `WorkspaceOnboarding` | Wizard de configuração inicial |
| `ActivitySheet` | **Único ponto de notificações** (sino no header) — consome `leader_nudges`, `rhitmo_sync_notifications` e alertas de sistema |

### Sidebar do Líder (`AppSidebar.tsx`)

Grupo **"Integrações"** (anteriormente "Conectores"):

| Item | Ação | Observação |
|---|---|---|
| **Transcrição automática** | `navigate('/help#l-auto-transcription')` | Substituiu o atalho do "Conector Chrome" — a captura é feita pelo bot Recall.ai. Ícone `FileAudio`. |
| **Conector Slack** | Abre `SlackConnectorDialog` | Mantido. |

> O componente `ChromeExtensionSetupDialog` continua disponível para outros pontos de entrada (ex.: Configurações), mas perdeu o protagonismo na sidebar — a captura de reuniões hoje passa pelo bot Recall.ai via Google Calendar.

### Help Center — Hash Anchors

`HelpCenter.tsx` reage a `location.hash` para abrir cards específicos:

- Detecta `#<card-id>` no `useEffect`, faz scroll suave até o card e abre o accordion "Como funciona" (`defaultValue="steps"`).
- `FeatureGrid` aceita prop `openCardId` para destacar visualmente o card-alvo.
- Usado pelo atalho da sidebar (`#l-auto-transcription`) e pode ser estendido para deep-links externos.

### Portal do Liderado

- **Pulse Card:** métricas de engajamento (último feedback, progresso PDI, dias desde 1:1)
- **Próximas Ações:** prompts contextuais baseados em dados
- **Meu Rhitmo:** chat IA confidencial (parceiro de carreira)
- **Rhitmo Sync:** questionário comportamental (cronotipo, estilo de feedback, motivadores, manual de instruções)

---

## 14. Design System

### Estética "Creme / Bento"

| Aspecto | Especificação |
|---|---|
| **Feel** | High-end, "Soft UI", tátil |
| **Border Radius** | `rounded-2xl` / `rounded-3xl` para cards; `rounded-xl` para inputs |
| **Shadows** | Ultra-soft, difusas (`shadow-[0_2px_20px_rgba(0,0,0,0.04)]`) |
| **Layout** | Bento Grid assimétrico no dashboard |
| **Sidebar** | Floating (`rounded-2xl`, desconectada da borda) |
| **Auth** | Split Screen (Brand/Art à esquerda, Form à direita) |
| **Typography** | Headlines com `tracking-tight` + `font-bold` (editorial) |
| **Interactions** | Cards com "lift" no hover (`-translate-y-1`) |
| **Headings** | Lora (serifada) para headlines |
| **Body** | Inter para corpo de texto |

### Identidade Visual

- **Rhythm Wave:** ondas senoidais roxas em camadas sobre fundo creme
- **Logo:** "R" customizado com gradiente roxo
- **Avatares:** biblioteca proprietária de 24 variantes SVG (12 paletas × 2 expressões)

---

## 15. Internacionalização (i18n)

- **Idiomas:** PT-BR (padrão), EN, ES
- **Framework:** react-i18next v15 + i18next
- **Resolução:** metadados do workspace (`default_locale`) > preferência do navegador > PT-BR
- **Estrutura:** JSONs por namespace em `src/i18n/locales/`
- **Date formatting:** `dateLocale.ts` com locales do date-fns

---

## 16. Administração e Super Admin

### God's Eye Experience

- Usuário: `matheus@rhitmo.co` (super_admin)
- Supervisão total de workspaces, usuários e métricas

### Ferramentas Admin

| Módulo | Features |
|---|---|
| **Overview** | Dashboard com métricas globais |
| **Users** | CRUD de usuários, reset de senha, delete, impersonação |
| **Structure** | Gestão de workspaces, owners, HR admins |
| **Intelligence** | Health Score por workspace (0-100) |
| **Access** | Gestão de papéis e permissões |
| **Support** | Ferramentas de suporte técnico |
| **Export** | Backup e exportação de dados |

### Bulk Onboarding

- Cadastro em massa de até 100 usuários por lote
- Emails de boas-vindas personalizados por papel (Líder, Liderado, HR Admin)
- Via Edge Function `bulk-onboard`

---

## 17. Custos Operacionais

> Detalhamento completo em `cost-analysis.md`

### Resumo (cenário moderado, com otimizações)

| Plano | Custo/líder/mês (BRL) | Margem bruta |
|---|---|---|
| Pulse | R$0,08 | Subsídio |
| Pro | ~R$14,56 | ~70% |
| Business | ~R$29,00 | ~58% |

### Drivers de Custo

1. **Recall.ai** (~99% do custo variável): machine time + transcription
2. **OpenAI** (~1%): router semântico + análise de notas (gpt-4o-mini)
3. **Lovable AI** (0%): todas as respostas RAG, classificações, avaliações

### Custos Fixos

~R$174/mês ($30 USD) — Lovable Pro + domínio + DNS

---

## Changelog

| Data | Alteração |
|---|---|
| 15/04/2026 | Criação do documento (v1.0) |
| 15/04/2026 | Correção de deduplicação por `meeting_url`, auto-leave timeouts, setTimeout → síncrono no webhook |
