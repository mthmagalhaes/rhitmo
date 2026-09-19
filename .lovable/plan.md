# Telas da Nordvale Logística para o novo vídeo

Objetivo: entregar prints em alta resolução das 5 telas principais, com a empresa fictícia Nordvale Logística populada de forma convincente.

Telas: Início, Pessoas, Anotações & Evidências, Avaliações, Pergunte à Rhitmo.

## 1. Enriquecer os dados fictícios

Hoje a Nordvale tem pouca coisa: 4 pessoas, 5 anotações curtas, 1 avaliação e 2 reuniões. Nas telas isso aparece vazio demais para vídeo. Vou completar:

- Anotações & Evidências: cerca de 18 registros distribuídos entre as 4 pessoas ao longo dos últimos 90 dias, com texto realista de operação logística, origens variadas (reunião gravada, note taker, anotação manual, Slack) e resumo estruturado (TL;DR, decisões, próximos passos) em parte delas.
- Pessoas: cargo, ritmo de 1:1 e datas de último contato diferentes por pessoa, para os indicadores de saúde aparecerem em cores diferentes.
- Início: 3 próximas 1:1s na agenda, pauta já gerada para a primeira e pulso do time com sinal ativo.
- Avaliações: 2 rascunhos de avaliação formal citando evidências datadas, além do ciclo de calibração já existente.
- Pergunte à Rhitmo: 2 conversas salvas com pergunta e resposta completas, ancoradas em evidências reais da base fictícia.

Nada de dado de pessoa real. Todos os registros usam os UUIDs fixos da demo, para apagar tudo de uma vez depois.

## 2. Capturar as telas

Navegação automatizada no ambiente local com o usuário da demo (Camila Duarte), idioma português, janela 1600x1000 e captura em 2x (3200px de largura).

Para cada tela entrego duas versões:
- completa (com o menu lateral)
- corte limpo (sem o menu lateral), melhor para o vídeo

## 3. Entrega

Arquivos PNG em /mnt/documents, nomeados por tela:
`nordvale-inicio.png`, `nordvale-pessoas.png`, `nordvale-anotacoes.png`, `nordvale-avaliacoes.png`, `nordvale-pergunte-rhitmo.png` e as versões `-corte`.

Mostro as imagens aqui no chat para você aprovar antes de gravar.

## Detalhes técnicos

- Dados via SQL nos UUIDs fixos `11110000-...` (workspace, team, membros a001–a004), sem tocar em RLS, preço ou schema.
- Resumos estruturados gravados direto em `structured_summary`/`personal_lens` para não depender de chamadas de IA durante a captura.
- Captura com Playwright em `/tmp/browser/nordvale/`, sessão mintada para o líder da demo; `AccountSetupBento` dispensado pelo botão; agenda marcada como conectada com o stub já usado antes.
- Nenhuma alteração no código do produto.
- A empresa fictícia continua no ar até você aprovar as imagens; depois apago tudo por UUID.
