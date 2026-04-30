## Objetivo
Fechar os 6 pontos pendentes da refatoração de navegação, usando o Windmill como benchmark visual: cada item primário da sidebar é uma "página única" que pode conter sub-abas/seções no topo, em vez de inflar a sidebar. Itens legados (Analytics, Billing, Help, Evidence) viram sub-rotas dentro de Configurações ou Pessoas.

## Princípio Windmill aplicado
- Sidebar continua com 5–6 itens primários
- Páginas-host agrupam features relacionadas via abas/seções no header (Performance Reviews, 1:1s, etc.)
- Empty states grandes com CTA único (estilo "Set Up Your First Cycle")
- Rotas legadas redirecionam **direto** para o destino final, sem passar por `/dashboard`

---

## Ponto 1 — Substituir `navigate('/dashboard')` espalhado (21 ocorrências)

Criar helper `src/lib/navigation.ts` → `getHomeRoute(persona)` e usar em todos os lugares. Atualizar:

- `src/pages/Invite.tsx` (3x), `src/pages/AuthPage.tsx` (3x), `src/pages/Onboarding.tsx` (1x), `src/pages/ResetPassword.tsx` (1x): usar `useAccount` + `resolvePersona` para navegar direto ao home certo.
- `src/pages/NotFound.tsx`, `src/pages/SlackConnect.tsx` (3x), `src/pages/MemberDetails.tsx`, `src/pages/DirectReportReviewView.tsx` (2x), `src/pages/Evidence.tsx`, `src/pages/GoogleCalendarCallback.tsx` (3x): mesmo padrão.
- `src/components/HRAdminGuard.tsx`, `src/pages/DesignSystem.tsx`: trocar `<Navigate to="/dashboard">` por redirect role-aware.

Para componentes sem contexto fácil (`HRAdminGuard`), continuar usando `/dashboard` que já tem o smart redirect — aceitável (1 hop).

## Ponto 2 — Redirects corretos para liderado em `/analytics` e `/billing`

No `src/App.tsx`, envolver `/analytics` em `RoleRouteGuard expects="leader"` (analytics é leader-only). `/billing` continua acessível a líder; liderado é redirecionado para `/liderado/inicio`.

```text
/analytics  → Leader(<Analytics />)
/billing    → Leader(<Billing />)
/help       → acessível a ambos (manter)
/evidence   → Leader(<Evidence />)
```

## Ponto 3 — Sidebar: confirmar e polir "· RH" no WorkspaceSwitcher

`WorkspaceSwitcher.tsx` já mostra "· RH" quando `isHRAdmin && current`. Mover o sufixo para inline ao lado do nome (linha única, mais Windmill-like):

```text
[icon] Faster · RH    [chevron]
```

## Ponto 4 — Tornar `QuickActionsRow` funcional

Hoje os ícones Calendar/People/Chat/Search recebem callbacks que nunca são passados pelo `AppSidebar`. Implementar:

- **Calendar**: navega para `/lider/1on1s` (já funciona via `to`)
- **People**: navega para `/lider/pessoas` (já funciona)
- **Chat**: abre Sheet com `MentorChat` (criar estado local em `AppSidebar` + passar `onOpenMentor`)
- **Search**: abre `CommandDialog` global (cmdk) com busca em membros, threads e ações rápidas — primeira versão lista membros do workspace e threads recentes

Adicionar `MentorChatSheet` (Sheet do shadcn envolvendo `MentorChat` existente) e `GlobalSearchDialog` (cmdk) montados no `AppSidebar`.

## Ponto 5 — Botão "Convidar membros" funcional

Hoje navega para `/lider/inicio` (placeholder). Trocar por abertura direta do `BulkOnboardDialog` (já existe em `src/components/admin/`). Estado local em `AppSidebar` controla o `open`.

## Ponto 6 — Aplicar padrão Windmill: sub-navegação por abas nas páginas-host

Refatorar as páginas finas para abrigar features legadas como abas no header, em vez de espalhar mais itens na sidebar:

### `/lider/pessoas` (host de People + Analytics + HR)
```text
Pessoas
[ Membros ] [ Times ] [ Analytics ] [ Convites ]
```
- **Membros**: lista atual (`MemberDetails` summary cards)
- **Times**: conteúdo de `HRTeams` (se HR Admin)
- **Analytics**: conteúdo de `Analytics.tsx` embutido (líder vê seu time; HR vê org)
- **Convites**: pendentes + botão "Convidar"

### `/lider/configuracoes` (host de Settings + Billing + Slack + Calendar + Help)
```text
Configurações
[ Perfil ] [ Workspace ] [ Faturamento ] [ Integrações ] [ Ajuda ]
```
- **Perfil**: `ProfileSettingsDialog` inline
- **Workspace**: nome, locale, time zone
- **Faturamento**: conteúdo de `Billing.tsx`
- **Integrações**: Slack + Google Calendar + Chrome Extension
- **Ajuda**: `HelpCenter.tsx` embedado

### `/liderado/configuracoes`
```text
Configurações
[ Perfil ] [ Notificações ] [ Privacidade ] [ Ajuda ]
```

Manter `/billing`, `/analytics`, `/help` como rotas válidas (deep-link), mas que renderizam dentro do shell de `/lider/configuracoes` ou `/lider/pessoas` com a aba correta selecionada (via `searchParams` ou rota aninhada `/lider/configuracoes/faturamento`).

### `/lider/1on1s` (host)
```text
1:1s
[ Próximos ] [ Todos ] [ Estatísticas ]
```
Reaproveita o card "1:1s with Others" estilo Windmill no topo (educational banner dismissable).

### `/lider/avaliacoes` (host)
Layout Windmill: empty state grande "Set Up Your First Cycle" → CTA único quando vazio; quando há ciclos, abas `[ Ativos ] [ Rascunhos ] [ Concluídos ]`.

---

## Estrutura técnica

### Novos componentes
- `src/components/PageTabs.tsx` — wrapper sobre Tabs do shadcn com estilo Windmill (pill + underline)
- `src/components/sidebar/MentorChatSheet.tsx` — Sheet com `MentorChat`
- `src/components/sidebar/GlobalSearchDialog.tsx` — cmdk dialog
- `src/components/EmptyStateHero.tsx` — card grande estilo Windmill (rocket icon + titulo + desc + CTA único)

### Arquivos editados
- `src/App.tsx` — guards corretos em `/analytics`, `/billing`, `/evidence`; remover redirects desnecessários
- `src/components/AppSidebar.tsx` — passar `onOpenMentor`/`onOpenSearch` para `QuickActionsRow`; estado para Sheet/Dialog/Invite
- `src/components/sidebar/WorkspaceSwitcher.tsx` — "· RH" inline
- `src/components/DirectReportGuard.tsx` — sem mudanças (já funciona)
- `src/lib/navigation.ts` — adicionar `getHomeRoute(persona)` helper
- `src/pages/lider/Pessoas.tsx`, `Configuracoes.tsx`, `OneOnOnes.tsx`, `Avaliacoes.tsx` — implementar abas via `PageTabs`
- `src/pages/liderado/Configuracoes.tsx`, `OneOnOnes.tsx`, `Avaliacoes.tsx` — abas
- 21 arquivos com `navigate('/dashboard')` — usar helper role-aware
- `src/i18n/locales/{pt-BR,en,es}.json` — labels das novas abas (`tabs.*`)

### Sem migração de banco
Nenhuma mudança de schema necessária.

---

## Validação
- Liderado em `/analytics` ou `/billing` → redirect para `/liderado/inicio`
- Líder em `/lider/configuracoes` → vê 5 abas, deep-link `/billing` abre na aba certa
- HR Admin → workspace switcher mostra "Faster · RH"
- Quick action Search abre cmdk; Chat abre Sheet de Mentor
- Botão "Convidar membros" abre dialog imediatamente (sem navegação)
- Onboarding/Auth/Invite/Reset → vão direto para home certo (sem hop pelo `/dashboard`)
- Páginas-host (Pessoas, Config, 1:1s, Avaliações) com abas estilo Windmill
- Empty states usam `EmptyStateHero` com CTA único

## Riscos
- **Embed de Analytics dentro de Pessoas**: `Analytics.tsx` é página completa hoje; vou extrair `<AnalyticsContent />` para reuso (mantém a rota `/analytics` funcionando como wrapper)
- **Billing dentro de Configurações**: mesmo padrão — extrair `<BillingContent />`
- **Search global**: primeira versão simples (membros + threads); evolução futura

Posso prosseguir?
