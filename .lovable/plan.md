## Auditoria de segurança — resultado por issue

### Issue 1 — CRÍTICO: ownership check em edge functions com `service_role`

**Já estão protegidas (nenhuma ação):**
- `generate-review` — verifica `workspace.owner_id === user.id` (linhas 36-75)
- `analyze-feedback` — verifica `team.leader_user_id === user.id` (linhas 108-144)
- `generate-brief` — verifica `meeting.user_id === userId` (linha 69)
- `reprocess-meeting` — verifica `botRecord.user_id !== userId` (linha 83)
- `chat-mentor` / `meu-rhitmo` — não escrevem em tabelas escopadas por `member_id`

**Vulneráveis — precisam fix:**

1. **`upload-meeting/index.ts`** — recebe `member_id` de `formData` (linha 95) e insere em `meeting_transcripts` + `feedbacks` sob service_role sem verificar ownership. Qualquer usuário autenticado (ou portador de extension token válido) consegue anexar uma reunião a qualquer membro do banco.
   
   Fix: depois de obter `userId`, se `memberId` veio no payload, validar:
   ```
   SELECT 1 FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     JOIN workspaces w ON w.id = t.workspace_id
   WHERE tm.id = memberId
     AND (t.leader_user_id = userId OR w.owner_id = userId)
   ```
   Caso contrário, retornar 403.

2. **`generate-formal-review/index.ts`** — recebe `reviewId` e busca o review via service_role (linhas 55-63) sem checar se o caller é dono. Qualquer usuário autenticado pode regenerar avaliações de outros workspaces.
   
   Fix: após o fetch do review, validar que `caller.id` é igual a um de:
   - `review.manager_id` (autor original)
   - `team.leader_user_id` (líder atual do membro)
   - `workspace.owner_id` (dono do workspace)
   
   Caso contrário, retornar 403.

### Issue 2 — CRÍTICO: validação server-side do `state` no OAuth do Google Calendar

Confirmado: `google-calendar-oauth/index.ts` usa o `state` recebido do Google diretamente como `user_id` no upsert da tabela `google_calendar_tokens` (linha 161). Não há validação contra um valor armazenado server-side. Atacante pode forjar `state = uuid_da_vítima` e sequestrar a conexão.

**Fix em duas partes:**

**a) Migration:** criar tabela `oauth_states`:
- `state_token text PRIMARY KEY` (UUID gerado pelo backend)
- `user_id uuid NOT NULL`
- `provider text DEFAULT 'google_calendar'`
- `created_at`, `expires_at` (default now+10min)
- RLS habilitado, **só** policy para `service_role`
- Função utilitária `cleanup_expired_oauth_states()`

**b) Edge function `google-calendar-oauth`:**
- No action `authorize`: gerar `crypto.randomUUID()`, INSERT em `oauth_states { state_token, user_id }`, usar esse token no `state=` da URL do Google.
- No action `callback`: SELECT pelo `state_token` recebido, validar `expires_at > now()`, DELETE do registro (uso único). Se inválido/expirado → 400. Usar o `user_id` da tabela (não confiar no que veio na request) para o upsert dos tokens.
- Limpar registros expirados oportunisticamente.

Frontend (`GoogleCalendarCallback.tsx`) **não muda** — continua passando `code` e `state` exatamente como recebe do Google.

### Issue 3 — IMPORTANTE: policies faltantes em `enterprise_leads`

Confirmado: tabela só tem policy de `SELECT` para admin. Sem INSERT a function `enterprise-contact` consegue gravar **só porque usa service_role** — funcional, mas removido service_role, formulário público quebra. Sem DELETE, limpeza administrativa só via dashboard SQL.

**Fix (migration):**
- `INSERT` policy para `anon` + `authenticated` com `WITH CHECK (true)`
- `DELETE` policy para `service_role` com `USING (true)`

Edge function `enterprise-contact` continua funcionando exatamente como hoje (já usa service_role).

### Issue 4 — BOA PRÁTICA: `search_path` em funções

**Já está resolvido.** Query no catálogo (`pg_proc` × `proconfig`) confirmou: zero funções no schema `public` sem `search_path` definido. Os 91 warnings remanescentes do linter são de outra natureza (`Public Can Execute SECURITY DEFINER Function` — código `0028/0029`), não relacionados ao Issue 4 e não solicitados nesta auditoria.

---

## Resumo de mudanças propostas

### 1 migration nova
Cria `oauth_states` (Issue 2) + 2 policies em `enterprise_leads` (Issue 3) + função helper `cleanup_expired_oauth_states`.

### 3 arquivos de código
- `supabase/functions/google-calendar-oauth/index.ts` — gerar/validar state token (Issue 2)
- `supabase/functions/upload-meeting/index.ts` — ownership check quando `member_id` é fornecido (Issue 1)
- `supabase/functions/generate-formal-review/index.ts` — ownership check do `reviewId` (Issue 1)

### Não muda
- Nenhuma RLS policy existente é alterada
- Nenhuma lógica de negócio de edge function é alterada
- Frontend não muda
- `generate-review`, `analyze-feedback`, `generate-brief`, `reprocess-meeting`, `chat-mentor`, `meu-rhitmo` ficam como estão (já protegidos)

## Validação após deploy

1. Líder gera avaliação (`generate-review` + `generate-formal-review`) dos próprios liderados → continua funcionando.
2. Conexão Google Calendar end-to-end (`/dashboard` → "Conectar Google Calendar" → OAuth → callback) → continua funcionando, agora com state token válido.
3. Tentativa manual de POST no callback com state forjado → retorna 400.
4. Formulário público enterprise (`/enterprise`) → continua salvando lead.
5. Upload de meeting com `member_id` próprio → funciona; com `member_id` de outro workspace → 403.
6. `generate-formal-review` invocado por não-dono do review → 403.

## Risco
Baixo. Cada mudança adiciona uma verificação ANTES da operação sensível e preserva o caminho feliz dos usuários legítimos. A única quebra possível seria em `upload-meeting` se a Chrome Extension estivesse mandando `member_id` cross-workspace — mas isso seria justamente o vetor de ataque que estamos fechando.
