
-- 1. Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'meeting-recordings';

-- 2. Storage RLS policies

-- Manager can upload to own folder
CREATE POLICY "Managers upload own recordings"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Manager can view own folder
CREATE POLICY "Managers view own recordings"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- HR Admin can view workspace recordings
CREATE POLICY "HR Admin view workspace recordings"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'meeting-recordings' AND
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE (storage.foldername(name))[1]::uuid = w.owner_id
        AND public.is_hr_admin_of_workspace(w.id)
    )
  );

-- Manager can delete own recordings
CREATE POLICY "Managers delete own recordings"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
