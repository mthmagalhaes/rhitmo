
Objetivo imediato: parar o bloqueio do modal, corrigir a recursão de permissões em `workspaces` e fazer o Matheus entrar direto no workspace existente, sem copiar nem apagar dados.

Diagnóstico confirmado
- O print mostra o erro real: `infinite recursion detected in policy for relation "workspaces"`.
- Isso explica por que o sistema acha que “não existe workspace” e abre o onboarding.
- O modal fica impossível de fechar porque `WorkspaceOnboarding` é renderizado com `open={true}` e bloqueia clique fora/escape.
- O problema não é perda de dados; é RLS recursivo + frontend tratando erro como “workspace nulo”.
- Hoje `AppLayout.tsx` e `Index.tsx` engolem erro de `workspaces` (`console.warn` e continuam), então uma falha de permissão vira falsamente “usuário novo”.

Plano de correção emergencial
1. Conter o bloqueio agora
- Em `src/components/AppLayout.tsx`, impedir `WorkspaceOnboarding` quando houver qualquer erro de resolução de `workspace` ou `role`.
- Mostrar loading/erro leve no lugar do modal, nunca onboarding bloqueante.
- Em `src/components/WorkspaceOnboarding.tsx`, remover o comportamento “prisão” para esse caso.

2. Corrigir a recursão no backend
- Criar uma migração corretiva para reescrever as políticas de `workspaces`, `teams` e `team_members`.
- Quebrar o ciclo atual:
  - `workspaces` consulta `teams`
  - `teams` consulta `workspaces`
  - `team_members` consulta `teams/workspaces`
- Substituir esse encadeamento por funções helper `plpgsql SECURITY DEFINER`, evitando nova avaliação recursiva de RLS.
- Em `workspaces`, evitar política que se auto-consulta por função; a checagem de HR Admin deve ser direta no próprio registro quando possível.

3. Parar de transformar erro em “sem workspace”
- Em `src/components/AppLayout.tsx`, `src/pages/Index.tsx`, `src/hooks/useUserRole.ts` e `src/hooks/useLinkedMember.ts`, tratar erro de `workspaces` como erro real.
- Não continuar silenciosamente para `null`.
- Enquanto houver erro de contexto, não abrir onboarding e não degradar o papel para `user`.

4. Unificar a resolução de contexto
- Criar um contexto/hook único de conta com `workspace + role + linkedMember + loading + error`.
- Fazer `AppLayout`, `AppSidebar`, `Index` e guards dependerem dessa mesma fonte.
- Isso elimina o cenário atual de sidebar em modo liderado e dashboard parcialmente em modo líder.

5. Validação final para a reunião
- Login do `matheus.magalhaes@fstr.co` em sessão normal e anônima.
- Confirmar:
  - sem modal de workspace
  - sem toast de recursão
  - sidebar de líder
  - workspace `Faster Ops`
  - 5 times, 6 membros e 215 feedbacks visíveis

Contingência
- Não vou apagar usuários nem mexer nos dados do Matheus agora; isso não corrige essa falha e pode arriscar cascata.
- Rollback só de frontend não basta, porque o erro atual está vindo do backend/RLS.
- Se precisarmos de fallback rápido, o seguro é:
  1. esconder o onboarding para usuários existentes;
  2. aplicar a migração corretiva de RLS;
  3. só depois considerar rollback visual, se necessário.

Arquivos mais prováveis de ajuste
- `src/components/AppLayout.tsx`
- `src/components/WorkspaceOnboarding.tsx`
- `src/pages/Index.tsx`
- `src/components/AppSidebar.tsx`
- `src/hooks/useUserRole.ts`
- `src/hooks/useLinkedMember.ts`
- nova migração em `supabase/migrations/`

Detalhes técnicos
- A causa mais provável é a combinação de:
  - política `Leaders can view workspace` em `workspaces`
  - políticas de `teams`/`team_members` que voltam a consultar `workspaces`
  - frontend que captura esse erro e interpreta como ausência de workspace
- O resultado prático é exatamente o do print: modal indevido + erro de recursão + dashboard vazio/inconsistente.
