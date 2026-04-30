# Refatoração de Navegação: Sidebar por Papel + Rotas Separadas

Substitui a sidebar e o roteamento atuais por uma arquitetura clara: Líder e Liderado têm navs e árvores de rotas distintas, workspace switcher sempre presente, threads de IA como cidadãos de primeira classe, CTA de IA fixo no rodapé.

## Princípios
- Máximo 5–6 itens primários por papel
- Workspace switcher sempre no topo (mesmo com 1 workspace)
- CTA de IA persistente no rodapé
- Estado ativo é a única ênfase (sem badges/contadores)
- Estética Creme/Bento mantida (rounded-2xl, shadows soft)

## Diferenças importantes vs. spec original (alinhamento com base atual)

1. **Tabela `chat_threads`**: o `type` atual aceita só `'mentor' | 'career' | 'assistant'` (CHECK constraint) e exige `member_id NOT NULL`. Vou:
   - Estender o CHECK para incluir `'meu_rhitmo'` e `'brief'` via migration.
   - Tornar `member_id` nullable (threads de líder com Mentor podem não ter membro alvo) — ou manter NOT NULL e criar um "self-member" sentinel? **Proposta**: tornar `member_id` nullable e atualizar RLS/índices. Confirmo no momento da migration.
2. **Locales**: o projeto usa `pt-BR.json` / `en.json` / `es.json` (não `pt.ts`). Adicionarei o namespace `nav` nesses JSONs.
3. **Rotas legadas**: vou mapear cada rota existente para a nova com `<Navigate replace>` (SPA não tem 301 real; replace cumpre o papel).
4. **Páginas placeholder**: `/lider/pulse`, `/liderado/pulse`, `/liderado/pdi`, `/liderado/compass` ainda não têm telas dedicadas. Vou criar páginas finas que reutilizam componentes existentes (`DirectReportDashboard`, `Career Compass card`, `GoalsManager` para PDI) ou um EmptyState quando não houver conteúdo.
5. **Super Admin (`matheus@rhitmo.co`) impersonando** continua funcionando: a sidebar de líder será mostrada quando o usuário efetivo for líder.

## Arquivos

### Criar
- `src/lib/navigation.ts` — arrays tipados `LEADER_NAV_ITEMS` e `DIRECT_REPORT_NAV_ITEMS` + ícones do topo + helper `resolveRoleNav(role)`.
- `src/components/sidebar/WorkspaceSwitcher.tsx` — logo + nome + chevron, dropdown com workspaces do usuário (RLS), entrada extra "· RH" quando HR Admin.
- `src/components/sidebar/ThreadsList.tsx` — query `chat_threads` (5 mais recentes), heading variável, navega para `/chat/:threadId`, empty silencioso.
- `src/components/sidebar/SidebarFooterCTA.tsx` — CTA "Pergunte ao Mentor" (líder, abre Sheet com `MentorChat`) ou "Meu Rhitmo · privado" (liderado, navega).
- `src/components/sidebar/SidebarProfileBlock.tsx` — avatar + nome + toggle Sun/Moon (`useTheme`).
- `src/components/sidebar/QuickActionsRow.tsx` — linha de ícones contextuais (calendário, pessoas, conversas, busca placeholder).
- `src/components/RoleRouteGuard.tsx` — guard que redireciona `/lider/*` para `/liderado/inicio` se for liderado puro e vice-versa.
- Páginas novas (todas finas, reaproveitando componentes existentes):
  - `src/pages/lider/Inicio.tsx` (wrapper de `Index`)
  - `src/pages/lider/OneOnOnes.tsx`
  - `src/pages/lider/Diario.tsx`
  - `src/pages/lider/Pulse.tsx` (EmptyState "Em breve")
  - `src/pages/lider/Avaliacoes.tsx` (wrapper para `PerformanceReviewList`)
  - `src/pages/lider/Pessoas.tsx`
  - `src/pages/lider/Configuracoes.tsx`
  - `src/pages/liderado/Inicio.tsx` (Career Compass hero)
  - `src/pages/liderado/Compass.tsx`
  - `src/pages/liderado/OneOnOnes.tsx`
  - `src/pages/liderado/Pulse.tsx`
  - `src/pages/liderado/PDI.tsx`
  - `src/pages/liderado/Avaliacoes.tsx`
  - `src/pages/liderado/MeuRhitmo.tsx`
  - `src/pages/liderado/Configuracoes.tsx`
- Migration: `supabase/migrations/<ts>_chat_threads_extend_types.sql`
  - Drop + recriar CHECK incluindo `'meu_rhitmo'` e `'brief'`
  - `ALTER COLUMN member_id DROP NOT NULL`
  - Adicionar índice parcial para `type='meu_rhitmo'`

### Atualizar
- `src/components/AppSidebar.tsx` — reescrita completa nas 4 zonas, detecção de papel via `useUserRole` + `useLinkedMember`, consumo de `src/lib/navigation.ts`.
- `src/App.tsx` — duas árvores `/lider/*` e `/liderado/*` envolvidas em `RoleRouteGuard`, redirects das rotas legadas, redirect inteligente em `/dashboard`.
- `src/components/DirectReportGuard.tsx` — passa a redirecionar para `/lider/inicio` ou `/liderado/inicio` em vez de `/onboarding` quando aplicável.
- `src/i18n/locales/pt-BR.json`, `en.json`, `es.json` — adicionar namespace `nav` (líder, liderado, cta, threads, ações).

## Layout vertical do novo Sidebar

```text
┌──────────────────────────────┐
│ WorkspaceSwitcher            │ ← sempre visível
├──────────────────────────────┤
│ [Início] [Cal] [Pess] [Chat] │ ← QuickActionsRow
├──────────────────────────────┤
│ Nav primária (5-6 itens)     │
│  • por papel                  │
├──────────────────────────────┤
│ Conversas hoje / privadas    │ ← ThreadsList (oculto se vazio)
├──────────────────────────────┤
│ [CTA IA persistente]         │
│ [Convidar membros] (líder)   │
│ ── Profile + ☀/🌙 toggle ──  │
└──────────────────────────────┘
```

## Mapeamento de rotas legadas → novas

| Legada | Nova (líder) | Nova (liderado) |
|---|---|---|
| `/dashboard` | `/lider/inicio` | `/liderado/inicio` |
| `/dashboard/carreira` | — | `/liderado/compass` |
| `/dashboard/feedbacks` | `/lider/diario` | (inline no inicio) |
| `/dashboard/perfil` | `/lider/configuracoes` | `/liderado/configuracoes` |
| `/analytics` | `/lider/pessoas` (+ aba) | redir `/liderado/inicio` |
| `/billing` | mantida (acessada via configurações) | redir |
| `/brief/:id` | `/lider/1on1s/:id` (mantém também antiga) | — |

Rotas mantidas como estão: `/admin`, `/hr/*`, `/auth`, `/invite`, `/sync/:memberId`, `/review/:id`, páginas legais, `/recorder`, `/slack/connect`.

## Validações finais
- Líder → `/lider/inicio`, vê 5 itens + "Pergunte ao Mentor"
- Liderado → `/liderado/inicio`, vê 6 itens + "Meu Rhitmo · privado"
- HR Admin → sidebar líder + workspace switcher mostra "· RH"
- Liderado tentando `/lider/*` → redirect para `/liderado/inicio`
- Líder tentando `/liderado/*` → redirect para `/lider/inicio`
- Trocar idioma → labels da nav atualizam
- Toggle tema funciona no rodapé
- `aria-current="page"` no item ativo
- Threads aparecem; sem threads → seção oculta
- Mobile: sidebar colapsa em drawer mantendo as 4 zonas

## Riscos / pontos de atenção
- **Quebra temporária**: links espalhados pelo código que apontam para `/dashboard`, `/dashboard/carreira`, `/member/:id`, `/brief/:id` continuarão funcionando via redirect, mas vou rodar `rg "to=\"/dashboard"` etc. e atualizar os mais críticos (sidebar, dashboards, emails) para evitar redirect duplo.
- **Migration `chat_threads`**: tornar `member_id` nullable é mudança não-trivial. Vou pedir confirmação no momento de aplicar a migration. Alternativa: manter NOT NULL e usar o próprio `linked_member.id` do líder para threads de mentor genéricas (já é o padrão atual).
- **Pulse / PDI dedicados**: páginas placeholder na primeira iteração; conteúdo real é trabalho futuro.

Posso prosseguir com a implementação?
