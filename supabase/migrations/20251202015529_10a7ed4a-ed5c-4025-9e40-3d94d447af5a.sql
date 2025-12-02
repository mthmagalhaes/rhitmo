-- Add UNIQUE constraint to prevent duplicate team names within the same workspace
ALTER TABLE teams 
ADD CONSTRAINT teams_workspace_id_name_unique 
UNIQUE (workspace_id, name);