

## Análise de Riscos de Segurança

Revisei os 7 findings do scan. Aqui está a priorização por impacto real:

### ALTO RISCO — Corrigir agora

| # | Finding | Risco real |
|---|---------|-----------|
| 1 | **submit_rhitmo_sync_v2 acessível por anon** | Qualquer pessoa pode envenenar o perfil comportamental de um liderado antes dele preencher. Dados de Rhitmo Sync falsos influenciam reviews e PDIs. |
| 2 | **Edge Functions sem ownership check (generate-review, analyze-feedback)** | Qualquer usuário autenticado pode gerar review ou inserir feedback para membros de OUTRO workspace. Vazamento cross-tenant. |
| 3 | **chat-attachments bucket público** | Qualquer pessoa na internet pode listar e baixar arquivos enviados no chat do mentor. Possível exposição de documentos sensíveis. |

### MÉDIO RISCO — Corrigir em breve

| # | Finding | Risco real |
|---|---------|-----------|
| 4 | **Google OAuth state sem nonce** | Atacante pode injetar tokens do próprio Google Calendar na conta de outro usuário. Requer interceptação do redirect. |
| 5 | **effective_user_id() sem LIMIT 1** | Se admin tiver 2+ registros em admin_impersonation, todas as queries RLS falham — denial of service para o admin. |
| 6 | **meeting-recordings bucket público** | Gravações de reuniões 1:1 acessíveis via URL direta sem autenticação. |

### BAIXO RISCO — Aceitável por agora

| # | Finding | Risco real |
|---|---------|-----------|
| 7 | **HR Admin recording policy com condição quebrada** | Policy nunca concede acesso (falha silenciosa). Não é over-permissive, apenas non-functional. |

---

### Plano de correção (5 ações)

**1. Revogar anon de submit_rhitmo_sync_v2**
- Migration: `REVOKE EXECUTE FROM anon, public; GRANT TO authenticated;`
- Adicionar check `linked_user_id = auth.uid()` dentro da função

**2. Adicionar ownership check nas Edge Functions**
- `generate-review`: verificar que o caller é owner do workspace do member
- `analyze-feedback`: mesma verificação antes de usar service_role

**3. Tornar chat-attachments privado**
- Migration: `UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';`
- Atualizar código para usar signed URLs

**4. Tornar meeting-recordings privado**
- Migration: `UPDATE storage.buckets SET public = false WHERE id = 'meeting-recordings';`
- Atualizar upload-meeting e player para signed URLs

**5. Adicionar LIMIT 1 em effective_user_id()**
- Migration: recriar função com `ORDER BY created_at DESC LIMIT 1`

### Sobre a Landing Page
A landing page não é afetada — ela não usa autenticação nem acessa dados protegidos. Os riscos são todos no app autenticado.

### Impacto estimado
- 3 migrations SQL
- 2 edge functions editadas
- ~3 arquivos frontend (signed URLs)
- Nenhuma mudança de UI/design

