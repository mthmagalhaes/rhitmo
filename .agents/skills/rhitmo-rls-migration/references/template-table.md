# Template Canônico: CREATE TABLE + GRANT + RLS + POLICY

A ordem das 4 etapas é fixa. Mudar a ordem ou pular qualquer uma quebra a tabela.

## Trigger `updated_at` padrão (criar uma vez no projeto, reutilizar)

A função `public.update_updated_at_column()` já existe. Em tabelas novas:

```sql
CREATE TRIGGER update_<table>_updated_at
  BEFORE UPDATE ON public.<table>
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Caso A — Tabela owned by líder (caso mais comum)

Exemplo: `leader_notes` que cada líder cria para si.

```sql
-- 1. CREATE TABLE
CREATE TABLE public.leader_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,                 -- nunca FK para auth.users
  title text NOT NULL,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. GRANT — auth-only, sem anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leader_notes TO authenticated;
GRANT ALL ON public.leader_notes TO service_role;

-- 3. ENABLE RLS
ALTER TABLE public.leader_notes ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES
CREATE POLICY "Manager can read own notes"
  ON public.leader_notes FOR SELECT TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "Manager can insert own notes"
  ON public.leader_notes FOR INSERT TO authenticated
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Manager can update own notes"
  ON public.leader_notes FOR UPDATE TO authenticated
  USING (manager_id = auth.uid()) WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Manager can delete own notes"
  ON public.leader_notes FOR DELETE TO authenticated
  USING (manager_id = auth.uid());

-- 5. updated_at trigger
CREATE TRIGGER update_leader_notes_updated_at
  BEFORE UPDATE ON public.leader_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

**Notas:** `manager_id NOT NULL`. `occurred_at` separado de `created_at` (memória Time Machine).

---

## Caso B — Tabela compartilhada no workspace (Owner/HR Admin veem tudo)

Exemplo: `team_announcements`.

```sql
CREATE TABLE public.team_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  team_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_announcements TO authenticated;
GRANT ALL ON public.team_announcements TO service_role;

ALTER TABLE public.team_announcements ENABLE ROW LEVEL SECURITY;

-- Leitura: autor, owner do workspace, HR admin do workspace, ou líder do time
CREATE POLICY "Read in workspace scope"
  ON public.team_announcements FOR SELECT TO authenticated
  USING (
    author_user_id = auth.uid()
    OR public.is_workspace_owner(workspace_id, auth.uid())
    OR public.is_hr_admin_of_workspace(workspace_id, auth.uid())
    OR public.is_team_leader(team_id, auth.uid())
  );

-- Escrita: só autor ou owner/HR
CREATE POLICY "Author or admin write"
  ON public.team_announcements FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND (
      public.is_team_leader(team_id, auth.uid())
      OR public.is_hr_admin_of_workspace(workspace_id, auth.uid())
      OR public.is_workspace_owner(workspace_id, auth.uid())
    )
  );

CREATE POLICY "Author update"
  ON public.team_announcements FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

CREATE TRIGGER update_team_announcements_updated_at
  BEFORE UPDATE ON public.team_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Caso C — Tabela do líder com leitura pelo liderado vinculado

Exemplo: `member_recap` que o líder escreve e o liderado pode ler quando `visibility = 'shared'`.

```sql
CREATE TABLE public.member_recap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','shared')),
  content text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_recap TO authenticated;
GRANT ALL ON public.member_recap TO service_role;

ALTER TABLE public.member_recap ENABLE ROW LEVEL SECURITY;

-- Líder dono: tudo
CREATE POLICY "Manager full access"
  ON public.member_recap FOR ALL TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

-- Liderado vinculado: SELECT apenas quando shared
CREATE POLICY "Linked member can read shared"
  ON public.member_recap FOR SELECT TO authenticated
  USING (
    visibility = 'shared'
    AND member_id IN (
      SELECT id FROM public.team_members
      WHERE linked_user_id = auth.uid()
    )
  );

CREATE TRIGGER update_member_recap_updated_at
  BEFORE UPDATE ON public.member_recap
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

**Lembrar:** `member_id` é nullable no schema real apesar do TS (`mem://technical/schema-discrepancies`).

---

## RPC pública (chamada do frontend) — sempre encerre com smoke

```sql
CREATE OR REPLACE FUNCTION public.get_my_recap_summary(_member_id uuid)
RETURNS TABLE (...)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ownership check ANTES de retornar dados
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = _member_id
      AND (tm.manager_id = auth.uid() OR tm.linked_user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY SELECT ...;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_recap_summary(uuid) TO authenticated;

-- Smoke obrigatório: falha o deploy se a RPC quebrar
SELECT public._assert_rpc_runs('get_my_recap_summary');
```
