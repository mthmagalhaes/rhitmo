

## Correção dos Erros Críticos de Segurança

### Status atual dos findings

| Finding | Status | Ação necessária |
|---------|--------|-----------------|
| submit_rhitmo_sync_v2 (anon) | JA CORRIGIDO | Marcar como fixed no scan |
| member_review_update_bypass | JA CORRIGIDO | Marcar como fixed no scan |
| meeting_recordings_public | JA CORRIGIDO (bucket private) | Marcar como fixed no scan |
| chat_attachments_public_read | ABERTO | Corrigir |
| chat_attachments_unrestricted_upload | ABERTO | Corrigir |

Dos 5 erros críticos, **3 já foram corrigidos** em migrations anteriores. Faltam apenas os 2 do bucket `chat-attachments`.

---

### Correções necessárias

#### 1. Migration SQL: Corrigir policies do chat-attachments

O bucket `chat-attachments` já é private, mas tem 2 policies problemáticas:

**Policy "Public read for attachments"** — concede SELECT ao role `public` (qualquer pessoa, sem autenticação). Deve ser substituída por policy que restringe leitura ao dono do arquivo (via `storage.foldername`).

**Policy "Users can upload attachments"** — permite INSERT para qualquer autenticado em qualquer path. Deve restringir uploads ao folder do próprio `auth.uid()`.

```sql
-- Drop insecure policies
DROP POLICY IF EXISTS "Public read for attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;

-- Owner-scoped read
CREATE POLICY "Users can read own attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Owner-scoped upload
CREATE POLICY "Users can upload own attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### 2. Marcar findings resolvidos no scan

Atualizar o status dos 3 findings já corrigidos + os 2 novos após a migration:
- `rpc_public_grant_anon` → fixed
- `member_review_update_bypass` → fixed
- `meeting_recordings_public` → fixed
- `chat_attachments_public_read` → fixed (após migration)
- `chat_attachments_unrestricted_upload` → fixed (após migration)

### Impacto
- 1 migration SQL
- 0 arquivos frontend (bucket `chat-attachments` não é referenciado no código atualmente)
- 0 edge functions alteradas

### O que NÃO muda
- Buckets meeting-recordings e data-backups (já seguros)
- Lógica de upload de reuniões
- Fluxo de autenticação
- Landing page e pricing

