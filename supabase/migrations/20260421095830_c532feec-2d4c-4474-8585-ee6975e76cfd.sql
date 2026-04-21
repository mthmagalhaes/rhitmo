-- Bucket privado para PDFs mensais
INSERT INTO storage.buckets (id, name, public)
VALUES ('monthly-reports', 'monthly-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Service role (edge function) pode tudo
CREATE POLICY "Service role manages monthly reports"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'monthly-reports')
WITH CHECK (bucket_id = 'monthly-reports');

-- HR Admins e workspace owners podem ler PDFs do próprio workspace
-- Path convention: <workspace_id>/<filename>.pdf
CREATE POLICY "HR admins read own workspace reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'monthly-reports'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id::text = (storage.foldername(name))[1]
      AND (
        w.owner_id = auth.uid()
        OR auth.uid() = ANY (COALESCE(w.hr_admin_ids, '{}'::uuid[]))
      )
  )
);
