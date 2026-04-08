-- Drop insecure policies
DROP POLICY IF EXISTS "Public read for attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;

-- Owner-scoped read
CREATE POLICY "Users can read own attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Owner-scoped upload
CREATE POLICY "Users can upload own attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);