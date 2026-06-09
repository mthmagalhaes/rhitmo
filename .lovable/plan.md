# Reclamação do Guto (Faster): liderados não conseguem vincular

## O que está acontecendo

Duas falhas distintas geraram os 2 prints:

### 1) "Erro ao criar workspace · duplicate key value violates workspaces_owner_id_unique" (IMG_4602)

Liderados da Faster (Thalia, Bianca, e potencialmente outros) logam pela primeira vez e — em vez de cair como membros vinculados ao workspace **Faster (`27ee8977…`)** — recebem o modal `WorkspaceOnboarding` ("Bem-vindo ao Rhitmo / Nome do Workspace"). Eles digitam "Faster", criam um workspace duplicado como **dono**, e o próximo clique bate na unique constraint `workspaces_owner_id_unique` (1 owner = 1 workspace).

Hoje já foram criados 2 workspaces "Faster" órfãos:
- `0b75fe37…` (dono: Thalia Padilha, 14:36)
- `a0e9a22e…` (dono: Bianca Brand, 14:53)

**Causa raiz** — na RPC `public.get_account_context`:

```sql
SELECT … FROM team_members
WHERE linked_user_id = p_user_id
  AND invite_status = 'accepted'   -- ← exige 'accepted'
LIMIT 1;
```

Mas várias linhas em `team_members` da Faster têm `linked_user_id` preenchido **e** `invite_status = 'none'` (Thalia, Tharyane, Renato, Marina, etc. — provavelmente vieram do `bulk-onboard`, que setou o link mas não marcou como aceito). Resultado:

- `linked_member = NULL` → `isLinkedMember = false`
- `has_pending_invite = false` (porque também exige `linked_user_id IS NULL`)
- `AppLayout` cai em `needsWorkspaceSetup = true` → modal aparece → liderado cria workspace duplicado.

### 2) "Erro na vinculação · Token de vinculação inválido" (IMG_4601)

Vem de `supabase/functions/slack-link/index.ts`. O state HMAC tem TTL de **600 s (10 min)**. Quando o liderado clica no DM `/rhitmo` e precisa **criar conta + confirmar email + logar** antes de o frontend chamar a edge, o token expira → mensagem genérica "inválido" (a mensagem específica de "expirou" só é mostrada quando o HMAC bate mas o timestamp passou; antes disso, qualquer mismatch vira "inválido").

## Plano de correção

### Backend

1. **`get_account_context` — aceitar liderados vinculados independentemente do `invite_status`**
   Trocar o filtro do bloco `v_linked`:
   ```sql
   WHERE linked_user_id = p_user_id
     AND invite_status <> 'revoked'  -- só exclui explicitamente revogados
   ```
   E na detecção de convite pendente, considerar também rows pendentes por email mesmo com `linked_user_id` setado para outro usuário (não bloqueia o caso correto). Migration nova.

2. **Backfill defensivo** — atualizar `team_members` onde `linked_user_id IS NOT NULL AND invite_status = 'none'` para `invite_status = 'accepted'`. Roda dentro da mesma migration.

3. **`bulk-onboard` (edge function)** — quando criar a linha de team_member já com `linked_user_id`, gravar `invite_status = 'accepted'` para evitar reincidência.

4. **`slack-link` — TTL maior + mensagem honesta**
   - Aumentar TTL do HMAC de 600 s para **3600 s (1 h)** (tempo suficiente p/ signup + confirm + login).
   - Garantir que o front, ao iniciar o fluxo de auth, preserve o `state` na URL/sessionStorage e o reaplique após o login (verificar `SlackConnect.tsx`).

### Limpeza de dados (Faster)

5. **Apagar os 2 workspaces órfãos criados hoje** (`0b75fe37…` e `a0e9a22e…`) e seus times "Sem Time". Antes disso, validar que não há dados de uso lá (deve haver zero — foram criados por engano e o segundo passo dos liderados já dava erro). Migration `DELETE` segura com WHERE específico por id.

### Frontend (guard duplicado)

6. **`AppLayout.tsx`** — adicionar uma checagem extra: se `linkedMember` veio nulo mas `signupPersona !== 'leader'`, não mostrar `WorkspaceOnboarding` automaticamente; em vez disso, exibir um estado "Estamos te conectando ao seu time…" com botão de retry/refresh. Evita que qualquer regressão futura na RPC volte a criar workspaces fantasma.

## Validação

- Thalia loga → vê dashboard de liderada da Faster, sem modal.
- Novo liderado clica no DM do Slack 30 min depois → fluxo conclui sem "token inválido".
- Tentativa manual de criar workspace via API por um liderado vinculado → continua bloqueada pela unique, mas o usuário nunca chega lá.
- Owners e líderes legítimos sem workspace continuam vendo o modal (`signup_persona='leader'`).

## Não-objetivos

- Não alterar a constraint `workspaces_owner_id_unique` — ela está protegendo o sistema corretamente; o bug é o front empurrar liderados pra criar workspace.
- Não tocar no fluxo de HR Admin / Owner.
