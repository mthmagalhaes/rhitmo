# Plan

## Sprint atual: P0–P3 cleanup pós-relatórios Windmill (concluído)

- **P0 — `/lider/contexto` hardening**: `useTeamTimeline` agora loga `error.message` em DEV; estado de erro mostra mensagem técnica em DEV; estado vazio distingue "sem evidências no workspace" vs "filtros sem resultado" com botão "Limpar filtros". Sem mudança em RPC ou RLS.
- **P1 — Pulse↔Contexto**: banner dismissível (localStorage) explicando "Pulse vive aqui dentro" no topo de `/lider/contexto`. Sidebar não tinha entrada Pulse — não foi necessário tocar.
- **P1 — Prompt Gallery**: `MentorChat.tsx` ganhou `leaderPromptGallery` e `directReportPromptGallery` (6 itens cada com emoji+title+desc) renderizados em grid Bento 2-col no estado vazio. Click popula o input via `handleSuggestionClick(p.title)`.
- **P2 — Skeletons**: `PerformanceReviewList` e `MembersGrid` trocaram `<Loader2 spin />` por `<Skeleton>` consistentes com `/lider/contexto`.
- **P2 — Agrupamento por status em Avaliações**: `PerformanceReviewList` derivou 3 grupos (`draft` / `shared` / `acknowledged`) via `<Collapsible>`. `acknowledged` colapsado por default. Adicionou `acknowledged_at` ao select.
- **P3 — Settings grid**: `/lider/configuracoes` aba Perfil agora é grid 2-col fundindo Perfil + Workspace. Aba "Workspace" removida (redundante). `Building2` import limpo.

Sem migrações de banco. Sem mudança em RPC/RLS. Apenas frontend.
