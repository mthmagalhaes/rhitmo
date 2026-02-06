-- 1. Novas colunas em team_members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_token UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_status TEXT DEFAULT 'none' CHECK (invite_status IN ('none', 'pending', 'accepted')),
  ADD COLUMN IF NOT EXISTS skills_data JSONB DEFAULT '{}';

-- 2. Indices para performance
CREATE INDEX IF NOT EXISTS idx_team_members_invite_token ON public.team_members(invite_token);
CREATE INDEX IF NOT EXISTS idx_team_members_linked_user_id ON public.team_members(linked_user_id);

-- 3. Nova coluna em feedbacks
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private_leader' 
    CHECK (visibility IN ('private_leader', 'shared', 'private_member'));

CREATE INDEX IF NOT EXISTS idx_feedbacks_visibility ON public.feedbacks(visibility);

-- 4. Helper function para verificar vinculo
CREATE OR REPLACE FUNCTION public.user_is_linked_member(_user_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE id = _member_id AND linked_user_id = _user_id
  )
$$;

-- 5. RLS: Liderado pode ver seu perfil
CREATE POLICY "Linked users can view own profile"
ON public.team_members
FOR SELECT
TO authenticated
USING (linked_user_id = auth.uid());

-- 6. RPC segura para liderado atualizar seus dados
CREATE OR REPLACE FUNCTION public.update_member_own_data(
  p_work_style_data JSONB DEFAULT NULL,
  p_skills_data JSONB DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.team_members
  SET 
    work_style_data = COALESCE(p_work_style_data, work_style_data),
    skills_data = COALESCE(p_skills_data, skills_data),
    updated_at = now()
  WHERE linked_user_id = auth.uid();
  RETURN FOUND;
END;
$$;

-- 7. RLS: Liderado pode ver feedbacks compartilhados
CREATE POLICY "Linked users can view shared feedbacks"
ON public.feedbacks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = feedbacks.member_id
      AND tm.linked_user_id = auth.uid()
  )
  AND visibility = 'shared'
);