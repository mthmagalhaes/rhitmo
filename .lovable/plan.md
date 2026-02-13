

## Plano: Preparar Backend para Extensao Chrome (Upload de Gravacoes)

### 1. Storage Bucket `meeting-recordings`

Criar bucket publico via SQL migration com politicas RLS para:
- **Upload (INSERT)**: apenas usuarios autenticados, dentro da pasta do proprio `uid()`
- **Select (leitura)**: apenas o dono do arquivo
- **Delete**: apenas o dono do arquivo

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-recordings', 'meeting-recordings', true);

CREATE POLICY "Authenticated users can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'meeting-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'meeting-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'meeting-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 2. Edge Function `upload-meeting`

Criar `supabase/functions/upload-meeting/index.ts` com:

- **CORS**: Origem `*` (cobre `chrome-extension://*`), handler OPTIONS
- **Auth**: Extrair token do header Authorization, criar Supabase client autenticado
- **Fluxo**:
  1. Parsear multipart form data (`file`, `meeting_title`, `meeting_url`, `member_id`)
  2. Gerar path: `{user_id}/{timestamp}.webm`
  3. Upload para bucket `meeting-recordings`
  4. Criar registro em `meeting_transcripts` com `processing_status = 'pending'` e referencia ao arquivo
  5. Retornar `{ success: true, message: 'Upload recebido', transcript_id: '...' }`

- **Config**: `verify_jwt = false` no `config.toml` (validacao manual no codigo para flexibilidade com Chrome Extension)

### 3. Configuracao

Adicionar ao `supabase/config.toml`:
```toml
[functions.upload-meeting]
verify_jwt = false
```

### Detalhes Tecnicos

- O campo `member_id` e obrigatorio na tabela `meeting_transcripts`. A extensao precisara enviar esse dado ou usaremos um membro default
- O arquivo sera salvo no Storage e apenas a URL publica sera armazenada no banco (campo `transcript` ou novo campo se preferido)
- Nenhuma alteracao no schema da tabela `meeting_transcripts` e necessaria -- usaremos `transcript` para a URL e `processing_status = 'pending'`

### Arquivos Criados/Modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar bucket + policies |
| `supabase/functions/upload-meeting/index.ts` | Nova edge function |
| `supabase/config.toml` | Adicionar config da funcao (automatico) |

