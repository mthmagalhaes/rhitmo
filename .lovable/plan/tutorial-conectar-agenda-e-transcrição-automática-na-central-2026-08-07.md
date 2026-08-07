# Tutorial "Conectar agenda e transcrição automática" na Central de Ajuda

Hoje a Central de Ajuda só diz "Conecte seu Google Calendar em Configurações → Integrações", sem explicar permissões, o que o bot faz, nem o que fazer quando ele não entra. Esse vazio é o que gera dúvidas como as do Caio.

## O que será criado

### 1. Novo artigo na aba Líder: "Conectar sua agenda"
Card dedicado (primeiro da lista de integrações), com passo a passo real:
- Onde clicar: Início → card "Conectar Google Calendar", ou Configurações → Integrações → Google Calendar → Conectar.
- O que o Google vai pedir e por quê (leitura dos eventos da agenda para identificar as 1:1s e o link da reunião).
- Confirmação de sucesso: o card fica verde com o e-mail conectado.
- O que acontece depois: sincronização automática a cada 15 minutos, 1:1s aparecem no card "Próximas 1:1s", brief chega antes da reunião.
- Como desconectar.

### 2. Reescrita do artigo "Transcrição Automática"
Explicando o ciclo completo: ativar o toggle, o bot entra ~2 min antes, aparece como participante "Rhitmo", pode cair em sala de espera e precisa ser admitido, a transcrição vira nota no Diário de cada liderado.

### 3. Bloco de solução de problemas do bot
Novos itens de FAQ ("Dicas & Truques") cobrindo os casos reais de suporte:
- "O bot não entrou na reunião" — checar agenda conectada, toggle ativo, link do Meet no evento, e usar o botão de microfone "Chamar bot agora" no card Próximas 1:1s (funciona mesmo com a reunião já em andamento).
- "O bot ficou na sala de espera" — alguém precisa admitir; o bot espera até 10 minutos.
- "O bot entrou e saiu" — ele sai se o líder não for detectado na sala; entre na reunião ou chame-o de novo.
- "Mudei o horário da reunião" — o Rhitmo reagenda sozinho; se o card mostrar aviso, use "Chamar bot agora".
- "Aparece uma mensagem de erro em vermelho no card" — o que significa e o que fazer.
- "Reunião não aparece na lista" — só entram eventos com link de videochamada e participantes que são liderados cadastrados.

### 4. Atalhos para o artigo
- No card "Conectar Google Calendar" do Account Setup (Início do líder): link discreto "Como funciona" apontando para o artigo.
- No card Google Calendar em Configurações → Integrações: mesmo link.
- Último passo do tour de boas-vindas: menção de que o passo a passo completo está na Ajuda.

## Detalhes técnicos

- Todo o conteúdo é estático em `src/pages/HelpCenter.tsx` (arrays `leaderCards` e `faqItems`) — nenhuma mudança de backend, dados ou lógica de bot.
- Novo card com `id: 'l-calendar'`; a Central já suporta deep-link por hash (`useEffect` sobre `location.hash`), então os atalhos apontam para `/lider/configuracoes?tab=ajuda#l-calendar`.
- Ajustes de link em `src/components/dashboard/AccountSetupBento.tsx` e `src/pages/lider/Configuracoes.tsx` (apresentação apenas).
- Texto em PT-BR, tom Rhitmo, sem em-dashes.
