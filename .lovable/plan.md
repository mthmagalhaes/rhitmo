Plano de implementação

1. Remover o posicionamento de “Acesso Restrito” do login
- Trocar o título/subtítulo da tela de login de:
  - “Acesso Restrito”
  - “Exclusivo para convidados”
- Para uma mensagem aberta e coerente com produto público, por exemplo:
  - “Entrar no Rhitmo”
  - “Acesse sua conta ou continue com Google”
- Remover do login o bloco “Ainda não tem conta? Entre na Lista de Espera”.
- Manter “Esqueci minha senha” e “Entrar com Google”.

2. Substituir o seletor atual de cadastro
- Alterar a rota `/auth/start`, hoje com:
  - “Sou Líder de time”
  - “Sou Liderado”
- Para:
  - “Sou Líder de time”
  - “Sou RH / People Admin”
- Remover totalmente a opção de “Sou Liderado” desse fluxo público.
- Ajustar textos para deixar claro:
  - Líder começa no plano Pulse, cria workspace e adiciona até 2 liderados.
  - RH Admin começa configurando uma visão de RH limitada, pode criar workspace/adicionar líder no Pulse e precisa fazer upgrade para liberar recursos Enterprise.
- Atualizar o armazenamento de intenção de cadastro de `leader/member` para `leader/hr_admin`.

3. Ajustar fluxo de cadastro e pós-login
- Atualizar `AuthPage` e `Auth` para aceitar a nova persona `hr_admin`.
- “Começar grátis” da landing continua apontando para `/auth/start`, mas agora o usuário escolhe entre Líder e RH Admin, não mais Liderado.
- Cadastro como Líder: continua criando workspace Pulse via onboarding atual.
- Cadastro como RH Admin: criar um onboarding próprio para criar workspace no modo RH Admin.

4. Criar onboarding inicial para RH Admin
- Criar uma variação do onboarding de workspace que permita ao RH Admin informar:
  - nome da empresa/workspace;
  - nome do primeiro time ou área;
  - e-mail do primeiro líder a convidar/adicionar.
- Ao concluir:
  - criar workspace com `plan_tier = pulse`;
  - adicionar o usuário atual em `hr_admin_ids`;
  - criar um time inicial;
  - convidar ou preparar vínculo do primeiro líder, usando a estrutura existente de times/líderes quando possível.
- Redirecionar o RH Admin para `/hr`.

5. Liberar uma “amostra” do Enterprise para RH Admin no Pulse
- Hoje as páginas de RH usam `hasHrDashboard`; no Pulse isso redireciona para Billing.
- Ajustar a experiência para RH Admin Pulse liberar apenas uma funcionalidade de gostinho:
  - liberar `/hr` com uma visão limitada/preview do dashboard de liderança;
  - bloquear `/hr/teams`, `/hr/members` e `/hr/analytics` com CTA de upgrade para Enterprise/Pro conforme naming atual.
- A navegação lateral do RH Admin em Pulse deve mostrar o que está liberado e o que está bloqueado, sem parecer erro.

6. Manter acesso de liderado somente por convite
- O fluxo público não terá “Sou Liderado”.
- O liderado continuará acessando via link de convite (`/invite`) ou por vínculo criado por Líder/RH Admin.
- Se um usuário sem convite tentar entrar e não tiver workspace, manter uma tela explicativa, mas sem convidá-lo a se cadastrar como liderado sozinho.

Detalhes técnicos

Arquivos principais a alterar:
- `src/components/Auth.tsx`
  - trocar textos de login;
  - remover link de lista de espera no login;
  - aceitar persona `hr_admin`.
- `src/pages/AuthPage.tsx`
  - trocar tipo `Persona` para `leader | hr_admin`;
  - persistir intenção correta no OAuth round-trip;
  - redirecionar HR Admin para `/hr` após resolver o workspace.
- `src/pages/PersonaSelector.tsx`
  - substituir card de liderado por card de RH Admin;
  - atualizar labels, descrições e navegação.
- `src/components/AppLayout.tsx`
  - interpretar `signup_persona = hr_admin`;
  - exibir onboarding de workspace RH Admin quando necessário.
- Novo/ajustado componente de onboarding RH Admin
  - reaproveitar o padrão visual Creme/Bento do `WorkspaceOnboarding`.
- `src/hooks/usePlanLimits.ts`, `src/pages/HRDashboard.tsx`, `src/pages/HRTeams.tsx`, `src/pages/HRMembers.tsx`, `src/pages/HRAnalytics.tsx`, `src/components/AppSidebar.tsx`
  - aplicar bloqueios/preview para HR Admin em Pulse.

Possível necessidade de backend
- Se as permissões atuais não permitirem que o próprio RH Admin recém-cadastrado adicione seu ID em `hr_admin_ids` ou convide/crie líderes, será necessária uma migration/RPC segura ou uma backend function específica.
- A regra será: o usuário só pode se tornar HR Admin no workspace que acabou de criar durante onboarding, não em workspaces existentes.
- Não armazenaremos papéis em `profiles` ou metadata como fonte de autorização; o papel efetivo continuará derivado de workspace/times/RLS.