# Ajustes de UX — Rhitmo (pausa no plano 2.0)

Seis correções de interface, na ordem de prioridade do brief. O sistema visual (Lora + Inter, creme/lilás, tom de copy, ícones próprios) fica intacto.

## 1. Seta de tendência na ficha do liderado (prioridade alta)

Hoje, no bloco "Última sessão", o campo **Tom** mostra "positivo" com uma seta para baixo — a mesma seta que em outros pontos significa piora.

- Tom deixa de usar seta: vira uma etiqueta colorida (verde = positivo, cinza = neutro, laranja/vermelho = negativo).
- A variação de tom continua aparecendo em "O que mudou", onde a seta faz sentido.
- Cada métrica (tempo de fala, perguntas, palavras por turno) passa a dizer explicitamente se subir é bom, neutro ou apenas uma mudança; nenhuma seta é pintada de verde só por apontar para cima.
- Legenda curta ao passar o mouse explicando o que a seta compara (a sessão contra a média da pessoa).

## 2. Textos cortados nas tabelas (prioridade alta)

Nas páginas Pessoas e Avaliações os nomes e cargos são cortados ("Erika Buono...", "Busi...") mesmo sobrando espaço.

- Colunas passam a ser flexíveis com largura mínima; a coluna de nome cresce e ocupa o espaço vazio.
- Colunas de data e ação ganham largura fixa mínima, para não roubarem espaço do nome.
- Onde ainda faltar espaço, o texto cortado ganha o texto completo ao passar o mouse.
- Conferir em três larguras: ~900px, ~1440px e ~1920px.

## 3. Menu: "Pergunte à Rhitmo" parece sempre selecionado (prioridade média)

- O fundo preenchido passa a indicar apenas a página aberta.
- "Pergunte à Rhitmo" mantém destaque só no ícone (sparkles) mais um contorno sutil; quando essa página estiver aberta, aí sim recebe o fundo de item ativo, como os demais.

## 4. Lista "Liderados" duplicada em Avaliações (prioridade média)

Na listagem, o painel lateral repete as mesmas pessoas da tabela.

- Opção A (recomendada): a lista lateral aparece só quando um liderado está aberto, servindo para pular entre pessoas. Na visão geral, a tabela é a única lista.

## 5. Espera cinza a cada troca de página (prioridade média)

- Ao passar o mouse sobre um item do menu, os dados daquela página já começam a ser buscados (hoje só o código da tela é pré-carregado).
- Dados já vistos na sessão ficam guardados por mais tempo e reaparecem na hora, atualizando em segundo plano.
- Resultado: a segunda visita a qualquer página abre sem tela cinza.

## 6. Botão repetido na tela do ciclo (prioridade baixa)

- Fica só o botão do banner superior "Novo Rhitmo Formal".
- O bloco de baixo "Nenhum Rhitmo Formal ainda" vira texto explicativo, sem botão.

## Detalhes técnicos

- `RelationshipSignalsCard.tsx`: `Metric` de Tom sem `dir`, sentimento como `Badge` semântico; mapa por métrica definindo polaridade da seta.
- `Pessoas.tsx` (grid `28px_2fr_1.5fr_1fr_140px_24px`) e `ReviewsCrossMemberTable.tsx` (`1.4fr_0.9fr_...`): trocar por `minmax(Npx,Xfr)` com nome em `minmax(200px,2.2fr)`; envolver textos truncados em Tooltip.
- `AppSidebar.tsx` / `SidebarFooterCTA.tsx`: remover o gradiente de fundo permanente, manter ícone primário + `ring-1 ring-primary/20`; usar `NavLink` com `activeClassName` padrão.
- `Avaliacoes.tsx`: renderizar `MemberMasterList` apenas quando `selected` existe.
- `routeLoaders.ts` + `AppSidebar` (`prefetchRoute`): adicionar mapa rota → `queryClient.prefetchQuery` das queries principais; subir `staleTime`/`gcTime` no `QueryClient` de `App.tsx` e usar `placeholderData` para evitar skeleton em revisita.
- `ReviewsMemberDetail.tsx`/`PerformanceReviewList`: remover CTA duplicado do estado vazio.

Sem mudanças de banco, permissões ou regras de negócio.
