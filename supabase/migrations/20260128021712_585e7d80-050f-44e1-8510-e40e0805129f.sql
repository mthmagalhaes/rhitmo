-- Criar bucket privado para backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-backups', 'data-backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Apenas dono do workspace pode fazer upload
CREATE POLICY "Owners can upload backups"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'data-backups'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Apenas dono pode fazer download
CREATE POLICY "Owners can download backups"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'data-backups'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Apenas dono pode deletar (para cleanup futuro)
CREATE POLICY "Owners can delete backups"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'data-backups'
  AND (storage.foldername(name))[1] = auth.uid()::text
);