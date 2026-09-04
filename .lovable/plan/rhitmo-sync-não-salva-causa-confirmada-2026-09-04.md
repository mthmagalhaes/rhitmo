# Rhitmo Sync não salva: causa confirmada

A mensagem vermelha entregou a resposta: `team_members_chronotype_check`.

## Causa raiz (confirmada no banco)

A janela "Atualizar Sync" do painel do liderado grava as escolhas em português (`madrugador`, `comercial`, `noturno`, `direto`, `empatico`, `escrito`, `publico`, `privado`), mas o banco só aceita os códigos em inglês:

- ritmo: `morning`, `commercial`, `night`
- feedback: `direct`, `empathetic`, `written`
- reconhecimento: `public`, `private`

Ou seja: qualquer pessoa que abre essa janela e escolhe uma dessas três opções não consegue salvar. Não é problema de permissão nem de sessão — é opção com código errado. O questionário original do Sync (a tela `/sync/:id`) já usa os códigos certos, por isso só a janela do painel falha.

Os 14 registros que já têm Sync preenchido no banco estão todos com os valores em inglês, então nada precisa ser corrigido nos dados existentes.

## Correção

Trocar, apenas na janela do painel do liderado, os códigos das três listas de escolha para os aceitos pelo banco, mantendo exatamente os mesmos textos visíveis para o usuário.

Também vou fazer a janela reconhecer valores antigos em português ao abrir (caso alguém tenha um valor legado), para a opção já aparecer marcada em vez de vazia.

## Validação

Matheus reabre a janela, escolhe as três opções e salva: deve fechar com confirmação, o card "Rhitmo Sync" passa a mostrar os dados e o líder recebe o aviso de mudança.

## Notas técnicas

- Arquivo: `src/components/dashboard/DirectReportDashboard.tsx`, `SelectItem` das linhas 1173-1175, 1225-1227 e 1237-1239.
- Constraints: `team_members_chronotype_check`, `team_members_feedback_style_check`, `team_members_recognition_style_check`.
- Referência de valores corretos: `src/pages/RhitmoSync.tsx`.
- Nenhuma migração de banco; correção só de frontend. O mapa de rótulos (`CHRONOTYPE_KEYS` etc.) já cobre PT e EN, então a exibição continua igual.
- Ticket de suporte atualizado para `diagnosed` e depois `resolved`.
