## Decisão

Workspace = 1 owner (líder máximo). Times existem **abaixo dele** apenas como agrupamento organizacional dos liderados. Não há (e não deve haver) "líder de time" como papel — isso seria org chart com líder→líder, que pertence ao escopo futuro de **RH Admin** (a discutir depois).

A coluna `teams.leader_user_id` continua **existindo no banco** (ainda é usada por `useUserRole`, `is_team_leader()` em ~20 RLS policies, hooks, edge functions), mas **some da UI** e deixa de ser editável pelo usuário. Migração de schema fica para outra onda — risco alto de quebrar RLS se removida agora.

---

## Escopo desta entrega (somente UI/UX da aba Times)

### 1. Aba Times — `/lider/pessoas?tab=times`

**Remover:**
- Coluna `LÍDER` da tabela densa.
- Linha "Líder externo" / "Sem líder" / `79a6f679`.
- Item de menu kebab **"Trocar líder"**.
- Botão/dialog `ChangeTeamLeaderDialog` (deletar arquivo).

**Manter no kebab:**
- Renomear time
- Excluir time

**Tabela passa a ter 3 colunas:** `Nome · Liderados · Criado · ⋯`

### 2. Microcopy do header da página

Header atual: *"Seu time num único clique. Selecione um liderado para abrir a ficha completa."* — manter.

Subheader da aba Times (acima da tabela): adicionar uma linha curta de contexto:

> *"Times organizam seus liderados em grupos. Toda a operação fica embaixo de você (dono do workspace)."*

Sem mencionar "líder de time" em lugar nenhum.

### 3. Dialog "Novo time" e "Renomear"

- Remover campo/select de líder do `NewTeamDialog` se existir.
- Ao criar, `leader_user_id` é setado **automaticamente para o `effective_user_id` (owner/líder logado)** no INSERT — nada de UI pra escolher.

### 4. Outras superfícies que mostram "líder do time"

Varrer e remover/ocultar referência visual a "líder do time" em:
- `useLeaderInfo` — continua funcionando server-side, mas auditar usos que renderizam nome do líder em UI de liderado (ex: "Seu líder é X"). Como hoje só existe o owner como líder, isso na prática mostra o nome do owner — **mantém**, é correto.
- `MemberDetails` — se houver chip "Líder: …", remover.
- `ChangeTeamLeaderDialog.tsx` — deletar arquivo + remover import em `Pessoas.tsx`.

### 5. Fora de escopo (NÃO mexer)

- `teams.leader_user_id` no schema (continua, é a coluna que sustenta `is_team_leader()` em ~20 policies).
- `useUserRole` — continua resolvendo `leader` via `teamLeaderResult` (é o que dá acesso de líder ao owner).
- Edge functions (`generate-brief`, `chat-mentor`, etc.) que leem `leader_user_id`.
- RLS de `feedbacks`, `goals`, `context_evidence`, `meeting_transcripts`, `development_plans`.
- Discussão sobre RH Admin / org chart hierárquico — fica para outra conversa.

---

## Detalhes técnicos

**Arquivos editados:**
- `src/pages/lider/Pessoas.tsx` — remover coluna LÍDER, remover item kebab "Trocar líder", remover handler/state, adicionar subtexto explicativo na aba Times.
- `src/components/NewTeamDialog.tsx` (verificar) — garantir que `leader_user_id = effective_user_id` no INSERT, sem campo na UI.
- `src/lib/analytics.ts` — remover evento `team_leader_changed` se existir.

**Arquivos deletados:**
- `src/components/ChangeTeamLeaderDialog.tsx`

**i18n:** remover keys `nav.lider.pessoas.times.changeLeader` (e equivalentes em en/es) se existirem.

**Sem migração de banco. Sem mudança de RLS. Sem mudança de edge functions.**

---

## Validação esperada

- Aba Times mostra 3 colunas, sem traço de líder.
- Kebab tem só Renomear + Excluir.
- Criar time novo funciona e o owner continua tendo acesso de líder a tudo (RLS intacta via `teams.leader_user_id` setado no backend).
- Nenhum console error sobre `ChangeTeamLeaderDialog`.

---

## Para depois (memória pra Onda 3+ ou conversa RH Admin)

- Repensar org chart quando entrarmos em RH Admin com sub-líderes.
- Decidir se `teams.leader_user_id` vira `created_by` semanticamente (rename + manter retrocompat).
