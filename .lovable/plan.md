

## Plano: Internacionalização (i18n) — PT-BR, EN, ES

### Escopo

~148 arquivos com ~600+ strings em português hardcoded precisam ser externalizadas. Isso inclui sidebar, dashboard, formulários, diálogos, pages de auth, billing, analytics, HR, competências, reviews, etc.

### Abordagem Técnica

Usar **react-i18next** (padrão da indústria para React) com JSON de traduções organizados por namespace.

---

### Fase 1 — Infraestrutura i18n

**Novos arquivos:**

| Arquivo | Descrição |
|---------|-----------|
| `src/i18n/index.ts` | Configuração do i18next + detector de idioma |
| `src/i18n/locales/pt-BR.json` | Todas as strings em português (fonte da verdade) |
| `src/i18n/locales/en.json` | Traduções em inglês |
| `src/i18n/locales/es.json` | Traduções em espanhol |

**Estrutura dos JSONs** (namespaces por área):
```json
{
  "common": { "save": "Salvar", "cancel": "Cancelar", ... },
  "sidebar": { "home": "Início", "analytics": "Analytics", ... },
  "auth": { "login": "Entrar", "forgotPassword": "Esqueci minha senha", ... },
  "dashboard": { "greeting.morning": "Bom dia", ... },
  "members": { ... },
  "reviews": { ... },
  "hr": { ... },
  "billing": { ... },
  "settings": { ... }
}
```

**Dependência:** `react-i18next` + `i18next` + `i18next-browser-languagedetector`

---

### Fase 2 — Contexto de Idioma + Persistência

**Migração SQL:** Adicionar coluna `default_locale` à tabela `workspaces` (varchar, default `'pt-BR'`).

**Migração SQL:** Adicionar coluna `locale_override` ao user metadata via `supabase.auth.updateUser`.

**Lógica de resolução de idioma (prioridade):**
1. `user.user_metadata.locale` (preferência pessoal) — se definido
2. `workspace.default_locale` (definido pelo admin) — se definido
3. `navigator.language` (browser) — fallback
4. `'pt-BR'` — fallback final

**Novo hook:** `src/hooks/useLocale.ts` — resolve o idioma ativo e expõe `setLocale()`.

---

### Fase 3 — UI de Seleção de Idioma

**ProfileSettingsDialog.tsx:** Adicionar seletor de idioma (dropdown com bandeiras 🇧🇷🇺🇸🇪🇸) na seção de perfil, que salva no `user_metadata.locale`.

**Admin Panel (AdminOverview ou AdminAccess):** Para o super-admin (matheus@rhitmo.co), adicionar opção de definir `default_locale` por workspace na lista de workspaces.

---

### Fase 4 — Migração de Strings (o grosso do trabalho)

Substituir todas as strings hardcoded por chamadas `t('namespace.key')` em **todos** os 148 arquivos. Organizado por área:

| Área | Arquivos estimados | Exemplos |
|------|-------------------|----------|
| **Sidebar + Nav** | ~5 | AppSidebar, NavLink |
| **Auth** | ~3 | Auth, ResetPassword, AuthPage |
| **Dashboard (Líder)** | ~15 | Index, SetupChecklist, ActivityPreview, NudgesBanner, GoalsManager |
| **Dashboard (Liderado)** | ~8 | DirectReportDashboard, CareerCompassCard, SkillsMapCard |
| **Members + Teams** | ~12 | TeamMemberCard, NewMemberDialog, EditMemberDialog, MemberDetails |
| **Feedback + Notes** | ~10 | FeedbackTimeline, NewNoteDialog, BiasDetectionPanel |
| **Reviews** | ~8 | PerformanceReviewList, NewReviewDialog, ReviewViewDialog, FormalReviewSheet |
| **HR** | ~8 | HRDashboard, HRMembers, HRTeams, HRAnalytics, EngagementHeatmap |
| **Competências** | ~7 | CompetencyFramework, CompetencyCard, CreateJobRoleDialog |
| **Billing** | ~3 | Billing, UpgradeBanner |
| **Settings + Profile** | ~5 | ProfileSettingsDialog, ThemeSelector, WorkspaceOnboarding |
| **Admin** | ~8 | AdminOverview, AdminUsers, AdminStructure, AdminSupport |
| **Onboarding + Sync** | ~5 | OnboardingModal, RhitmoSync, LeaderSyncWizard |
| **Landing + Legal** | ~5 | Landing, PrivacyPolicy, TermsOfService |
| **Misc** | ~10+ | MentorChat, MeetingRecorder, VoiceInput, etc. |

**Também:** `date-fns` locale — trocar `ptBR` hardcoded por locale dinâmico baseado no idioma ativo.

---

### Fase 5 — E-mails (Futuro/Opcional)

Os templates de email em `supabase/functions/_shared/` também estão em PT-BR. Internacionalizá-los requer passar o locale do destinatário para a Edge Function. Isso pode ser feito numa fase posterior.

---

### Resumo de Mudanças

| Tipo | Quantidade |
|------|-----------|
| Dependências novas | 3 (react-i18next, i18next, i18next-browser-languagedetector) |
| Arquivos novos | ~6 (config i18n + 3 JSONs de locale + hook + componente seletor) |
| Arquivos modificados | ~100+ (substituição de strings) |
| Migração SQL | 1 (coluna `default_locale` em workspaces) |
| Componentes UI novos | Seletor de idioma no perfil + opção admin por workspace |

---

### Riscos e Considerações

- **Volume:** Este é um projeto de alto volume. Vou fazer em batches (infraestrutura primeiro, depois área por área).
- **Strings dinâmicas:** Algumas strings vêm do banco (ex: nomes de competências, títulos de reviews). Essas não serão traduzidas — apenas a UI estática.
- **Emails:** Ficam em PT-BR por agora, a menos que queira incluir nessa fase.

### Ordem de Execução

1. Instalar dependências + criar infraestrutura i18n
2. Criar os 3 arquivos JSON de tradução completos
3. Migração SQL + hook useLocale
4. Seletor de idioma no perfil + admin
5. Migrar strings arquivo por arquivo (batches de ~15-20 arquivos)

