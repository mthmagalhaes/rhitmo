# Liberar gestão de times para RH Admin e Owner (caso Guto / Faster)

## O que muda para o usuário
- Quem é **RH Admin ou dono da empresa** volta a ver a aba **Times** em Pessoas, mesmo sem liderar nenhum time.
- Nela é possível: criar time, escolher ou trocar o líder, editar nome e mover liderados entre times.
- A mesma aba aparece na visão de RH (Pessoas do RH), para o Guto achar por qualquer um dos dois caminhos.
- Líderes comuns continuam vendo só o próprio time (nada muda para eles).

## Passos
1. **Pessoas do líder**: reativar a aba Times quando o usuário for RH Admin ou Owner, listando todos os times da empresa (não só os que ele lidera), com botão "Novo time" e edição.
2. **Pessoas do RH**: adicionar a aba Times reaproveitando a mesma lista, o modal de novo time (com escolha de líder) e o modal de edição.
3. **Permissões no banco**: conferir que RH Admin/Owner conseguem criar e editar times e mover liderados da própria empresa; se alguma regra bloquear, ajustar só para esses dois papéis, sem abrir conteúdo de anotações/1:1s.
4. **Teste**: entrar como o Guto (visualização de administrador), criar um time de teste, atribuir líder, mover um liderado e apagar o time de teste.

## Detalhes técnicos
- Arquivos: `src/pages/lider/Pessoas.tsx`, `src/pages/HRPessoas.tsx`, `src/components/NewTeamDialog.tsx`, `src/components/EditTeamDialog.tsx`, `src/components/teams/LeaderPicker.tsx`.
- Flag `canManageTeams = isHRAdmin || isWorkspaceOwner` (de `useAccount`); query de times por `workspace_id` em vez de `leader_user_id` quando a flag estiver ativa.
- RLS em `teams`/`team_members`: validar policies de INSERT/UPDATE para HR Admin/Owner do workspace; migration só se necessário, mantendo isolamento por workspace e sem acesso a `feedbacks`/`meeting_transcripts`.

## Resposta sugerida ao Guto
"Não saiu não! Ficou escondido numa mudança nossa. Já liberei: em Pessoas tem a aba Times de novo, onde você cria times, define o líder e move as pessoas."
