

## Plano: Garantir cobertura multi-workspace para todos os líderes

### Status atual — tudo OK para você

- Bot da Giovanna (15:30): `joining` — entrou na sala agora
- Bot da Giovanna anterior: `done` — transcrição + feedback criados com sucesso (157 segmentos)
- Bot da Gabriela: `scheduled` para 20:20 UTC (2 min antes da reunião das 17:30 BRT)
- Webhook funcional e recebendo eventos do Recall

Seus liderados estão todos no workspace "Faster Ops" que você é owner. O fluxo vai funcionar.

### Melhoria necessária para robustez

O `fetch-calendar-events` hoje busca liderados de **um único workspace**:
1. Primeiro tenta `workspaces.owner_id = userId` → pega 1 workspace
2. Se não encontra, tenta `teams.leader_user_id = userId` → pega 1 workspace

Se um líder lidera times em **múltiplos workspaces** (ex: um gestor convidado em outra empresa), os liderados do segundo workspace não seriam encontrados.

### Correção

**Arquivo: `supabase/functions/fetch-calendar-events/index.ts`**

Substituir a lógica de busca de membros por uma query que carrega **todos os liderados de todos os times** que o usuário lidera, independente de workspace:

```sql
SELECT tm.id, tm.name, tm.role, tm.email
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE t.leader_user_id = :userId
  AND tm.email IS NOT NULL
```

Isso elimina a dependência do `workspaceId` e garante cobertura total.

Também preciso ajustar a lógica de `upcoming_meetings` que usa `workspace_id` — mas o upsert usa `user_id`, então não há problema ali.

### Arquivos a modificar
- `supabase/functions/fetch-calendar-events/index.ts` — buscar membros via `teams.leader_user_id` direto, sem filtro de workspace

### Resultado esperado
- Reunião com Gabriela: bot entra, transcreve, transcrição cai no diário dela
- Funciona para qualquer líder, mesmo liderando times em múltiplos workspaces

