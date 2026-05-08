## Diagnóstico

A caixinha desaparece porque o `LeaderTour` está montado dentro da página `/lider/inicio` (`Index.tsx`). Quando o usuário clica em “Próximo” no passo 1, o tour navega para `/lider/diario`; com isso a página inicial desmonta, o componente `LeaderTour` desmonta junto e o `driver.js` é destruído antes de conseguir mostrar o passo 2.

## Plano de correção

1. **Subir o `LeaderTour` para um nível persistente**
   - Remover o controle do tour de `src/pages/Index.tsx`.
   - Montar o tour dentro de `src/components/AppLayout.tsx`, que continua vivo enquanto o usuário navega entre `/lider/inicio`, `/lider/diario`, `/lider/contexto`, `/lider/avaliacoes` e `/lider/configuracoes`.

2. **Preservar as formas de iniciar/reiniciar o tour**
   - Manter o start automático para líderes novos via `useOnboardingTour()`.
   - Manter o replay pelo menu da workspace via evento `rhitmo:start-tour`.
   - Manter o deep-link `?startTour=1`, mas tratar isso no `AppLayout` para funcionar em qualquer página de líder.

3. **Corrigir navegação entre passos sem desmontagem**
   - O `LeaderTour` continuará fazendo `navigate('/lider/diario')`, `navigate('/lider/contexto')`, etc.
   - Como ele estará no `AppLayout`, a caixinha não some durante a troca de rota.
   - O `waitForSelector` já existente continuará aguardando o elemento visível antes de avançar.

4. **Ajustar callbacks de fechamento**
   - Ao encerrar ou abortar o tour, fechar apenas o estado local do `AppLayout`.
   - Só marcar como completo quando o usuário realmente encerra o tour, preservando o comportamento atual.

5. **Validação depois da implementação**
   - Conferir fluxo completo dos 5 passos no viewport atual de 869×829.
   - Conferir que o passo 2 ancora em `Liderados` e que os passos 3, 4 e 5 aparecem após as navegações.
   - Conferir que o replay pelo menu continua iniciando o tour.