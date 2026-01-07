-- ========================================
-- RAG: Embeddings para Feedbacks
-- ========================================

-- 1. Ativar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Adicionar coluna de embedding na tabela feedbacks
ALTER TABLE public.feedbacks
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Criar índice HNSW para buscas vetoriais ultra-rápidas
CREATE INDEX IF NOT EXISTS feedbacks_embedding_hnsw_idx 
ON public.feedbacks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Criar função RPC para busca semântica
CREATE OR REPLACE FUNCTION public.match_feedbacks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_member_id uuid DEFAULT NULL,
  filter_workspace_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  member_id uuid,
  content text,
  summary text,
  type text,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.member_id,
    f.content,
    f.summary,
    f.type,
    f.created_at,
    (1 - (f.embedding <=> query_embedding))::float AS similarity
  FROM public.feedbacks f
  JOIN public.team_members tm ON tm.id = f.member_id
  JOIN public.teams t ON t.id = tm.team_id
  JOIN public.workspaces w ON w.id = t.workspace_id
  WHERE 
    f.embedding IS NOT NULL
    AND (filter_member_id IS NULL OR f.member_id = filter_member_id)
    AND (filter_workspace_id IS NULL OR w.id = filter_workspace_id)
    AND (1 - (f.embedding <=> query_embedding)) > match_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;