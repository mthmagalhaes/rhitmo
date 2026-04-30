## Objetivo
Fechar o que sobrou da refatoração de navegação:
- **Fase A** — eliminar de vez os 16 `navigate('/dashboard')` restantes nos fluxos críticos de entrada (Auth, Invite, Onboarding, Reset, OAuth).
- **Fase B** — aplicar o padrão Windmill: cada item da sidebar é uma página única que agrupa features relacionadas em **sub-abas no topo**, em vez de inflar a sidebar com Analytics, Billing, Help, etc.

---

## Fase A — Limpeza de navegação legada (rápida)

Substituir os 16 `navigate('/dashboard')` por `useHomeRoute()` (já existente em `src/hooks/useHomeRoute.ts`):

| Arquivo | Ocorrências |
|---|---|
| `src/pages/AuthPage.tsx` | 3 (login, signup, OAuth callback) |
| `src/pages/Invite.tsx` | 3 |
| `src/pages/Onboarding.tsx` | 1 (fim do wizard) |
| `src/pages/ResetPassword.tsx` | 1 |
| `src/pages/GoogleCalendarCallback.tsx` | 3 |
| `src/pages/SlackConnect.tsx` | 3 (botões "Voltar") |
| `src/pages/DirectReportReviewView.tsx` | 2 |

Padrão por arquivo:
```tsx
const home = useHomeRoute();
// ...
navigate(home, { replace: true });
```

Em arquivos onde `useAccount` ainda não está hidratado (ex.: `AuthPage` logo após signIn), adicionar pequena espera pelo `loading=false` antes de redirecionar — `useHomeRoute` já cai em `LEADER_HOME` durante loading, mas no Auth queremos evitar flash. Solução: aguardar `!loading` no `useEffect` de redirect.

`HRAdminGuard` e `DesignSystem` permanecem com `<Navigate to="/dashboard">` (smart redirect, 1 hop aceitável — explicitado no plano original).

---

## Fase B — Padrão Windmill (host pages com sub-abas)

### Princípios
- Sidebar continua com 5–6 itens primários
- Cada página-host abriga features legadas como abas no header
- Empty states grandes com 1 CTA (estilo "Set Up Your First Cycle")
- Deep-links legados (`/analytics`, `/billing`, `/help`) continuam válidos: redirecionam para a página-host com aba pré-selecionada via `?tab=`

### Novos componentes compartilhados

**`src/components/PageTabs.tsx`** — wrapper sobre `Tabs` do shadcn com look Windmill:
- Pílulas com underline ativo
- Suporte a `searchParams` para sincronizar aba na URL (`?tab=analytics`)
- Props: `tabs: { value, label, icon?, count? }[]`, `defaultValue`, `syncParam?`

**`src/components/EmptyStateHero.tsx`** — card grande estilo Windmill:
- Ícone (rocket/sparkle) em círculo soft
- Título tracking-tight, descrição muted, 1 CTA primário
- Variant opcional `compact` para topo de listas

### Extrações para reuso

Hoje `Analytics.tsx` (534 linhas), `Billing.tsx` (728), `HelpCenter.tsx` (714) são páginas full-shell. Extrair o conteúdo (sem header/sidebar) para componentes embutíveis em abas:

- `src/pages/Analytics.tsx` → expõe `<AnalyticsContent />`; rota `/analytics` vira wrapper que renderiza `<AnalyticsContent />` dentro do shell padrão
- `src/pages/Billing.tsx` → expõe `<BillingContent />`
- `src/pages/HelpCenter.tsx` → expõe `<HelpCenterContent />`

Manter os arquivos atuais funcionando como rotas standalone (compatibilidade de deep-links externos / e-mails antigos).

### Refatoração das páginas-host

#### `/lider/pessoas`
```text
Pessoas
[ Membros ] [ Times ] [ Analytics ] [ Convites ]
```
- **Membros**: lista de team members (extraída de `Index.tsx`, seção de cards)
- **Times**: conteúdo de `HRTeams` quando HR Admin; senão oculta a aba
- **Analytics**: `<AnalyticsContent />` (líder vê próprio time, HR vê org)
- **Convites**: pendentes + botão "Convidar" → `BulkOnboardDialog`

#### `/lider/configuracoes`
```text
Configurações
[ Perfil ] [ Workspace ] [ Faturamento ] [ Integrações ] [ Ajuda ]
```
- **Perfil**: form inline (extraído de `ProfileSettingsDialog`)
- **Workspace**: nome, locale, timezone, owner
- **Faturamento**: `<BillingContent />`
- **Integrações**: cards Slack + Google Calendar + Chrome Extension
- **Ajuda**: `<HelpCenterContent />`

#### `/lider/1on1s`
```text
1:1s
[ Próximos ] [ Todos ] [ Estatísticas ]
```
Banner educacional dismissable no topo (estilo Windmill "1:1s with Others").

#### `/lider/avaliacoes`
- Vazio → `EmptyStateHero` "Set Up Your First Cycle" + CTA único
- Com dados → `[ Ativos ] [ Rascunhos ] [ Concluídos ]`

#### `/liderado/configuracoes`
```text
Configurações
[ Perfil ] [ Notificações ] [ Privacidade ] [ Ajuda ]
```

#### `/liderado/1on1s` e `/liderado/avaliacoes`
- 1on1s: `[ Próximos ] [ Histórico ]`
- Avaliações: `[ Para revisar ] [ Concluídas ]` + empty state quando vazio

### Redirects de deep-link legados

Em `src/App.tsx`, `/analytics`, `/billing`, `/help` continuam montados como rotas independentes (atualmente envolvidas em `Leader(...)`). Adicionar nova lógica:
```text
/analytics  → render direto (compat) E também acessível via /lider/pessoas?tab=analytics
/billing    → render direto E /lider/configuracoes?tab=faturamento
/help       → render direto E /lider/configuracoes?tab=ajuda (líder) ou /liderado/configuracoes?tab=ajuda
```
Sem redirect forçado — apenas duas formas de chegar. `PageTabs` lê `?tab=` para abrir na aba certa.

---

## Estrutura técnica

### Novos arquivos
- `src/components/PageTabs.tsx`
- `src/components/EmptyStateHero.tsx`
- `src/components/people/MembersTab.tsx`, `TeamsTab.tsx`, `InvitesTab.tsx` (extrações de `Index.tsx`)
- `src/components/settings/ProfileTab.tsx`, `WorkspaceTab.tsx`, `IntegrationsTab.tsx`
- `src/components/settings/MemberSettingsTabs.tsx` (notificações + privacidade do liderado)

### Editados
- `src/pages/Analytics.tsx` — extrair `AnalyticsContent`
- `src/pages/Billing.tsx` — extrair `BillingContent`
- `src/pages/HelpCenter.tsx` — extrair `HelpCenterContent`
- `src/pages/lider/Pessoas.tsx` — abas reais (substitui `<Index/>` placeholder)
- `src/pages/lider/Configuracoes.tsx` — abas reais (substitui `<Billing/>` placeholder)
- `src/pages/lider/OneOnOnes.tsx`, `Avaliacoes.tsx` — abas + empty state
- `src/pages/liderado/Configuracoes.tsx`, `OneOnOnes.tsx`, `Avaliacoes.tsx` — abas
- `src/pages/AuthPage.tsx`, `Invite.tsx`, `Onboarding.tsx`, `ResetPassword.tsx`, `GoogleCalendarCallback.tsx`, `SlackConnect.tsx`, `DirectReportReviewView.tsx` — `useHomeRoute()`
- `src/i18n/locales/{pt-BR,en,es}.json` — chaves `tabs.*` e `emptyState.*`

### Sem migração de banco
Nenhuma mudança de schema.

---

## Validação
- Login/signup/aceite-de-convite/onboarding/reset-password vão **direto** para o home certo, sem flash em `/dashboard`
- `/lider/pessoas` mostra 4 abas; `?tab=analytics` abre direto na aba Analytics
- `/lider/configuracoes` mostra 5 abas; `/billing` redireciona ou renderiza como aba "Faturamento"
- `/lider/avaliacoes` sem ciclos exibe `EmptyStateHero` com 1 CTA
- HR Admin vê aba "Times" em Pessoas; líder simples não vê
- `/liderado/configuracoes` mostra 4 abas (sem Faturamento)
- Build sem warnings; deep-links de e-mails antigos (`/analytics`, `/billing`, `/help`) continuam funcionando

## Riscos
- **Tamanho dos arquivos extraídos**: Analytics/Billing/HelpCenter são grandes — extração mecânica (cortar header/wrapper, manter resto) reduz risco de regressão
- **Estado das abas**: usar `searchParams` (não `useState`) para preservar aba em refresh e permitir deep-link
- **Index.tsx (823 linhas)**: a aba "Membros" reusa o JSX existente; não vou reescrever a lógica de fetch, apenas componentizar a seção de cards