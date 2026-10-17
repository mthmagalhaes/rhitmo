# Avaliações: fluxo do líder direto ao ponto

## Objetivo
Deixar óbvio onde o líder cria a avaliação formal, tirar ruído (calibração e competências legadas) e fazer a abertura do liderado ter movimento e contexto de onde ele veio.

## 1. Botão de avaliação formal visível na tabela
- Na tabela de Avaliações, a coluna "Próxima ação" passa a ter um botão de verdade em cada linha: **"Nova avaliação formal"** (principal). "Gerar Mensal" vira ação secundária, mais discreta.
- O botão abre direto a janela "Nova avaliação formal" sem precisar entrar na tela do liderado.
- Filtro padrão continua "Sem Formal 6m+".
- Na tela do liderado, o botão do topo ganha o nome claro "Nova avaliação formal" (hoje "Novo Rhitmo Formal").

## 2. Tirar a calibração da página de Avaliações
- Remover o cartão de Calibração do topo de Avaliações. Calibração continua no próprio item do menu lateral.
- Textos do topo da página simplificados ("Avaliações do time" + uma linha de explicação).

## 3. Competências vs. Cultura
- Na criação da avaliação formal, remover a seleção legada de competências/templates de competência. A avaliação passa a ter dois eixos: **Entregas** (sempre) + **Cultura e régua** (quando o RH publicou).
- Avaliações antigas que usaram competências continuam abrindo e exibindo normalmente; nada é apagado.
- A IA da avaliação deixa de pedir/considerar a lista de competências quando não houver; segue usando cultura publicada.

## 4. Abertura "deslizante" do liderado (extra)
- Ao clicar numa linha, a tela do liderado entra deslizando da direita com leve fade; a lista lateral de liderados entra junto, deslizando da esquerda.
- O avatar e o nome do liderado fazem uma transição suave da linha clicada para o cabeçalho, deixando claro de onde se veio.
- Voltar (botão, breadcrumb ou Esc) faz o movimento inverso e retorna à mesma posição de rolagem da tabela.
- Trocar de liderado na lista lateral faz uma transição curta de conteúdo (sem recarregar a tela toda).
- Respeita "reduzir movimento" do sistema (sem animação nesses casos).

## Fora do escopo
- Calibração em si (continua igual na sua página).
- Mudanças em permissões ou dados.

## Detalhes técnicos
- `ReviewsCrossMemberTable.tsx`: CTA `Button` por linha chamando `onCreateFormal(m)` com `stopPropagation`; Mensal como `variant="ghost"`.
- `Avaliacoes.tsx`: remover `CalibrationEntryCard` e ajustar hero; animação com `framer-motion` (já instalado ou adicionar) via `AnimatePresence` + `motion.div` (slide x + opacity), `layoutId` em avatar/nome compartilhado entre linha e cabeçalho do `ReviewsMemberDetail`; preservar `scrollTop` da tabela em ref; `useReducedMotion`.
- `FormalReviewHero.tsx`: rótulo do CTA.
- `CreateFormalReviewDialog.tsx` / `generate-formal-review`: localizar e remover UI de competências; backend aceita ausência sem erro (compatível com reviews antigas).
- Verificação: typecheck, build e navegação via Playwright (abrir liderado, voltar, criar formal pela tabela).
