# Rhitmo 2.0 — o que falta (execução)

## Já feito

- Item 2 concluído: painel "Ativação por empresa" na área de administração (líderes, quantos ligaram conector, liderados, notas do período, notas vindas de conector, líderes que já perguntaram à Rhitmo, última atividade).

## O que executar agora

### 1. Caminho do primeiro dia sem atrito
Percorrer, na prática, o que um líder novo vive: entrar, ver o checklist inicial, ligar o note taker, receber a primeira nota com dono certo e fazer a primeira pergunta à Rhitmo. Cada trava encontrada vira correção na mesma rodada.

Como vou percorrer (escolha sua):
- **A. Navegação automatizada** no ambiente de desenvolvimento, com uma conta sem conector ligado. Não mexe em nada de verdade, mas é o que você recusou da última vez.
- **B. Só leitura de código e dados**, sem abrir o navegador: reviso o checklist, o convite e a primeira sincronização e corrijo o que estiver claramente quebrado.

### 2. Calibração de ponta a ponta
Rodar um ciclo completo de calibração no ambiente de demonstração: abrir a sessão, posicionar os liderados na grade, registrar as decisões e conferir que elas aparecem depois na avaliação formal. Ajustes ficam restritos à tela de Calibração e ao card em Avaliações.

### 3. Limpeza da empresa fictícia
Apagar a Nordvale Logística (workspace de demonstração) para ela não poluir os números de adoção. Feito por identificadores fixos, sem tocar em nenhum dado real. Só executo depois do seu "pode apagar" — e depois da calibração, já que ela é o palco do teste.

## Fora desta rodada

- SSO corporativo, Pulse Survey e qualquer pilar novo: só quando o uso real justificar.
- Depoimentos na landing e corte do v1 seguem em espera.

## Notas técnicas

- Item 1 opção A: Playwright local contra `localhost:8080`, sessão de líder sem `leader_note_taker_connections`; nenhuma alteração de dados.
- Item 2: ciclo em `/lider/calibracao` gravando em `calibration_sessions` e `calibration_decisions`, conferindo a leitura em `generate-formal-review`.
- Item 3: remoção por UUIDs fixos (`11110000-0000-4000-8000-0000000000…`) em ordem de dependência, sem afetar outros workspaces.
