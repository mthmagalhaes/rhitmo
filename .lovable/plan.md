
Objetivo: parar o desvio “líder -> liderado” após refresh, confirmar que os dados do Matheus continuam intactos, e corrigir a causa estrutural para que isso não volte a acontecer.

Diagnóstico mais provável:
1. Há uma regressão de frontend na resolução de contexto do usuário:
   - `useAuth` não está centralizado em um provider; cada componente/hook cria sua própria restauração de sessão.
   - `useUserRole`, `useLinkedMember`, `AppLayout`, `AppSidebar`, `Index`, `DirectReportGuard` e outros podem resolver estados diferentes em momentos diferentes.
   - Isso explica a tela aparecer como líder por alguns segundos e depois trocar para liderado.
2. Há também uma regressão de backend/permissão:
   - a migração recente de RLS restringiu leitura de `feedbacks` ao líder atual do time (`is_team_leader(...)`), o que pode esconder feedbacks históricos do Matheus mesmo com os 215 registros intactos no banco.
   - isso explica “dados incompletos” sem necessariamente haver perda real.
3. O `AuthEventProvider` ainda executa auto-link por e-mail no `INITIAL_SESSION` / `SIGNED_IN`, o que é arriscado em refresh e pode vincular contas em momentos errados.
4. O modal de workspace pode estar sendo disparado cedo demais, antes de o contexto do usuário estar realmente estabilizado.

Plano de correção organizado:

1. Contenção imediata
- Desativar o auto-link por e-mail disparado automaticamente no refresh/login.
- Manter apenas o fluxo explícito por convite/token.
- Isso evita novos casos de líderes sendo tratados como liderados enquanto investigamos.

2. Verificação de integridade do Matheus
- Confirmar novamente:
  - auth user do `matheus.magalhaes@fstr.co`
  - workspace owner
  - times (5)
  - membros (6)
  - feedbacks totais (215)
- Verificar também:
  - se existe algum `team_members.linked_user_id` apontando para o usuário dele
  - se existe invite pendente/aceito com o e-mail dele
  - se existe registro em `admin_impersonation` afetando `effective_user_id`
- Se houver vínculo incorreto, corrigir o dado antes de validar a UI.

3. Corrigir a arquitetura de sessão/contexto
- Criar um `AuthProvider` real para o app inteiro.
- Fazer `useAuth` consumir esse contexto compartilhado, em vez de reinstanciar a sessão em cada hook/componente.
- Criar um hook único de contexto de conta (ex.: role + linkedMember + workspace + flags de onboarding), para que a UI dependa de uma única fonte de verdade.

4. Corrigir as decisões de UI
- `Index`, `AppSidebar`, `AppLayout` e `DirectReportGuard` devem esperar o contexto consolidado terminar.
- Não renderizar menu de membro, dashboard de liderado ou modal de workspace enquanto o contexto ainda estiver “indeterminado”.
- Remover qualquer fallback silencioso que trate erro/indefinição como `user`.

5. Corrigir visibilidade dos dados históricos
- Revisar a migração recente de RLS que passou a exigir `is_team_leader(...)`.
- Restaurar a regra correta para feedbacks históricos: o criador/manager deve continuar vendo o que ele criou, mesmo que o líder atual do time tenha mudado.
- Preservar a privacidade dos liderados: membro continua vendo só o que foi compartilhado.
- Aplicar a mesma revisão em entidades correlatas se necessário (`performance_reviews`, `meeting_transcripts`, possivelmente `goals`).

6. Endurecer o onboarding/workspace detection
- O modal de workspace só deve abrir para “novo líder sem workspace”, nunca durante estado intermediário.
- Remover fallback genérico de workspace que tenta descobrir contexto por tentativas soltas; passar a depender do contexto consolidado do usuário.

7. Validação final
- Testar com o Matheus:
  - refresh em aba anônima
  - permanece líder do começo ao fim
  - não abre modal de workspace indevido
  - mostra 5 times, 6 membros e 215 feedbacks
- Testar também:
  - líder normal
  - liderado real
  - usuário entrando por convite
- Confirmar que ninguém é auto-vinculado por engano.

Critério de rollback:
- Se a investigação confirmar que o bug é só de frontend, podemos restaurar a última versão estável via History e publicar.
- Se houver regressão de RLS/backend (o que hoje é bem provável), rollback só de frontend não basta, porque mudanças de backend já ficam ativas automaticamente.
- Nesse caso, o rollback seguro é:
  1. restaurar a UI estável via History, se necessário;
  2. criar uma migração corretiva para devolver a regra de acesso correta aos dados históricos.

Arquivos mais prováveis de ajuste:
- `src/hooks/useAuth.ts`
- novo provider de auth/contexto de conta
- `src/hooks/useUserRole.ts`
- `src/hooks/useLinkedMember.ts`
- `src/components/AuthEventProvider.tsx`
- `src/components/AppLayout.tsx`
- `src/components/AppSidebar.tsx`
- `src/components/DirectReportGuard.tsx`
- `src/pages/Index.tsx`
- migração corretiva em `supabase/migrations/`

Detalhes técnicos importantes:
- O problema não parece ser perda de dados; parece combinação de contexto de usuário instável + políticas de acesso mais restritivas do que deveriam.
- O maior risco atual para novos incidentes é o auto-link por e-mail rodando no ciclo de autenticação.
- O maior risco para “dados sumiram” é a política recente que esconde históricos por depender do líder atual do time, em vez do criador do registro.
