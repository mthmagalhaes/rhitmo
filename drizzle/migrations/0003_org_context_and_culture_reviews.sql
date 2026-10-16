
CREATE OR REPLACE FUNCTION public.is_leader_in_workspace(_workspace_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.teams t WHERE t.workspace_id = _workspace_id AND t.leader_user_id = auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.can_manage_review(_review_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.performance_reviews r
    JOIN public.team_members tm ON tm.id = r.member_id
    JOIN public.teams t ON t.id = tm.team_id
    LEFT JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE r.id = _review_id
      AND (r.author_user_id = auth.uid() OR t.leader_user_id = auth.uid() OR w.owner_id = auth.uid())
  );
END $$;

CREATE TABLE public.org_context_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text,
  mime text,
  status text NOT NULL DEFAULT 'pending',
  extracted_text text,
  error text,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_context_documents TO authenticated;
GRANT ALL ON public.org_context_documents TO service_role;
ALTER TABLE public.org_context_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws admins manage org docs" ON public.org_context_documents FOR ALL TO authenticated
  USING (public.is_workspace_admin(workspace_id)) WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE TABLE public.org_context_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  published_by uuid,
  UNIQUE (workspace_id, version)
);
CREATE INDEX ON public.org_context_versions (workspace_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_context_versions TO authenticated;
GRANT ALL ON public.org_context_versions TO service_role;
ALTER TABLE public.org_context_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws admins manage versions" ON public.org_context_versions FOR ALL TO authenticated
  USING (public.is_workspace_admin(workspace_id)) WITH CHECK (public.is_workspace_admin(workspace_id));
CREATE POLICY "leaders read published versions" ON public.org_context_versions FOR SELECT TO authenticated
  USING (status = 'published' AND public.is_leader_in_workspace(workspace_id));

CREATE TABLE public.org_context_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.org_context_versions(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'value',
  category_label text,
  parent_id uuid REFERENCES public.org_context_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  examples jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0,
  source_document_id uuid REFERENCES public.org_context_documents(id) ON DELETE SET NULL,
  source_excerpt text,
  edited_manually boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.org_context_items (version_id, kind, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_context_items TO authenticated;
GRANT ALL ON public.org_context_items TO service_role;
ALTER TABLE public.org_context_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws admins manage items" ON public.org_context_items FOR ALL TO authenticated
  USING (public.is_workspace_admin(workspace_id)) WITH CHECK (public.is_workspace_admin(workspace_id));
CREATE POLICY "leaders read published items" ON public.org_context_items FOR SELECT TO authenticated
  USING (public.is_leader_in_workspace(workspace_id) AND EXISTS (
    SELECT 1 FROM public.org_context_versions v WHERE v.id = version_id AND v.status = 'published'));

ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS authoring_mode text NOT NULL DEFAULT 'full_draft',
  ADD COLUMN IF NOT EXISTS org_context_version_id uuid REFERENCES public.org_context_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mirror_findings jsonb,
  ADD COLUMN IF NOT EXISTS mirror_checked_at timestamptz;

CREATE TABLE public.review_culture_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  org_item_id uuid REFERENCES public.org_context_items(id) ON DELETE SET NULL,
  item_title text NOT NULL,
  item_kind text NOT NULL DEFAULT 'value',
  position integer NOT NULL DEFAULT 0,
  suggested_text text,
  final_text text,
  suggested_level text,
  final_level text,
  level_justification text,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, org_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_culture_items TO authenticated;
GRANT ALL ON public.review_culture_items TO service_role;
ALTER TABLE public.review_culture_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review managers manage culture items" ON public.review_culture_items FOR ALL TO authenticated
  USING (public.can_manage_review(review_id)) WITH CHECK (public.can_manage_review(review_id));

CREATE POLICY "ws admins read org-context files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'org-context' AND public.is_workspace_admin(((storage.foldername(name))[1])::uuid));
CREATE POLICY "ws admins upload org-context files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org-context' AND public.is_workspace_admin(((storage.foldername(name))[1])::uuid));
CREATE POLICY "ws admins delete org-context files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'org-context' AND public.is_workspace_admin(((storage.foldername(name))[1])::uuid));
