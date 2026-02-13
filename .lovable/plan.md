

## Plano: Modo Debug para Upload da Extensao

### Mudanca 1: Tornar `member_id` e `manager_id` nullable na tabela `meeting_transcripts`

**SQL Migration:**
```sql
ALTER TABLE public.meeting_transcripts 
  ALTER COLUMN member_id DROP NOT NULL,
  ALTER COLUMN manager_id DROP NOT NULL;
```

Isso permite criar registros sem precisar de um membro ou manager associado durante testes.

---

### Mudanca 2: Remover exigencia de autenticacao na Edge Function

Modificar `supabase/functions/upload-meeting/index.ts` para:

- **Tentar** autenticar se o header Authorization existir, mas **nao bloquear** se estiver ausente
- Usar o **Service Role Key** para operacoes de storage e banco quando nao houver usuario autenticado
- Tornar `member_id` opcional (nao retornar erro 400 se ausente)
- Usar um path generico `anonymous/{timestamp}.webm` quando nao houver usuario

**Logica simplificada:**
```text
1. Checar Authorization header
2. Se existir -> tentar autenticar, usar user.id
3. Se nao existir -> usar service_role_key, user = null
4. Parsear formData (file obrigatorio, member_id opcional)
5. Upload para storage: {user_id ou 'anonymous'}/{timestamp}.webm
6. Insert em meeting_transcripts com member_id e manager_id podendo ser null
7. Retornar { success: true }
```

---

### Mudanca 3: Politica RLS para insercao sem auth

As policies atuais de `meeting_transcripts` exigem `manager_id = effective_user_id()`. Como usaremos o **service role key** na funcao (que bypassa RLS), nenhuma alteracao de policy e necessaria.

---

### Resumo

| Item | Acao |
|------|------|
| `meeting_transcripts` schema | `member_id` e `manager_id` passam a ser nullable |
| `upload-meeting` edge function | Auth opcional, fallback para service role |
| RLS policies | Sem alteracao (service role bypassa RLS) |

### Nota de Seguranca

Estas mudancas sao **temporarias para debug**. Antes de ir para producao, devemos:
- Restaurar `NOT NULL` nas colunas
- Reativar autenticacao obrigatoria na edge function

