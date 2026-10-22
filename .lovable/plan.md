# Avaliação guiada: compartilhar bloqueado com aviso, editar na tela bonita e menos espera

## 1. "Compartilhar com Liderado" visível, mas bloqueado até o Rascunho Geral
- O botão continua no rodapé em todas as etapas.
- Antes do Rascunho Geral: aparência apagada (opacidade reduzida, cursor de "não permitido", sem efeito de hover/elevação), com um cadeado pequeno no lugar do ícone.
- Ao lado, um "i" pequeno; ao passar o mouse (ou tocar no celular) aparece: "Conclua as etapas Cultura e Sinais & Rede para chegar ao Rascunho Geral antes de compartilhar com o liderado."
- A partir do Rascunho Geral, o botão volta ao normal (com o aviso do Espelho como hoje). Avaliações livres (freestyle) não mudam.

## 2. Editar na tela bonita
- "Editar texto" passa a abrir o editor com o mesmo visual da leitura (títulos em serifa, parágrafos com respiro, listas, negrito, citações como chips), em vez do formato cru.
- Barra de ferramentas discreta e fixa no topo do editor; ao salvar, as citações de evidência continuam intactas.

## 3. Menos espera entre as etapas
- Ao abrir uma avaliação guiada, a busca de Sinais começa em segundo plano junto com a Cultura; ao clicar em "Avançar para Sinais & Rede" os cartões já estão prontos (ou aparece o "Rhitmo está pensando" na hora, sem tela parada).
- O Rascunho Geral é montado uma única vez, ao avançar de Sinais para o Rascunho (remove a montagem silenciosa duplicada na Cultura).
- Os botões de avançar trocam de etapa imediatamente e mostram o progresso na etapa seguinte, em vez de travar o clique esperando a IA.

## Detalhes técnicos
- `FormalReviewSheet.tsx`: para `isCultureGuided && step < 2`, botão com `aria-disabled`, `opacity-50 cursor-not-allowed`, sem `hover:-translate-y`, `onClick` ignorado; ícone `Info` com `Tooltip` (shadcn) + texto acessível. Editor: `RichTextEditor` recebe classes `prose` iguais às da leitura e o nó de citação como chip; conversão via `markdownToEditorHtml`/`editorHtmlToMarkdown` existentes.
- `CultureGuidedPanel.tsx`: remover auto-assemble (`autoTried`); após `suggest_all`, disparar `signals_init` sem aguardar.
- `SignalsGuidedPanel.tsx`: se já houver cartões, não rebuscar; `advance` muda de aba primeiro e a aba Rascunho mostra `RhitmoThinking` enquanto `assemble` roda.
- Sem mudanças de banco ou permissões. Verificação: typecheck + Playwright no fluxo guiado.
