# Esconder Pulse e Contexto do líder

Hoje o item **Pulse** ainda aparece no sidebar do líder e existem alguns atalhos para `/lider/contexto` espalhados pela UI. O objetivo é remover qualquer ponto de entrada visível, mantendo as rotas vivas só para deep-links de auditoria já existentes (Brief 1:1, EvidenceDrawer).

## Mudanças

1. **`src/lib/navigation.ts`**
   - Comentar o item `pulse` em `LEADER_NAV_ITEMS` (mesmo padrão já usado para `contexto`), com TODO explicando que volta quando a feature for reaberta.

2. **`src/pages/lider/OneOnOnes.tsx`** (linha 82)
   - Remover o botão/atalho que navega para `/lider/contexto?member=...` (ou esconder atrás do mesmo flag de "feature pausada"). É o único link visível para Contexto na UI do líder fora do nav.

3. **`src/components/onboarding/LeaderTour.tsx`** (linha 128)
   - Remover o passo do tour que pula para `/lider/contexto` e ajusta o seletor `[data-tour="context-feed"]`, para o tour não quebrar nem reabrir a página escondida.

4. **Rotas em `src/App.tsx`**
   - Manter `/lider/pulse`, `/lider/pulse/:id` e `/lider/contexto` registradas (deep-links de Brief/Evidence ainda apontam para lá). Sem mudança aqui.

## Não faz parte deste plano

- Não mexer em nada do liderado (`PendingPulseAlert`, `/liderado/pulse`, modais de resposta continuam funcionando).
- Não remover páginas, hooks (`usePulses`, `useTeamTimeline`) nem edge functions — só esconder pontos de entrada.
- Sem mudanças em backend, RLS ou dados.
