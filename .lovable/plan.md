

## Plano: Corrigir policy quebrada de HR Admin sem regressão

### Diagnóstico confirmado

- Arquivos em `meeting-recordings` são salvos como `{uploader_user_id}/{timestamp}.{ext}` (visto em `upload-meeting/index.ts:127`)
- Policy atual `HR Admin view workspace recordings` usa `(storage.foldername(w.name))[1]::uuid = w.owner_id` — pega o **nome do workspace** (texto livre tipo "Rhitmo Inc.") e tenta cast pra UUID → **sempre falha silenciosamente**
- **Impacto atual: zero vazamento**, mas HR Admins na prática nunca conseguem listar gravações via essa policy. As outras 4 policies do bucket continuam corretas (manager vê só a própria pasta)

### Correção

Substituir a policy quebrada por uma versão correta que:
1. Extrai o user_id do **path do arquivo** (`storage.foldername(name)`), não do nome do workspace
2. Verifica que esse user_id é líder de algum time num workspace onde o caller é HR Admin
3. Mantém workspace ativo

```sql
DROP POLICY "HR Admin view workspace recordings" ON storage.objects;

CREATE POLICY "HR Admin view workspace recordings"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'meeting-recordings'
    AND EXISTS (
      SELECT 1
      FROM public.teams t
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE t.leader_user_id::text = (storage.foldername(name))[1]
        AND w.is_active = true
        AND public.is_hr_admin_of_workspace(w.id)
    )
  );
```

### Por que isso não quebra nada

| Risco | Mitigação |
|---|---|
| Manager perde acesso à própria pasta | Não — policies `Managers view own recordings` e `Users can view own recordings` continuam intactas |
| Upload quebra | Não — policies INSERT não tocadas |
| Delete quebra | Não — policies DELETE não tocadas |
| HR Admin acessa gravações de outros workspaces | Não — `is_hr_admin_of_workspace(w.id)` só retorna true para workspaces onde o caller está em `hr_admin_ids` |
| HR Admin acessa gravações de quem não é líder do workspace dele | Não — JOIN exige que o uploader (`leader_user_id`) pertença a um time **dentro** do workspace |

### Cobertura intencional

Após o fix, HR Admin de workspace W verá gravações de qualquer líder cujos times pertencem a W. Isso casa com o modelo `Workspace = Empresa` e com a regra existente em `is_hr_admin_of_workspace`.

### Arquivos modificados

- 1 migration SQL (DROP + CREATE da policy)

### Validação pós-fix

1. Login como manager normal: continua vendo só a própria pasta ✓
2. Login como HR Admin do workspace: lista gravações dos líderes do workspace ✓
3. Login como HR Admin de workspace A não vê gravações de líderes do workspace B ✓
4. Marcar finding `hr_admin_recording_policy_broken` como `mark_as_fixed` no scanner

### Escopo

Mínimo. 1 migration de ~10 linhas, sem mudança de código TS, sem mudança de função. ~3 minutos. Risco: nulo — a policy atual já está quebrada (só falha), substituí-la por uma correta só **adiciona** o acesso pretendido.

