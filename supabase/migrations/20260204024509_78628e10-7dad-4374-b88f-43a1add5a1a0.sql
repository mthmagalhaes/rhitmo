-- Adicionar colunas para armazenar o período avaliado nas avaliações de desempenho
ALTER TABLE performance_reviews
ADD COLUMN period_start TIMESTAMPTZ,
ADD COLUMN period_end TIMESTAMPTZ;