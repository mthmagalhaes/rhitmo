## Reestruturar a Home do líder

Reorganizar `src/pages/Index.tsx` (rota `/lider/inicio`) para seguir a referência da Windmill, com 3 seções claras nesta ordem exata:

```text
1. Account Setup           ← novo bloco bento (4 cards de conexão)
2. Próximas 1:1s           ← já existe, sobe na hierarquia
3. Histórico do Mentor     ← novo bloco (lista das últimas threads do líder)
```

Todo o resto (Mirror Insight, Seu Time, Empty States) sai da Home — esses já têm casa natural em `/lider/contexto` (Mirror), `/lider/pessoas` e nas páginas master-detail (`/lider/1on1s`, `/lider/diario`, `/lider/objetivos`). A Home volta a ser o que a referência sugere: **um cockpit enxuto de início de dia**.

## Estrutura visual (referência Windmill)

- Header da página com saudação curta ("Bom dia, Matheus") + chips de stats simples (já existe; mantém).
- `max-w-5xl` mantido. Padding consistente. Sem horizontal scroll.
- Cada seção com label uppercase tracking-wide pequeno + conteúdo em cards `rounded-2xl` com sombra suave (Creme/Bento DNA).

## Seção 1 — Account Setup (novo)

Novo componente `src/components/dashboard/AccountSetupBento.tsx`. Bento Grid de **4 cards** lado a lado (responsivo: 4 col desktop, 2 col tablet, 1 col mobile). Cada card mostra ícone, título, descrição curta e um CTA (ou check verde quando concluído).

| Card | Estado "pendente" | Estado "concluído" | Fonte de verdade |
|---|---|---|---|
| **Conectar Slack** | CTA "Conectar" → chama `connectSlack()` do `useSlackConnection` | Badge "Conectado" + email/workspace | `useSlackConnection().isConnected` |
| **Convidar liderados** | CTA "Convidar" → abre `NewMemberDialog` | "X liderados ativos" | `teamMembers.length > 0` |
| **Adicionar canais Slack** | CTA "Adicionar canais" → navega para `/slack-channels` | "X canais conectados" | `useSlackChannels()` count |
| **Conectar Google Calendar** | CTA "Conectar" → fluxo OAuth existente | Badge "Conectado" + email da agenda | `useCalendarIntegration().isConnected` |

Comportamento:
- Bloco inteiro ganha botão **"Dispensar"** discreto no canto (igual à referência da Windmill). Persistir em `localStorage` por workspace (`rhitmo:home:account-setup-dismissed:{workspaceId}`).
- Se todos os 4 estiverem concluídos, esconder automaticamente (sem precisar dispensar).

## Seção 2 — Próximas 1:1s

Manter o `CalendarCardBoundary` que já existe (engloba `UpcomingMeetingsCard`). Apenas:
- Promover label da seção: "PRÓXIMAS 1:1s".
- Remover `PendingTranscriptsCard` daqui (move para `/lider/1on1s` como filtro/aba — já há lugar natural).

## Seção 3 — Histórico do Mentor (novo)

Novo componente `src/components/dashboard/MentorHistoryCard.tsx`. Reaproveita a query do `ThreadsList` (mesma `chat_threads` com `type in ('mentor','brief')`), mas com layout de card grande:
- Lista as últimas **8 threads** do líder, ordenadas por `updated_at`.
- Cada item: ícone + título da thread + tempo relativo ("há 2h"). Click → `/chat/{id}`.
- Empty state: ilustração leve + CTA "Pergunte ao Mentor" abrindo o `MentorChat` (mesma trigger do `SidebarFooterCTA`).
- Header da seção com link "Ver tudo" que abre uma view de histórico completa (reaproveita rota existente do mentor; sem rota nova nesta sprint — link aponta para a primeira thread ou abre o painel).

## O que sai da Home (e onde vai)

| Componente | Destino |
|---|---|
| `MirrorInsightCard` | Move para `/lider/contexto` (topo). Já é o lugar natural — Contexto é onde o líder analisa padrões. |
| `SetupChecklist` (atual, 6 itens) | **Removido**. Substituído pelo Account Setup mais focado (4 cards de integração). Os itens "criar nota / mentor / sync" eram task list de onboarding antigo — Account Setup cobre o que importa hoje. |
| `TeamTabs` + grid "Seu Time" | **Removido da Home**. Vive em `/lider/pessoas` (já é a página dedicada). A Home não é mais um diretório de pessoas. |
| Empty state com vídeo demo do YouTube | **Removido da Home**. Vai para `/lider/pessoas` quando workspace não tem membros. |
| `PendingTranscriptsCard` | Move para `/lider/1on1s` como banner contextual. |

## Mudanças técnicas

### Arquivos novos
- `src/components/dashboard/AccountSetupBento.tsx` — bento grid 4 cards, lê `useSlackConnection`, `useCalendarIntegration`, `useSlackChannels`, `teamMembers.length`. Recebe handlers `onOpenInvite`, `onOpenSlackChannels`, e usa hooks internos para Slack/Calendar OAuth.
- `src/components/dashboard/MentorHistoryCard.tsx` — query `chat_threads` (limit 8), navega para `/chat/{id}`, callback `onOpenMentor`.

### Arquivos editados
- `src/pages/Index.tsx`: refatorar JSX do `<main>` para conter apenas as 3 seções na ordem nova. Remover imports e lógica de `MirrorInsightCard`, `TeamTabs`, `SetupChecklist`, grid de membros, `PendingTranscriptsCard`. Limpar queries de `teams`/`teamMembers` que não são mais usadas (manter só o que `AccountSetupBento` precisa: contagem de membros).
- `src/pages/lider/Pessoas.tsx`: receber o grid `TeamMemberCard` + `TeamTabs` + empty state com vídeo demo (mover do Index).
- `src/pages/lider/Contexto.tsx`: receber o `MirrorInsightCard` no topo.
- `src/pages/lider/OneOnOnes.tsx`: receber o `PendingTranscriptsCard` como banner.

### Memória
- Atualizar `mem://design/dashboard/layout-v2-refinement` (ou criar `mem://design/dashboard/home-v3-windmill`) descrevendo a nova hierarquia em 3 seções e a regra "Home não duplica conteúdo de páginas dedicadas".

## Resultado esperado

Home enxuta, alinhada à referência Windmill: o líder abre o app e vê **o que precisa fazer agora** (setup), **o que vem na agenda** (1:1s) e **onde retomar a reflexão** (histórico do mentor). Tudo o que é exploração de pessoas, contexto ou avaliações vive nas páginas dedicadas.
