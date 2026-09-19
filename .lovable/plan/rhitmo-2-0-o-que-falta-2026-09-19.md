# Rhitmo 2.0 — o que falta

## Situação verificada agora

Os cinco itens que restavam no plano de 11/09 foram concluídos:

1. Prazo de guarda que realmente apaga — feito.
2. Valor visível na primeira importação (contagens, notas sem dono, atalho) — feito.
3. Reuniões alimentando o mapa de rede — feito.
4. Texto da página pública nas quatro camadas — feito.
5. Rubrica ancorando a avaliação formal — feito.

Do lado do produto, o 2.0 está entregue. O que falta não é funcionalidade: é uso real.

Números de hoje na base:

- 1 conexão de note taker no total (a sua).
- 4 empresas com pessoas de fato; 20 notas importadas, todas da Faster.
- 0 decisões de calibração registradas e apenas 2 sinais de rede.
- 7 agendas conectadas.

Ou seja: as camadas mais novas (Padrões e Pessoas) existem, mas quase ninguém as exercitou. O gate que o plano mestre definiu — 40% de líderes novos conectando note taker — continua fechado porque ainda não houve líder novo fora da Faster.

## Proposta para esta rodada

### 1. Preparar a casa para o primeiro cliente externo (Caju e afins)
Deixar o caminho do primeiro dia sem atrito: convite, conexão do note taker, primeira nota com dono, primeira pergunta à Rhitmo. Vou percorrer esse caminho ponta a ponta com uma conta nova de verdade e corrigir o que travar.

### 2. Medir adoção sem abrir o banco
Um painel simples na área de administração com os números que decidem o gate: líderes ativos, quantos conectaram note taker, notas importadas por empresa, primeira pergunta à Rhitmo. Hoje isso só existe por consulta manual.

### 3. Fechar as pontas soltas do 2.0
- Calibração nunca foi usada de ponta a ponta: rodar um ciclo completo no ambiente de demonstração e ajustar o que não fizer sentido.
- Limpar a empresa fictícia Nordvale quando você aprovar, para ela não poluir métrica de adoção.

### 4. Depois disso, nada de novo até haver sinal
Nenhum pilar novo entra enquanto o gate não abrir com dado real. Pulse Survey e SSO seguem fora.

## Fora desta rodada

- SSO corporativo: depende dos dados do provedor de identidade de um cliente.
- Depoimentos reais na landing: coleta com você.
- Corte definitivo do v1: só quando o uso justificar.

## Notas técnicas

- Item 1: percurso via Playwright com usuário novo, sem atalhos de super admin; correções esperadas em convite, checklist e primeira sincronização.
- Item 2: nova aba em `/admin` lendo `leader_note_taker_connections`, `feedbacks.source`, `mentor_sessions` e `teams` agregados por workspace. Somente leitura, restrito a super admin. Sem tabela nova, sem mudança de RLS.
- Item 3: ciclo de calibração no workspace de demonstração; ajustes limitados a UI de `/lider/calibracao` e ao card em Avaliações.
- Limpeza da Nordvale: remoção por UUIDs fixos (workspace `11110000-…-0001`), sem tocar em dados reais.
