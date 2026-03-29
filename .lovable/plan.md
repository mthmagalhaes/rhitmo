

# Plano Técnico Atualizado — Rhitmo

## Visão do Produto
Rhitmo e um parceiro de lideranca AI-Native ("Service-as-Software") que transforma gerentes em lideres de alta performance. Funciona como um Chief of Staff digital com coaching ativo em tempo real.

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (SPA)                     │
│  React 18 + Vite + TypeScript + Tailwind + Shadcn   │
│  TanStack Query · Tiptap Editor · Recharts           │
└──────────────────────┬──────────────────────────────┘
                       │ Supabase JS SDK
┌──────────────────────▼──────────────────────────────┐
│              LOVABLE CLOUD (Supabase)                │
│                                                      │
│  Auth ─── Postgres ─── Edge Functions ─── Storage    │
│           (RLS)        (Deno/AI)                     │
└─────────────────────────────────────────────────────┘
```

---

## Tabelas do Banco (20 tabelas)

| Tabela | Finalidade |
|---|---|
| `workspaces` | Multi-tenancy. owner_id, plan_tier, hr_admin_ids |
| `teams` | Grupos dentro de workspace |
| `team_members` | Liderados. linked_user_id para acesso direto, work_style_data, skills_data |
| `feedbacks` | Notas/feedbacks do lider. sentiment, tags, embedding (pgvector) |
| `meeting_transcripts` | Transcrições de reunioes (privadas do lider) |
| `performance_reviews` | Avaliacoes formais. shared_with_member, sent_at, acknowledged_at |
| `review_comments` | Comentarios em avaliacoes (tabela existe, UI removida — dormant) |
| `goals` | OKRs/metas por membro |
| `development_plans` / `development_items` | PDIs com status e itens |
| `mentor_messages` / `chat_threads` | Chat com Mentor AI por thread |
| `leader_nudges` | Cutucadas proativas da AI ao lider |
| `bias_detections` | Alertas de vies detectados pela AI |
| `subscriptions` | Stripe integration. plan_tier, stripe_subscription_id |
| `competency_frameworks` / `competencies` / `competency_level_descriptions` | Framework de competencias por workspace |
| `job_roles` / `role_competencies` | Cargos e competencias esperadas |
| `competency_templates` | Templates publicos de competencias |
| `google_calendar_tokens` / `upcoming_meetings` | Integracao Google Calendar |
| `user_preferences` | Tema (light/dark) |
| `user_roles` | Roles de sistema (super_admin, support) |
| `admin_impersonation` | Log de impersonacao admin |
| `rhitmo_sync_notifications` | Notificacoes de mudancas no Rhitmo Sync |
| `waitlist_leads` | Leads da landing page |

---

## Funcoes de Banco (DB Functions)

- `effective_user_id()` — retorna user real ou impersonado (admin)
- `check_is_admin()` / `is_admin()` — verifica role super_admin
- `is_workspace_owner()` / `user_owns_team()` — ownership checks
- `user_is_linked_member()` — verifica se user e liderado vinculado
- `get_review_evidence()` — coleta evidencias para avaliacao formal
- `match_feedbacks()` — busca semantica com pgvector
- `submit_rhitmo_sync_v2()` — salva dados do Rhitmo Sync
- `get_hr_*` — funcoes do painel HR (dashboard, members, leaders)
- `get_invite_details()` / `get_member_for_sync()` — acesso publico controlado

---

## Edge Functions (34 funcoes)

### AI/Processamento
| Funcao | Descricao |
|---|---|
| `analyze-feedback` | Analisa nota com AI (sentiment, tags, coaching) |
| `analyze-feedback-background` | Versao async da analise |
| `classify-note` | Classifica tipo de nota |
| `chat-mentor` | Chat com Mentor AI (multi-thread) |
| `generate-review` | Gera review de performance rapida |
| `generate-formal-review` | Gera avaliacao formal com Lucide SVGs inline |
| `generate-brief` | Brief pre-reuniao |
| `generate-nudges` | Gera cutucadas proativas |
| `generate-competencies` | Gera competencias via AI |
| `adjust-competency` | Ajusta nivel de competencia |
| `analyze-job-crafting` | Analise de job crafting |
| `meu-rhitmo` | Dashboard pessoal do liderado |
| `reanalyze-feedback` | Re-processa feedback existente |
| `reprocess-meeting` | Re-processa transcricao |

### Audio/Midia
| Funcao | Descricao |
|---|---|
| `transcribe-audio` | Transcreve audio |
| `upload-meeting` | Upload de gravacao |
| `extract-text-vision` | OCR/Vision para texto |

### Notificacoes (Resend)
| Funcao | Descricao |
|---|---|
| `notify-review-shared` | Email ao liderado quando avaliacao e compartilhada |
| `notify-review-acknowledged` | Email ao lider quando liderado confirma leitura |
| `notify-admin-new-lead` | Notifica admin sobre novo lead |
| `send-disc-invite` | Envia convite DISC/Rhitmo Sync |

### Billing (Stripe)
| Funcao | Descricao |
|---|---|
| `create-checkout-session` | Cria sessao de checkout Stripe |
| `create-portal-session` | Portal de billing Stripe |
| `stripe-webhook` | Webhook Stripe |
| `cancel-subscription` | Cancela assinatura |
| `reactivate-subscription` | Reativa assinatura |
| `update-payment-method` | Atualiza metodo de pagamento |
| `get-invoices` | Lista faturas |

### Admin/Outros
| Funcao | Descricao |
|---|---|
| `admin-delete-user` | Deleta usuario (admin) |
| `admin-invite-user` | Convida usuario (admin) |
| `backup-data` | Exporta dados |
| `google-calendar-oauth` | OAuth Google Calendar |
| `fetch-calendar-events` | Busca eventos do calendario |

---

## Paginas & Rotas (21 rotas)

### Publicas
| Rota | Pagina |
|---|---|
| `/` | Landing page |
| `/auth` | Login/Signup |
| `/sync/:memberId` | Rhitmo Sync (questionario liderado) |
| `/invite` | Aceitar convite |
| `/review/:reviewId` | View read-only de avaliacao (liderado) |
| `/terms-of-service` | Termos |
| `/privacy-policy` | Privacidade |

### Lider (com DirectReportGuard)
| Rota | Pagina |
|---|---|
| `/dashboard` | Dashboard principal (Bento Grid) |
| `/member/:id` | Detalhe do membro |
| `/analytics` | Analytics |
| `/billing` | Faturamento |
| `/help` | Central de ajuda |
| `/brief/:meetingId` | Brief pre-reuniao |

### HR Admin (com HRAdminGuard)
| Rota | Pagina |
|---|---|
| `/hr` | Dashboard HR |
| `/hr/teams` | Times HR |
| `/hr/members` | Membros HR |
| `/hr/analytics` | Analytics HR |
| `/hr/competency-framework` | Framework de competencias |

### Super Admin (com AdminGuard)
| Rota | Pagina |
|---|---|
| `/admin` | Painel admin (overview, users, export, support) |

### Liderado
| Rota | Pagina |
|---|---|
| `/onboarding` | Onboarding do liderado |
| `/dashboard` | Redirect para DirectReportDashboard (via guard) |

---

## Componentes Principais (~70 componentes)

### Core
- `AppLayout` + `AppSidebar` — Layout com sidebar flutuante
- `Auth` + `AuthEventProvider` — Autenticacao
- `DirectReportGuard` — Redireciona liderados para dashboard proprio
- `ThemeProvider` + `ThemeSelector` — Tema light/dark

### Dashboard
- `DirectReportDashboard` — Dashboard do liderado
- `CareerCompassCard` — Card central AI
- `SkillsMapCard` — Mapa de skills

### Feedback
- `FeedbackTimeline` — Timeline com filtros
- `FeedbackFilters` — Filtros de feedback
- `NewNoteDialog` — Nova nota
- `BiasDetectionPanel` + `BiasAlert` — Detecção de vies

### Performance
- `PerformanceReviewList` — Lista de avaliacoes
- `FormalReviewSheet` — Sheet de avaliação formal (editor Tiptap)
- `CreateFormalReviewDialog` — Dialogo de criacao
- `ShareReviewDialog` — Compartilhar avaliacao com liderado
- `ReviewCommentsSection` — Componente de comentarios (UI removida, arquivo preservado)

### Equipe
- `TeamTabs` + `TeamMemberCard` — Gestao de equipe
- `NewTeamDialog` / `EditTeamDialog` / `DeleteTeamDialog`
- `NewMemberDialog` / `EditMemberDialog` / `InviteMemberDialog`

### AI
- `MentorChat` — Chat com Mentor AI (multi-thread)
- `NudgesBanner` — Banner de cutucadas
- `LeaderSyncWizard` — Wizard de sync do lider

### Competencias
- `CompetencyCard` / `EditCompetencyModal` / `AICompetencyDialog`
- `CreateJobRoleDialog` / `AdjustCompetencyDialog`
- `CompetencyPreviewTable`

### HR
- `MemberProfileSheet` — Perfil do membro (HR view)

### Admin
- `AdminOverview` / `AdminUsers` / `AdminExport` / `AdminSupport`

---

## Hooks Customizados

| Hook | Funcao |
|---|---|
| `useAuth` | Estado de autenticacao |
| `useAdmin` | Verifica role admin |
| `useUserRole` | Verifica roles do usuario |
| `useLinkedMember` | Dados do membro vinculado |
| `usePlanLimits` | Limites do plano atual |
| `useCalendarIntegration` | Google Calendar |
| `useTheme` | Preferencia de tema |
| `use-mobile` | Breakpoint mobile |

---

## Monetizacao (3 planos)

| Plano | Preco | Limites |
|---|---|---|
| **Pulse** (Free) | R$0 | 3 lideres, 1 time, 20 msgs chat, 1 review/mes |
| **Pro** | R$49/mes | 5 lideres, 3 times, 12h gravacao, ilimitado chat/reviews |
| **Business** | R$69/lider/mes | 8 lideres/lider, times ilimitados, 30h gravacao, HR Dashboard |

---

## Integrações Externas

- **Stripe** — Billing completo (checkout, portal, webhooks)
- **Resend** — Emails transacionais (notificacoes de review, convites)
- **Google Calendar** — OAuth + sync de eventos
- **Lovable AI** — Modelos AI via edge functions (sem API key do usuario)

---

## Status Recente das Mudancas

1. Avaliacoes formais com Lucide SVGs inline (substituiu emojis)
2. Strip de code fences do output AI
3. Sistema de compartilhamento de reviews (tri-estado: Rascunho → Enviada → Confirmada)
4. Notificacoes por email (Resend) para compartilhamento e confirmacao
5. Comentarios removidos da UI (tabela preservada no banco)
6. View read-only para liderados em `/review/:reviewId`

---

## Seguranca

- **RLS em todas as tabelas** — ownership via workspace/team chain
- **effective_user_id()** — suporta impersonacao admin
- **Privacy by default** — notas privadas, compartilhamento explicito
- **Roles separados** — tabela `user_roles` (super_admin, support)
- **Zero Trust** — liderado so ve dados com `shared_with_member = true`

