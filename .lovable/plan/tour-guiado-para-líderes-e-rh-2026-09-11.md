# Tour guiado para Líderes e RH

## Como está hoje (verificado no código)

**Líder** — existe um tour de 4 passos (barra lateral, Anotações & Evidências, Avaliações, Integrações), com visual da marca.
Problemas reais:
- Ele **nunca começa sozinho**. Só roda se a pessoa clicar em "refazer tour" no menu da workspace ou entrar com um endereço especial. O sinal "esta pessoa ainda não fez o tour" é calculado, mas ninguém o usa.
- O roteiro está desatualizado: não fala do note taker (Granola/Fireflies), nem de "Pergunte à Rhitmo", nem de Contexto/Rede, nem de Calibrações.
- Se algum passo não encontra a tela, o tour se encerra com um aviso, mas não retoma depois.

**RH / CHRO** — **não existe tour nenhum**. O RH só recebe o modal de criação da empresa. Depois disso cai no painel sem qualquer explicação de Pessoas, Ritmo, Rede e Governança.

**Checklist de configuração** — existe só na home do líder (note taker, Slack, convites, canais, agenda) e pode ser dispensado. O RH não tem equivalente.

## O que fazer

### 1. Fazer o tour do líder acontecer
- Iniciar automaticamente na primeira visita à home do líder, uma única vez, com um pequeno atraso para a tela terminar de carregar.
- Se a pessoa fechar sem terminar, oferecer de novo na próxima entrada (até 2 tentativas), depois só pelo menu.
- Registrar início, conclusão e abandono para sabermos quantos concluem.

### 2. Atualizar o roteiro do líder (6 passos)
1. Boas-vindas + barra lateral.
2. Conectar o note taker (o passo de maior impacto na adoção) apontando para o card do checklist.
3. Anotações & Evidências: colar transcrição, evidências viram histórico.
4. Pergunte à Rhitmo: perguntar sobre uma pessoa e receber resposta com citação da origem.
5. 1:1s e rascunho de pauta sob demanda.
6. Avaliações e Calibrações a partir das evidências.

### 3. Criar o tour de RH (5 passos)
1. Painel: cobertura e alertas da empresa.
2. Pessoas: quem está com ritmo em dia e quem não está.
3. Ritmo (Visão BP): cadência de 1:1s por líder, sem conteúdo das conversas.
4. Rede: mapa de colaboração, só intensidade.
5. Governança: registro de acessos, prazo de guarda, exportação e exclusão.
   Fecha com um convite a chamar os líderes.

### 4. Checklist de primeiros passos do RH
Card na home do RH espelhando o do líder: convidar líderes, ativar Slack, definir prazo de guarda, ver a Visão BP. Dispensável, some quando tudo estiver feito.

### 5. Retomar o tour quando quiser
Manter "refazer tour" no menu da workspace, agora escolhendo o tour certo conforme o papel (líder ou RH), e adicionar o mesmo atalho na Central de Ajuda.

## Detalhes técnicos

- Extrair a mecânica do `LeaderTour.tsx` (driver.js, `waitForSelector`, navegação entre rotas) para um `useGuidedTour` reutilizável; `LeaderTour` e um novo `HRTour` passam a ser apenas listas de passos.
- Auto-start: consumir o `shouldShowTour` de `useOnboardingTour` no `AppLayout`, hoje ignorado; resolver o papel via `usePersona()`.
- Persistência: nova coluna `hr_tour_completed_at` em `user_preferences` (a de líder já existe), mais `onboarding_tour_attempts` para limitar reofertas. Migração só aditiva, com GRANTs/RLS iguais aos atuais da tabela.
- Novos âncoras `data-tour` em: card de note taker do `AccountSetupBento`, entrada do Mentor na home, `/lider/1on1s`, `/lider/calibracao`, e nas telas de RH (`/hr`, `/hr/pessoas`, `/hr/ritmo`, `/hr/rede`, `/hr/governanca`).
- Se um âncora não aparecer, pular o passo em vez de encerrar o tour inteiro.
- Eventos via `trackFunnel`: `tour_started`, `tour_step_view`, `tour_completed`, `tour_abandoned`, com o papel no payload.
