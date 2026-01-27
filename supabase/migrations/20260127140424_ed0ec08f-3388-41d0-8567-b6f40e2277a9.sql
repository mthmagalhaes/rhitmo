-- Limpeza de workspaces duplicados: manter apenas o workspace mais antigo com membros (ou o mais antigo se nenhum tem membros)
WITH primary_workspaces AS (
  SELECT DISTINCT ON (w.owner_id) 
    w.owner_id,
    w.id as workspace_id
  FROM workspaces w
  LEFT JOIN teams t ON t.workspace_id = w.id
  LEFT JOIN team_members tm ON tm.team_id = t.id
  GROUP BY w.owner_id, w.id, w.created_at
  ORDER BY w.owner_id, COUNT(tm.id) DESC, w.created_at ASC
),
-- Deletar teams dos workspaces duplicados
deleted_teams AS (
  DELETE FROM teams t
  WHERE t.workspace_id IN (
    SELECT w.id FROM workspaces w
    WHERE NOT EXISTS (
      SELECT 1 FROM primary_workspaces pw 
      WHERE pw.workspace_id = w.id
    )
  )
  RETURNING t.id
),
-- Deletar workspaces duplicados
deleted_workspaces AS (
  DELETE FROM workspaces w
  WHERE NOT EXISTS (
    SELECT 1 FROM primary_workspaces pw 
    WHERE pw.workspace_id = w.id
  )
  RETURNING w.id
)
SELECT 
  (SELECT COUNT(*) FROM deleted_teams) as teams_deleted,
  (SELECT COUNT(*) FROM deleted_workspaces) as workspaces_deleted;