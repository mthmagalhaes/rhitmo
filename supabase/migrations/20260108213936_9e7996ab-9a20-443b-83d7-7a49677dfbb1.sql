-- Criar bucket para anexos do chat mentor
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true);

-- RLS: Usuários autenticados podem fazer upload de seus próprios arquivos
CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- RLS: Qualquer um pode ler (bucket público para GPT Vision usar a URL)
CREATE POLICY "Public read for attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- RLS: Usuários podem deletar arquivos (baseado no path que começa com seu user_id)
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);