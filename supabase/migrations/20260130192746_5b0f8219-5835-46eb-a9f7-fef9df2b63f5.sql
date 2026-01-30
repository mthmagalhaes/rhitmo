-- Adicionar coluna occurred_at com default NOW()
ALTER TABLE feedbacks 
ADD COLUMN occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migração de dados: Preencher occurred_at com created_at para registros existentes
UPDATE feedbacks 
SET occurred_at = created_at 
WHERE occurred_at IS NULL;

-- Tornar coluna NOT NULL após migração
ALTER TABLE feedbacks 
ALTER COLUMN occurred_at SET NOT NULL;