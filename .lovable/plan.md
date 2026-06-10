# Arquivar liderado em /lider/pessoas — diagnóstico + fix

## O que está acontecendo

Reproduzi o caminho do código. **O arquivamento funciona no banco** — o `UPDATE team_members SET archived_at = now()` roda com sucesso (por isso o toast "1 liderado(s) arquivado(s)" aparece). O que está quebrado é o **refresh da lista no front**:

- A query real da tabela de Pessoas usa a key `['team-members-leader-scope', workspaceId, teamIds, includeArchived]` (`src/hooks/useLeaderMembers.ts:85`).
- Mas tanto o `refresh()` em `src/pages/lider/Pessoas.tsx:180` quanto o `MemberAdminSheet` (`src/components/leader/MemberAdminSheet.tsx:146`) invalidam keys antigas/erradas (`['team-members', workspaceId]` e `['leader-members']`).
- Resultado: o React Query nunca refaz a query, a linha do Matheus continua renderizada com o cache antigo, mesmo arquivada. Um F5 faz ela sumir (e ela só reaparece se o toggle "Mostrar arquivados" estiver ligado).

Além disso, **não existe hoje fluxo para excluir** um liderado arquivado — só dá pra arquivar/restaurar. Pra um líder que parou de usar a si mesmo como liderado (como o caso do Mateus se auto-listando), arquivar + esconder é o suficiente, mas faz sentido oferecer "excluir definitivamente" para quem foi adicionado por engano.

## Solução proposta

### 1. Fix do refresh (bug — fazer já)
- `src/pages/lider/Pessoas.tsx` `refresh()`: invalidar por predicado, cobrindo as keys reais:
  ```ts
  qc.invalidateQueries({ predicate: q =>
    ['team-members-leader-scope','workspace-teams-detail','teams','pending-invites']
      .includes(q.queryKey[0] as string)
  });
  ```
- `src/components/leader/MemberAdminSheet.tsx`: trocar `['leader-members']` pela mesma chamada por predicado (cobre `team-members-leader-scope` e `member-sync`).
- Padronizar num helper `invalidateLeaderPeople(qc)` em `src/lib/queryKeys.ts` (novo) para não voltar a quebrar.

### 2. UX do arquivamento (polimento curto)
- Após arquivar, mostrar o toast atual **com action** "Ver arquivados" que liga o toggle `showArchived` — assim o usuário entende para onde o liderado foi.
- Se o usuário arquivou estando com `showArchived = false`, manter a linha sumindo (comportamento esperado). Se estiver com `true`, manter a linha visível com badge "Arquivado".

### 3. Excluir definitivamente (nova ação, só em arquivados)
- No `MemberAdminSheet`, quando `isArchived === true`, abaixo do botão "Restaurar liderado" adicionar um botão destrutivo **"Excluir definitivamente"** com `AlertDialog` de confirmação dupla (digitar o nome do liderado).
- Backend: nova RPC `delete_archived_member(p_member_id uuid)` (SECURITY DEFINER) que:
  1. Confere que `auth.uid()` é leader do time do membro (ou HR Admin / Owner do workspace).
  2. Confere `archived_at IS NOT NULL` e que está arquivado há ≥ 24h (janela de arrependimento) — caso contrário retorna erro amigável "Aguarde 24h após arquivar para excluir".
  3. Faz `DELETE FROM team_members WHERE id = p_member_id`. As FKs em cascata (`feedbacks`, `goals`, `performance_reviews`, `upcoming_meetings`, `context_evidence`, etc.) já têm `ON DELETE CASCADE` — vou auditar na migration e ajustar o que faltar para `SET NULL` em tabelas onde queremos preservar o histórico audit-only (ex.: `mentor_messages.member_id`).
- O `linked_user_id` (conta auth) **não** é tocado — só o vínculo `team_members` é removido. Se o liderado tinha login, ele continua existindo, só deixa de aparecer no time.

## Arquivos tocados

- `src/lib/queryKeys.ts` (novo, helper de invalidação)
- `src/pages/lider/Pessoas.tsx` (refresh + action no toast)
- `src/components/leader/MemberAdminSheet.tsx` (refresh + botão "Excluir definitivamente" + AlertDialog)
- `supabase/migrations/<novo>.sql` (RPC `delete_archived_member` + auditoria de FKs)

## Riscos
- Excluir definitivamente é irreversível. Mitigamos com: só em arquivados, janela de 24h, confirmação por digitação do nome.
- Auditar cada FK antes de assumir CASCADE — se alguma referência crítica não tiver, a migration ajusta para `ON DELETE SET NULL` (manter linha de auditoria) ou bloqueia exclusão com mensagem clara.

## Validação
- Arquivar o Mateus em /lider/pessoas → linha some imediatamente, sem F5.
- Toggle "Mostrar arquivados" → linha reaparece com badge "Arquivado".
- Abrir sheet do Mateus arquivado → ver "Excluir definitivamente" desabilitado por 24h, depois habilitado.
- Após excluir → linha some das duas visões; conta `mateus.magalhaes@fpstr.co` continua existindo no auth.
