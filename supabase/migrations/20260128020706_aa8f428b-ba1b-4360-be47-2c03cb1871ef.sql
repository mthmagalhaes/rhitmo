-- 1. BLINDAGEM DO LOOP INFINITO
-- Limpeza preventiva (não afetará dados pois não há duplicatas)
DELETE FROM teams
WHERE workspace_id NOT IN (
  SELECT DISTINCT ON (owner_id) id
  FROM workspaces
  ORDER BY owner_id, created_at ASC
);

DELETE FROM workspaces
WHERE id NOT IN (
  SELECT DISTINCT ON (owner_id) id
  FROM workspaces
  ORDER BY owner_id, created_at ASC
);

-- Aplicar constraint UNIQUE (remove se existir para evitar erro)
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_owner_id_unique;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_owner_id_unique UNIQUE (owner_id);

-- 2. COLUNAS FALTANTES
-- Adiciona suporte a Action Items (IA) nos feedbacks
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]'::jsonb;

-- Adiciona suporte a User Manual (Rhitmo Sync) nos membros
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS user_manual JSONB DEFAULT '{}'::jsonb;