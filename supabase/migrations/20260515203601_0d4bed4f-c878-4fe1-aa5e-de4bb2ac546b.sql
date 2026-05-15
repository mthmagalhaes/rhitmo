DROP POLICY IF EXISTS "HR admins read own workspace reports" ON storage.objects;

CREATE POLICY "HR admins read own workspace reports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'monthly-reports'
  AND EXISTS (
    SELECT 1 FROM workspaces w
    WHERE (w.id)::text = (storage.foldername(storage.objects.name))[1]
      AND (w.owner_id = auth.uid() OR auth.uid() = ANY (COALESCE(w.hr_admin_ids, '{}'::uuid[])))
  )
);