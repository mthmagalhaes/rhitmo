

## Plano: Hardening RLS da Tabela meeting_transcripts

Revisao das politicas existentes para aplicar boas praticas de seguranca explicitas.

---

### Analise do Estado Atual

As 4 politicas existentes ja usam `manager_id = effective_user_id()`, o que significa que apenas o lider que criou a transcricao pode acessa-la. O `member_id` NAO concede acesso de leitura — ele e usado apenas para fazer join ate a tabela `workspaces` para verificar `is_active`.

**Problemas encontrados:**
- Politicas nao especificam `TO authenticated` (default e `TO PUBLIC`, inclui usuarios anonimos)
- Nenhuma brecha via `member_id` — mas vale tornar isso explicito na documentacao

---

### Acoes SQL (via migration)

**1. Dropar as 4 politicas existentes**

```sql
DROP POLICY "Managers can view own meeting transcripts" ON public.meeting_transcripts;
DROP POLICY "Managers can create meeting transcripts" ON public.meeting_transcripts;
DROP POLICY "Managers can update own meeting transcripts" ON public.meeting_transcripts;
DROP POLICY "Managers can delete own meeting transcripts" ON public.meeting_transcripts;
```

**2. Recriar com `TO authenticated` explicito**

```sql
-- SELECT: apenas o manager que criou
CREATE POLICY "Managers can view own meeting transcripts"
ON public.meeting_transcripts FOR SELECT
TO authenticated
USING (
  manager_id = effective_user_id()
  AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = meeting_transcripts.member_id
    AND w.is_active = true
  )
);

-- INSERT: manager = dono do workspace
CREATE POLICY "Managers can create meeting transcripts"
ON public.meeting_transcripts FOR INSERT
TO authenticated
WITH CHECK (
  manager_id = effective_user_id()
  AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = meeting_transcripts.member_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  )
);

-- UPDATE: apenas o manager
CREATE POLICY "Managers can update own meeting transcripts"
ON public.meeting_transcripts FOR UPDATE
TO authenticated
USING (
  manager_id = effective_user_id()
  AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = meeting_transcripts.member_id
    AND w.is_active = true
  )
);

-- DELETE: apenas o manager
CREATE POLICY "Managers can delete own meeting transcripts"
ON public.meeting_transcripts FOR DELETE
TO authenticated
USING (
  manager_id = effective_user_id()
  AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = meeting_transcripts.member_id
    AND w.is_active = true
  )
);
```

---

### O que muda

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Target role | `PUBLIC` (default) | `authenticated` (explicito) |
| Acesso via member_id | Nao concedia (ja seguro) | Nao concede (mantido) |
| Acesso anonimo | Bloqueado implicitamente | Bloqueado explicitamente |
| Logica de ownership | `manager_id = effective_user_id()` | Mantida identica |

### Arquivos de codigo

Nenhuma alteracao de codigo e necessaria. As queries existentes no frontend ja usam o usuario autenticado e filtram por `manager_id`.

---

### Resumo

A tabela ja estava segura na pratica. Esta migracao torna a seguranca **explicita** adicionando `TO authenticated` a todas as politicas, garantindo que usuarios anonimos sejam bloqueados por regra e nao por efeito colateral.

