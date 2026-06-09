# 🎫 Bug — `/lider/diario` mostra todos os liderados do workspace

**Afetado:** matheus.magalhaes@fstr.co (Mateus, Owner do workspace Faster Ops)
**Rotas:** `/lider/diario` (Insight) e dialog "Nova Anotação" (lista suspensa)
**Severidade:** alta — vaza nomes de liderados de outros líderes (Douglas, Yasmin, Vitor, Caio)

## Diagnóstico

Confirmei no banco:

- Mateus lidera **5 times** em Faster Ops (Business Ops, CreativeOps, Customer Success, Expansão, People) → **7 liderados diretos**.
- Workspace Faster Ops tem **28 liderados ativos** no total (somando times do Douglas/Produtech, Yasmin/Excelência, Vitor, Caio).
- Airton, Aristoteles e Bianca — que apareceram pra ele — pertencem a Produtech (líder Douglas) e Excelência Criativa (líder Yasmin).

### Causa raiz

**Bug A — `NewNoteDialog` (lista suspensa "Liderado(s)"): bug óbvio no código.**
`src/components/NewNoteDialog.tsx:201-213` carrega `team_members` filtrando **só por `workspace_id`**, sem restringir aos times liderados pelo usuário:

```ts
.from('team_members')
.select('id, name, teams!inner(workspace_id)')
.eq('teams.workspace_id', workspaceId)
```

Como a RLS `tm_read` libera leitura para owner do workspace, a query devolve os 28. → Por isso aparece Airton, Aristoteles, Bianca, Brunna, Caio, Camila etc. no dropdown.

**Bug B — Insight "22 liderados sem nota recente".**
`useLeaderMembers` (no código atual) já filtra estritamente por `teams.leader_user_id = effectiveUserId` e deveria devolver apenas 7. O número 22 bate exatamente com **(28 ativos − ~6 com nota nos últimos 14d)** — comportamento do código **antigo** desse hook (pré-Sprint 12). Hipótese principal: o build publicado ainda é o anterior à correção do hook. Vamos confirmar com o Mateus republicando depois do fix A; se persistir, é o sintoma do Bug C abaixo.

**Bug C (preventivo) — não confiar só na RLS.**
A RLS `rls_check_member_read_access` permite owner/HR-Admin lerem todos os `team_members` do workspace. Isso é correto pra rotas `/workspace/*` e `/hr/*`, mas significa que **qualquer query em `/lider/*` que não filtre explicitamente por `teams.leader_user_id` vai vazar dados**. Precisamos blindar o hook compartilhado.

## Plano

### 1. Corrigir `NewNoteDialog` (Bug A — principal)

Em `src/components/NewNoteDialog.tsx`:
- Remover `loadTeamMembers` que consulta `team_members` por `workspace_id`.
- Em vez disso, **receber a lista de liderados como prop** (`members: Array<{id, name}>`) do componente pai. Os pais já têm a lista correta via `useLeaderMembers`.
- Atualizar chamadas em `Diario.tsx`, `Inicio.tsx`, `OneOnOnes.tsx`, `Mentor.tsx`, `Pessoas.tsx` etc. para passar `members={members}` (vindos do `useLeaderMembers`).
- Manter o filtro por `selectedMemberId` (quando o dialog é aberto pré-selecionado pra 1 liderado) inalterado.

### 2. Blindar `useLeaderMembers` (Bug C — defesa em profundidade)

Em `src/hooks/useLeaderMembers.ts`, na query final de `team_members`:
- Em vez de só `.in('team_id', teamIds)`, fazer **inner join** explícito e re-filtrar:
  ```ts
  .select('*, teams!inner(id, leader_user_id)')
  .eq('teams.leader_user_id', effectiveUserId)
  ```
- Garante que mesmo se um cache stale ou RLS permissiva vazasse linhas, a query rejeite.

### 3. Auditoria rápida (read-only)

Rodar `rg -n "from\('team_members'\)" src/` e revisar cada call site em código `/lider/*`:
- `useLeaderInbox`, `useLeaderInfo`, `useTeamGoalsSummary`, `useTeamReviewsSummary`, etc.
- Se algum filtrar só por `workspace_id`, aplicar a mesma blindagem da etapa 2.

### 4. Validar

- Mateus republica e abre `/lider/diario` → insight deve dizer "X liderados sem nota recente" com X ≤ 7.
- Abrir "Nova nota" → lista deve mostrar apenas os 7 liderados diretos dele (Gabriela Lucas, Yasmin Nóbrega, Guilherme Cunha, Laís Isfer, Giovanna Barletta, Matheus, People).
- Confirmar que `/workspace/pessoas` (visão Owner) continua mostrando os 28 — aí o escopo amplo é correto.

## Sobre "dividir os caps"

Não é necessário criar novo modelo de permissão. A arquitetura atual já separa:

- **`/lider/*`** → escopo "líder direto" (só times onde `leader_user_id = você`). É aqui que o bug está.
- **`/workspace/*` e `/hr/*`** → escopo Owner / HR Admin (workspace inteiro).

Mateus é Owner **e** líder de 5 times. O esperado é:
- Em `/lider/diario`, `/lider/pessoas`, `/lider/1on1s` → vê só os 7 liderados diretos dele.
- Em `/workspace/pessoas` → vê os 28 do workspace (papel de Owner).

O fix acima restaura essa separação sem precisar de novos toggles ou roles.

## Riscos

- Mudar `NewNoteDialog` pra receber `members` via prop quebra qualquer caller que não passe a prop. Vou atualizar todos os call sites no mesmo commit e manter fallback opcional (`members?: …`) com warning no console se vier vazio.
- Nenhum risco de RLS / migration — mudanças são 100% client-side.

## Fora de escopo

- Telas `/workspace/*` e `/hr/*` (Mateus está nelas como Owner/HR-Admin e o escopo amplo é intencional).
- Reformular RLS de `team_members` (segue como está; defesa em profundidade no client).
