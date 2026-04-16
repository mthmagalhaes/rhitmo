

## Plano: Limpeza e correções do Painel Admin

Vou quebrar em 4 ajustes pequenos, todos no mesmo sprint (são todas correções pontuais).

### 1. Deletar workspaces órfãos de liderados
- Confirmados via SQL: `CS` (owner: Guilherme Cunha, pulse, 0 membros) e `Expansão` (owner: Giovanna, pulse, 0 membros) — criados por engano em fluxo de convite
- Migration de DELETE: remover esses 2 workspaces (cascade leva o team "Sem Time" junto)
- Os usuários continuam existindo em `auth.users` e nos `team_members` dos workspaces corretos onde são liderados

### 2. Remover botão "Voltar ao App" do AdminLayout
- Em `src/components/admin/AdminLayout.tsx`, remover o botão "Voltar ao App" (linhas 76-78)
- Mantém apenas "Sair" no rodapé. Coerente com a memória `god's-eye-experience-refinement` — admin é interface separada, navegação para o app deve ser via Impersonation
- Remove import `Home` que ficaria não utilizado

### 3. Consertar Impersonation
**Diagnóstico:** Há um registro ativo na DB (`gabriela.lucas@fstr.co` impersonada por matheus), mas o admin continua na tela `/admin` sem feedback. Problemas:
- `navigate('/')` é chamado, mas se o admin já está em rota `/admin`, alguns layouts podem não remontar o `AccountContext`
- Falta `refetch()` explícito da query de impersonation antes do `navigate`
- Falta toast de confirmação ("Visualizando como X")

**Fix em `src/hooks/useImpersonation.ts`:**
- Após insert: forçar `await refetchQueries({ queryKey: ['admin-impersonation'] })` antes do invalidateQueries global
- Adicionar toast de sucesso/erro
- Trocar `navigate('/')` por `window.location.href = '/'` (hard reload garante que `AccountContext` re-resolva o `effective_user_id` via RLS)
- Mesma lógica em `stopImpersonation`: hard reload para `/admin`

### 4. Consertar aba Inteligência (sem dados)
**Diagnóstico:** Bug no SELECT em `AdminIntelligence.tsx` linhas 31-39 — usa `team_members (id)` E `team_members!inner (id)` duplicados, o que pode estar quebrando o parse do PostgREST e retornando vazio.

**Fix em `src/components/admin/AdminIntelligence.tsx`:**
- Limpar SELECT: usar apenas `teams ( id, team_members ( id ) )`
- Adicionar `console.error` no catch para futura depuração
- Adicionar empty-state ("Sem workspaces ativos para analisar") quando `workspaceHealth` for `[]` em vez de só renderizar tabela vazia
- O loop `for...of` com `await Promise.all` está OK, mas vou adicionar `try/catch` por workspace para não quebrar tudo se um falhar

### Arquivos modificados
- `src/components/admin/AdminLayout.tsx` (remover botão)
- `src/hooks/useImpersonation.ts` (refetch + hard reload + toast)
- `src/components/admin/AdminIntelligence.tsx` (fix SELECT + empty state)
- Migration: DELETE dos 2 workspaces órfãos

### Memory update
- Atualizar `mem://admin/gods-eye-experience-refinement` confirmando remoção do "Voltar ao App"

