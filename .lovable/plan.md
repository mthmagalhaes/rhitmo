# Avaliação formal: abrir o painel certo + "Rhitmo está pensando" em toda a plataforma

Vale para todas as empresas e líderes, sem nada específico da Faster.

## 1. Abrir sempre o painel completo de revisão
- Em Avaliações (`/lider/avaliacoes`), clicar numa avaliação formal do líder abre o painel completo (com os cartões da cultura, régua, Aceitar/Editar/Montar documento), não mais o modal antigo só de leitura.
- O modal antigo continua para quem só lê (avaliações mensais, autoavaliação, ascendente, pares e a visão do liderado).
- Ao criar uma "Nova formal" em Avaliações, o painel abre na hora (hoje só a ficha do liderado faz isso).
- Avaliações já criadas (como a da Laís) passam a mostrar os cartões já preenchidos assim que abertas.

## 2. Estado "Rhitmo está pensando"
Um componente reutilizável, discreto e com movimento, com etapas que avançam:
- "Buscando anotações e 1:1s de {nome}..."
- "Lendo os valores e a régua da empresa..."
- "Escrevendo as sugestões..."
Com "pode sair desta tela, a Rhitmo continua trabalhando". Respeita movimento reduzido.

Aplicado primeiro em:
- Criação de avaliação formal (rascunho completo e guiado pela cultura) e cartões de cultura chegando.
- Regenerar cartão, Montar documento, Espelho de coerência.
- Análise de materiais de cultura no RH.
- Outros botões de IA que levam segundos (resumo mensal, pauta/brief, sincronizar notas), trocando spinners soltos pelo mesmo componente.

## 3. Segundo plano e erros
- Se o líder sair da tela, ao terminar aparece um aviso "Avaliação de {nome} pronta" com botão para abrir.
- Se der erro ou passar do tempo (ex.: cartões sem sugestão após ~90s), o painel explica o motivo em português e oferece "Tentar novamente", em vez de girar para sempre.

## Detalhes técnicos
- `PerformanceReviewList.tsx`: para `review_type` formal e usuário dono, abrir `FormalReviewSheet`; demais casos mantêm `ReviewViewDialog`.
- `Avaliacoes.tsx` / `ReviewsMemberDetail.tsx`: `onReviewCreated(reviewId)` abre `FormalReviewSheet` (mesmo padrão de `MemberDetails.tsx`).
- Novo `src/components/ai/RhitmoThinking.tsx` (etapas por tempo, framer-motion, `useReducedMotion`) + hook `useBackgroundJob` com toast global ao concluir/falhar.
- `CultureGuidedPanel`: timeout de polling → estado de erro com reexecução de `suggest_all` só nos itens pendentes.
- Sem mudanças de banco, permissões ou regras de visibilidade.
