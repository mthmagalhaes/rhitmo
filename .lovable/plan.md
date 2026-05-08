## Auditoria dos 5 passos do tour

| Passo | Seletor | Vive em | Risco em viewports atuais |
|---|---|---|---|
| 1 | `[data-sidebar="sidebar"]` | `Sidebar` (ui/sidebar.tsx) | **Quebra em mobile (<md=768px)**: sidebar desktop é `hidden`, sidebar mobile fica dentro de Sheet fechada |
| 2 | `[data-tour="member-list"]` | `MemberMasterList` | **Já corrigido** (aside desktop + trigger mobile) |
| 3 | `[data-tour="context-feed"]` | `Contexto.tsx` | OK — sempre visível |
| 4 | `[data-tour="reviews-list"]` | `Avaliacoes.tsx` | OK — wrapper externo sempre visível |
| 5 | `[data-tour="integrations"]` | `Configuracoes.tsx` (aba Integrações) | OK — `?tab=integracoes` ativa a aba; polling 2.5 s cobre o mount |

## Correções restantes

### Passo 1 — sidebar invisível em mobile
Em `<lg` (1024 px) o sidebar desktop está `hidden md:block` (visível só em ≥md=768). Em telas <768px (e em alguns laptops 13" zoomed), o tour quebraria.

**Fix:** marcar também o `SidebarTrigger` (botão hamburguer no header mobile) com `data-tour="sidebar"` e trocar o seletor do step 1 para uma lista que aceita qualquer um dos dois — o `waitForSelector` já endurecido escolhe o primeiro visível.

- `src/components/ui/sidebar.tsx` (linhas 157 e 206): adicionar `data-tour="sidebar"` nos dois `<div data-sidebar="sidebar">` (desktop + mobile-inside-sheet) — barato e compatível.
- `src/components/AppLayout.tsx` (linha 117): adicionar `data-tour="sidebar"` no `<SidebarTrigger />` para o caso em que o sheet está fechado.
- `src/components/onboarding/LeaderTour.tsx`: trocar o seletor do step 1 de `[data-sidebar="sidebar"]` para `[data-tour="sidebar"]`.
- Como o step 1 é montado direto no `drive()` (sem `hopAndAdvance`), envolver o start em `waitForSelector('[data-tour="sidebar"]')` antes de chamar `d.drive()`. Se nada aparecer, mostrar toast e abortar.

### Passo 5 — defensivo
Como a aba é montada por `PageTabs syncParam="tab"`, o conteúdo pode demorar 1 frame após o sync do query string. O `hopAndAdvance` atual já dá 60 ms + polling 2.5 s, então deve cobrir. Sem alteração, mas o fallback de toast já implementado protege caso falhe.

## Arquivos afetados
- `src/components/ui/sidebar.tsx` (2 atributos)
- `src/components/AppLayout.tsx` (1 atributo)
- `src/components/onboarding/LeaderTour.tsx` (trocar seletor + envolver start em waitForSelector)

## Fora do escopo
- Não alterar copy dos passos.
- Não alterar `useOnboardingTour` nem PageTabs.

## Validação
1. Viewport 1280×720: tour completo dos 5 passos sem desaparecer popover.
2. Viewport 869×829 (atual do usuário): step 2 destaca o botão "Liderados" mobile, demais passos seguem.
3. Viewport 375×812 (mobile): step 1 destaca o `SidebarTrigger`; passo 2 destaca o trigger "Liderados" no header.