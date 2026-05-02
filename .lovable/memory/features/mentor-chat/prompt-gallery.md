---
name: Mentor Chat Prompt Gallery
description: Estado vazio do MentorChat (líder e liderado) renderiza Bento grid 2-col com 6 PromptGalleryItem (emoji, title, description) que populam o input via handleSuggestionClick(p.title); chip-row no input continua usando leaderSuggestions/directReportSuggestions text-only
type: feature
---
Combate "blank page anxiety" (insight Windmill). Quando `(showEmptyState || showNewThreadState) && !isLoadingMessages`, renderiza grid `grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl` de cards `rounded-2xl border-border/60 bg-card` com hover lift. Templates do líder: Resumir o último mês, Pauta para próxima 1:1, Padrões de feedback, Quem está em risco, Contradições no Mirror, Ações pendentes. Templates do liderado: pedido de promoção, processar feedback difícil, pontos cegos, acelerar dev, próxima 1:1, próximos 90 dias. Click chama `handleSuggestionClick(p.title)` que reusa o pipeline existente de envio.
