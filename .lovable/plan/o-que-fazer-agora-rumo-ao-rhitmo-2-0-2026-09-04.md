# O que fazer agora rumo ao Rhitmo 2.0

## O dado de hoje (medido no banco, não estimado)

- 9 workspaces no total, 3 em v2 (Faster, Fapeduca, FAP) — os mesmos três de sempre.
- **Nenhum workspace novo criado nos últimos 30 dias.**
- **1 única conexão de note taker em toda a base.**

Conclusão direta: o gate do plano mestre continua fechado, e não por pouco. Nenhum pilar gated (Auto Draft, Calibrações, ONA passivo, Pulse Survey) entra em execução agora.

## Sobre o diagrama enviado

O desenho é uma boa foto do destino, mas duas caixas contradizem decisões já registradas:

- **Github e Linear**: o ICP é genérico, todos os setores. Entrar com conectores tech-first estreita o produto para um público que não é o alvo. Fora da fila.
- **ONA e Pulse Surveys**: são pilares gated. Ficam no diagrama como destino, não como trabalho de agora.

O resto do diagrama (Slack, Teams, transcrições, áudios, anotações entrando; feedback contínuo, avaliação, coach e analytics saindo) já descreve o que existe ou o que é caminho natural.

## O trabalho de agora: tirar atrito do primeiro uso

O gargalo é validação externa. Então tudo que fizermos agora deve servir a um objetivo só: **um líder de fora conectar a ferramenta dele nos primeiros minutos, sem ajuda**.

### 1. Conectar note taker vira passo do primeiro acesso
Hoje o checklist inicial do líder pede Slack e Google Calendar, e não menciona Granola nem Fireflies. A tela de conectores existe, mas só é achada por quem procura. Adicionar "Conectar seu note taker" como primeiro item do checklist, acima de Slack, com atalho direto para a conexão.

### 2. Medir o sinal de adoção de verdade
O critério que destrava tudo (40% de líderes novos conectando um note taker) não tem onde ser lido. Criar um painel simples na área de administração: líderes novos no período, quantos conectaram, percentual, e a lista de quem conectou. Sem isso, a decisão de abrir o gate continuará sendo palpite.

### 3. Decidir o Otter de uma vez
O Otter não tem interface pública documentada para leitura de notas, então "implementar o conector" não é uma tarefa real. Encerrar o gap: assumir publicamente que o caminho para Otter é colar a transcrição (Magic Paste), e deixar isso explícito na tela de conectores e no FAQ da página pública. Deixa de ser pendência.

### 4. Primeira nota importada com valor visível
Depois da primeira sincronização, o líder deve ver imediatamente o que ganhou: quantas notas entraram, ligadas a quem, e um atalho para perguntar à Rhitmo sobre aquela pessoa. Hoje ele recebe um aviso e precisa navegar até achar o resultado.

### 5. Texto da página pública nas quatro camadas
Reescrever o posicionamento em torno de pessoas, evidências, padrões e percepções. Baixa prioridade, só de texto, mas é o que faz um CHRO entender em 10 segundos por que isso não é mais um app de notas.

## O que remover

- Nada de produto. A rodada de enxugamento já aconteceu e cortar mais agora atrapalha a demonstração para os primeiros externos.
- Remover apenas a pendência conceitual do Otter (item 3), que hoje aparece no plano mestre como lacuna aberta sem ser tarefa executável.

## Ordem sugerida

1 e 3 na mesma leva (é o que muda a experiência do primeiro acesso), depois 2, depois 4, e 5 quando sobrar fôlego.

## Detalhes técnicos

- Item 1: novo passo em `AccountSetupBento`, consultando `leader_note_taker_connections` do usuário; destino `/lider/configuracoes` (card de note taker) ou `/v2/conectores` conforme `ui_version`.
- Item 2: consulta agregando `teams.leader_user_id` criados no período contra `leader_note_taker_connections.user_id`, exposta como card numa aba da área admin. Sem tabela nova.
- Item 3: texto em `src/lib/noteTakerProviders.ts` (nota sobre Otter), rodapé de `src/pages/v2/Conectores.tsx` e FAQ da landing (pt/en).
- Item 4: após `action: 'sync'`, redirecionar para Anotações & Evidências filtrado pela origem do conector, com resumo do que entrou.
- Nenhuma migração de banco necessária em nenhum dos itens.

## Fora de escopo, explicitamente

Auto Draft, Calibrações, ONA passivo, Pulse Survey, Github, Linear, MCP/agentes. Todos aguardam o sinal de adoção — que hoje é 1 conexão na base inteira.
