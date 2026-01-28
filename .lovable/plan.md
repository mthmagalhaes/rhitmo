
## Plano: Implementar Sistema de Backup Redundante (Caixa Preta)

### Visão Geral

Sistema de backup automático que salva cópias físicas de avaliações e feedbacks em Storage, protegendo contra rollbacks de banco de dados.

---

### Arquitetura do Sistema

```text
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Frontend      │───▶│   Supabase DB    │───▶│   Storage Bucket    │
│ (NewNoteDialog  │    │ (feedbacks,      │    │  (data-backups)     │
│  NewReviewDialog)    │  performance_    │    │                     │
│                 │    │  reviews)        │    │ /{user_id}/{ano}/   │
│ Toast: "Salvo   │    │                  │    │  {mes}/{tipo}_      │
│  no Banco ✅"   │    │                  │    │  {timestamp}.json   │
│ Toast: "Backup  │◀───│◀─── Edge Func ◀──│    │                     │
│  Seguro 🔒"     │    │   backup-data    │    └─────────────────────┘
└─────────────────┘    └──────────────────┘
```

---

### Etapa 1: Criar Storage Bucket Privado

**Ação**: Migration SQL para criar bucket `data-backups`

```sql
-- Criar bucket privado para backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-backups', 'data-backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Apenas dono do workspace pode fazer upload
CREATE POLICY "Owners can upload backups"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'data-backups'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Apenas dono pode fazer download
CREATE POLICY "Owners can download backups"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'data-backups'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Apenas dono pode deletar (opcional, para cleanup)
CREATE POLICY "Owners can delete backups"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'data-backups'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

### Etapa 2: Criar Edge Function `backup-data`

**Arquivo**: `supabase/functions/backup-data/index.ts`

**Funcionalidade**:
- Recebe: `{ type: 'feedback' | 'review', data: object, userId: string }`
- Gera path: `/{userId}/{ano}/{mes}/{tipo}_{timestamp}.json`
- Salva no bucket `data-backups`
- Retorna: `{ success: true, path: string }`

**Código principal**:
```typescript
// Pseudocódigo simplificado
const now = new Date();
const path = `${userId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${type}_${now.toISOString().replace(/[:.]/g, '-')}.json`;

await supabase.storage
  .from('data-backups')
  .upload(path, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
    upsert: false
  });
```

---

### Etapa 3: Integrar no Frontend

**Arquivo 1**: `src/components/NewNoteDialog.tsx`

**Modificações**:
1. Após salvar feedback no banco, chamar `backup-data`
2. Mostrar toast sequencial com confirmação de backup

```typescript
// Após insert bem-sucedido
toast({ title: "Nota salva! ✅" });

// Fire-and-forget backup (não bloqueia UX)
supabase.functions.invoke('backup-data', {
  body: { 
    type: 'feedback', 
    data: feedback,
    userId: user.id 
  }
}).then(() => {
  toast({ title: "Backup Seguro Confirmado 🔒" });
}).catch((err) => {
  console.warn('Backup failed:', err);
  // Silent fail - dados principais já estão salvos
});
```

**Arquivo 2**: `src/components/NewReviewDialog.tsx`

**Mesma lógica**, adaptada para performance_reviews:
```typescript
// Após insert da avaliação
toast({ title: "Avaliação salva! 🎉" });

supabase.functions.invoke('backup-data', {
  body: { 
    type: 'review', 
    data: { 
      member_id: memberId,
      title,
      content,
      coaching_tip: coachingTip,
      period_type 
    },
    userId: user.id 
  }
}).then(() => {
  toast({ title: "Backup Seguro Confirmado 🔒" });
});
```

---

### Etapa 4: Atualizar config.toml

```toml
[functions.backup-data]
verify_jwt = true
```

---

### Resultado Final

| Evento | Ação |
|--------|------|
| Nova nota/feedback criado | Salvo no banco + backup em `data-backups/{user_id}/...` |
| Nova avaliação criada | Salvo no banco + backup em `data-backups/{user_id}/...` |
| Rollback do banco | Backups no Storage permanecem intactos |
| Usuário vê | Toast "Salvo ✅" + Toast "Backup 🔒" |

---

### Estrutura de Arquivos no Storage

```text
data-backups/
├── {user_id_1}/
│   ├── 2026/
│   │   ├── 01/
│   │   │   ├── feedback_2026-01-28T12-30-00-000Z.json
│   │   │   ├── feedback_2026-01-28T14-45-00-000Z.json
│   │   │   └── review_2026-01-28T16-00-00-000Z.json
│   │   └── 02/
│   │       └── ...
│   └── ...
└── {user_id_2}/
    └── ...
```

---

### Seção Técnica

**Arquivos a criar/modificar**:

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/xxx_create_backup_bucket.sql` | CREATE bucket + RLS policies |
| `supabase/functions/backup-data/index.ts` | Nova Edge Function |
| `supabase/config.toml` | Adicionar `[functions.backup-data]` |
| `src/components/NewNoteDialog.tsx` | Integrar chamada de backup |
| `src/components/NewReviewDialog.tsx` | Integrar chamada de backup |

**Deploy**: Edge Function será deployada automaticamente.

**Segurança**:
- Bucket privado (public: false)
- RLS baseado em `auth.uid()` - cada usuário só vê seus próprios backups
- Path do arquivo usa userId como primeiro nível = isolamento total

**Considerações de Performance**:
- Backup é fire-and-forget (não bloqueia UX)
- Toast de confirmação aparece após sucesso
- Falha de backup não impede salvamento principal
