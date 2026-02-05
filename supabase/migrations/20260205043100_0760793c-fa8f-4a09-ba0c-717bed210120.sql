-- Add title column to feedbacks table for Smart Context feature
ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS title TEXT NULL;

COMMENT ON COLUMN public.feedbacks.title IS 'Título executivo gerado por IA ou inserido manualmente';