
Objetivo imediato: colocar a plataforma utilizável para a reunião sem arriscar apagar os 215 feedbacks, os 5 times ou os 6 membros do Matheus.

Leitura do problema a partir do código e das telas
- O modal aparece quando `AppLayout` conclui `!workspace && !isLinkedMember`.
- Pela tela, a sidebar já carrega, então auth/UI básica estão de pé; o erro está na resolução do “workspace atual”.
- Isso não aponta para perda de dados no banco; aponta para sessão errada, impersonação antiga, conta duplicada ou query de contexto resolvendo o usuário errado.
- Deletar “usuários com nome Matheus” às cegas é perigoso.

Ponto crítico de segurança antes de qualquer deleção
- `workspaces.owner_id` aponta para usuário auth com `ON DELETE CASCADE`.
- `feedbacks.manager_id` aponta para usuário auth com `ON DELETE CASCADE`.
- Ou seja: se apagarmos o usuário errado, podemos apagar junto o workspace e os 215 feedbacks.
- Então: sim, é possível limpar usuários antigos, mas só depois de mapear exatamente quais IDs não possuem dados.

Plano de ação emergencial
1. Congelar deleções cegas
- Não apagar por nome.
- Trabalhar por e-mail + user_id + ownership real.

2. Auditoria rápida dos “Matheus”
- Levantar todos os usuários auth relacionados a:
  - `matheus.magalhaes@fstr.co`
  - `matheus_hr@rhitmo.co`
  - `mth.magalhaes@fstr.co`
  - quaisquer contas antigas com “matheus”
- Para cada uma, verificar:
  - se é owner de workspace
  - se é `manager_id` de feedbacks
  - se lidera times
  - se está em `admin_impersonation`
  - se está ligado em `team_members.linked_user_id`

3. Correção operacional mais segura
- Manter intacto o usuário canônico `matheus.magalhaes@fstr.co`.
- Limpar qualquer registro ativo em `admin_impersonation` que possa estar trocando o contexto.
- Remover/neutralizar vínculos legados de `team_members` que possam fazer a UI tratá-lo como outra persona.
- Só deletar contas antigas que comprovadamente:
  - não possuem workspace
  - não possuem feedbacks
  - não lideram times
  - não são necessárias para demo

4. Hotfix de frontend para parar o modal indevido
- Ajustar `AppLayout` para só abrir `WorkspaceOnboarding` após um estado explícito de “conta totalmente resolvida”.
- Criar um contexto único de conta efetiva:
  - auth pronto
  - user real
  - role resolvida
  - linkedMember resolvido
  - workspace resolvido
- Enquanto isso não terminar, mostrar loading e nunca onboarding.
- Regra final:
  - líder/owner confirmado: nunca mostrar onboarding
  - linked member confirmado: nunca mostrar onboarding
  - onboarding só para usuário novo sem workspace após checagem final

5. Blindagem contra recorrência
- Prioridade de papéis: HR Admin > Líder > Membro vinculado.
- Nunca classificar “user genérico” como liderado.
- Revisar `AppLayout`, `Index`, `AppSidebar` e `DirectReportGuard` para dependerem do mesmo contexto consolidado.

6. Plano de contingência para a reunião
- Se a correção não estiver estável a tempo:
  - rollback do frontend para a última versão visualmente estável
  - sem mexer no banco
  - mantendo os dados intactos do Matheus

Resultado esperado após execução
- `matheus.magalhaes@fstr.co` entra direto como líder
- não vê mais o modal de criar workspace
- volta a enxergar o workspace “Faster Ops”
- dashboard mostra 5 times, 6 membros e 215 feedbacks
- contas antigas de “Matheus” ficam removidas ou neutralizadas com segurança, sem risco de cascata

Detalhes técnicos
- Arquivos mais prováveis de ajuste:
  - `src/components/AppLayout.tsx`
  - `src/pages/Index.tsx`
  - `src/components/AppSidebar.tsx`
  - `src/components/DirectReportGuard.tsx`
  - `src/hooks/useLinkedMember.ts`
  - `src/hooks/useUserRole.ts`
  - novo hook/contexto de “account resolved”
- A limpeza de usuários deve usar auditoria prévia porque o projeto já possui deleção administrativa, mas o schema atual permite cascata em owner/manager.
