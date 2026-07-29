# Deixar o Rhitmo mais leve e fluido

Fiz uma auditoria completa (build real + varredura de imports). O diagnóstico principal: **o bundle inicial tem 3 MB (880 KB gzip)** e carrega bibliotecas pesadas que quase ninguém usa no primeiro paint. Além disso, há código morto e polling redundante rodando em toda navegação.

## Fase 1 — Tirar peso do carregamento inicial (maior ganho)

O `AppLayout` é eager e importa `LeaderTour` estaticamente, que puxa `driver.js`. Pelo mesmo efeito cascata, `pdfjs-dist`, `mammoth` e todo o `@tiptap`/ProseMirror acabam no chunk principal.

- `LeaderTour` (e `driver.js`) → carregamento sob demanda, só quando o tour inicia.
- `src/lib/fileParser.ts` → `import()` dinâmico de `pdfjs-dist` e `mammoth` dentro das funções de parse (só roda em upload de documento).
- `src/components/ui/rich-text-editor.tsx` → virar componente lazy, com um placeholder simples enquanto carrega. Consumidores: NewNoteDialog, FormalReviewSheet, DiaryFeedItem, NewGoalDialog, ReviewViewDialog, FeedbackTimeline — todos dentro de diálogos/telas secundárias.
- Rodar o build antes e depois para medir o ganho real.

Expectativa: várias centenas de KB fora do caminho crítico, primeiro carregamento e trocas de rota visivelmente mais rápidos.

## Fase 2 — Remover código morto (risco zero)

Nenhum destes tem importadores:

- `src/components/NewReviewDialog.tsx` (486 linhas, já marcado como obsoleto)
- `src/components/leader/avaliacoes/ReviewsMemberSheet.tsx` (130 linhas, substituído pelo ReviewsMemberDetail)
- `src/data/mockData.ts` (105 linhas, não usado em produção)
- 14 componentes shadcn nunca usados: AINativeBadge, aspect-ratio, breadcrumb, carousel, context-menu, drawer, hover-card, input-otp, menubar, navigation-menu, pagination, resizable, slider, toggle-group
- As dependências npm que só existiam para esses componentes (~10 pacotes Radix + embla-carousel + input-otp + react-resizable-panels)

Isso não muda runtime (o tree-shaking já os cortava), mas reduz superfície de manutenção e tempo de instalação/CI.

## Fase 3 — Reduzir requisições em segundo plano

Hoje, em **toda** rota autenticada, rodam simultaneamente:

- `ActivityBadge` — refetch a cada 60s, e está montado duas vezes (versão mobile + desktop no AppLayout)
- `ActivityPreview` — 30s
- `useEvidence` — 60s
- `useCalendarIntegration` — 10 min (aceitável)

Ações: montar o ActivityBadge uma única vez, subir os intervalos para 2–3 min e trocar polling constante por revalidação ao focar a janela. Menos ruído de rede durante a navegação.

## Fase 4 — Opcional (avaliar depois)

- **i18n**: os 3 idiomas (~2.700 linhas de JSON) entram inteiros no bundle inicial, mesmo para usuários PT-BR. Dá para carregar o locale sob demanda — ganho bom, mas exige mudar o setup do i18next. Só faz sentido se en/es tiverem uso real.
- **Assets de campanha**: `src/assets/google-ads/` tem 4 arquivos somando ~4 MB que não parecem usados na UI. Confirmo o não-uso e movo para fora do repositório.
- **Landing.tsx** (1.497 linhas, eager por ser rota de entrada): seções abaixo da dobra poderiam ser lazy dentro da própria página.

## Notas técnicas

- `recharts` já está corretamente isolado em chunk próprio (369 KB) e só carrega no Analytics — sem ação.
- `lamejs` já é dinâmico no RecorderPopup — sem ação.
- Não há subscriptions realtime abertas, então não há custo de websocket permanente.
- As rotas do `App.tsx` já são majoritariamente lazy; só Landing/Index/Auth/NotFound são eager, o que é intencional.

## Sugestão de execução

Fases 1 a 3 numa tacada só (é onde está o ganho real e o risco é baixo), medindo o bundle antes e depois. A Fase 4 fica para uma segunda rodada, depois de você confirmar o uso de en/es e dos criativos de anúncio.
