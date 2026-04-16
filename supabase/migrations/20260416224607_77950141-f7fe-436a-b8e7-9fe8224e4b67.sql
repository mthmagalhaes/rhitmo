DROP POLICY IF EXISTS "HR Admin view workspace recordings" ON storage.objects;

CREATE POLICY "HR Admin view workspace recordings"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'meeting-recordings'
    AND EXISTS (
      SELECT 1
      FROM public.teams t
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE t.leader_user_id::text = (storage.foldername(storage.objects.name))[1]
        AND w.is_active = true
        AND public.is_hr_admin_of_workspace(w.id)
    )
  );