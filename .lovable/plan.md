# Fix: Tour de 60s quebra a partir do passo 2

## Causa raiz
O `LeaderTour.tsx` usa `onHighlightStarted: async () => { navigate(...) }` para mudar de rota entre passos. **Driver.js não espera (`await`) callbacks `onHighlightStarted`**: o popover é posicionado no elemento alvo do passo atual *antes* de a navegação acontecer.

Sequência do bug no passo 2 (clica "Próximo"):
1. Driver imediatamente tenta destacar `main` da página `/lider/inicio` (que ainda está montada).
2. `navigate('/lider/diario')` dispara em paralelo.
3. O `<main>` da Index desmonta, lazy-load do Diário entra, novo `<main>` é outro elemento.
4. Driver fica com referência órfã → overlay/popover desaparecem ou ficam fora de tela. É exatamente o que o screenshot mostra: rota mudou, mas o tour sumiu.

Bônus: usar `'main'` como seletor é frágil. Em `/lider/diario`, `<main>` é a área scrollável inteira (`flex-1 overflow-y-auto`) — destacar isso é genérico e não educa nada.

## Solução
Trocar o paradigma para `onNextClick` (controle manual) + adicionar âncoras `data-tour` reais nos elementos certos.

### 1. `src/components/onboarding/LeaderTour.tsx` — refatorar
- Substituir `onHighlightStarted` por `onNextClick` em cada passo que troca rota. Quando `onNextClick` está definido, driver.js **pausa** até chamarmos `d.moveNext()` manualmente.
- Helper `waitForSelector(selector, timeout=2500)`: faz polling a cada 80ms; quando o elemento aparece (ou timeout), chama `d.moveNext()`.
- Padrão por passo:
  ```ts
  onNextClick: async () => {
    navigate('/lider/diario');
    await waitForSelector('[data-tour="member-list"]');
    d.moveNext();
  }
  ```
- Adicionar `disableActiveInteraction: true` pra não permitir clicks acidentais durante o tour.
- `allowKeyboardControl: true` (ESC fecha, setas navegam).
- Trocar todos os seletores `'main'` por âncoras específicas (abaixo).

### 2. Adicionar âncoras `data-tour` nos elementos certos

| Passo | Página | Âncora | Onde adicionar |
|---|---|---|---|
| 1 | qualquer | `[data-tour="sidebar-nav"]` | `src/components/sidebar/AppSidebar.tsx` (ou root da sidebar do líder) |
| 2 | /lider/diario | `[data-tour="member-list"]` | `src/components/leader/MemberMasterList.tsx` (root) |
| 3 | /lider/contexto | `[data-tour="context-feed"]` | `src/pages/lider/Contexto.tsx` (container da timeline) |
| 4 | /lider/avaliacoes | `[data-tour="reviews-list"]` | `src/pages/lider/Avaliacoes.tsx` (lista/tabela principal) |
| 5 | /lider/configuracoes?tab=integracoes | `[data-tour="integrations"]` | `src/pages/lider/Configuracoes.tsx` (card Slack/Calendar) |

Cada âncora vai num **container significativo e visível** — não no `<main>` inteiro. Isso transforma o tour em algo educativo (destaca *a coisa certa*) e elimina o problema de elementos genéricos.

### 3. Copy revisado pra cada passo (mais útil)

1. **Sidebar** — "Aqui ficam suas áreas: 1:1s, Diário, Pessoas e Avaliações. Tudo organizado em volta dos seus liderados." (mantém)
2. **Diário** — "Cada liderado tem um diário privado seu. Cole transcrições do Meet/Tactiq/Fireflies e a Rhitmo extrai feedback e ações automaticamente."
3. **Contexto** — "Linha do tempo unificada do time: notas, 1:1s, pulses, sinais do Slack. Sua memória organizacional viva."
4. **Avaliações** — "Performance reviews montadas a partir das evidências reais que você capturou ao longo do trimestre. Sem começar do zero."
5. **Integrações** — "Conecte Slack e Google Calendar pra Rhitmo trabalhar em background: briefs antes das 1:1s, sinais ambientes, lembretes nos canais certos."

### 4. Resiliência
- `waitForSelector` faz fallback gracioso: se 2.5s passarem sem o elemento, `moveNext()` mesmo assim. Driver.js renderiza popover centralizado quando o seletor falha — UX degradada mas não quebra.
- Cleanup em `useEffect` continua chamando `destroy()`.

## Out of scope
- Não refazer o design do popover (já está OK no Creme/Bento via `driver-theme.css`).
- Não tocar no `useOnboardingTour` nem na migration — funcionam.
- Não adicionar tour pro liderado (memory `onboarding-demo-visibility` indica tour é só pro líder).

## Validação após implementar
- Iniciar tour pelo botão "✨ Tour de 60s" no `/lider/inicio`.
- Clicar "Próximo" 4x e verificar:
  - Rota muda em cada passo
  - Popover aparece destacando o **elemento certo** (não a página inteira)
  - ESC e X fecham e marcam complete
  - Refazer pelo dropdown da workspace funciona
