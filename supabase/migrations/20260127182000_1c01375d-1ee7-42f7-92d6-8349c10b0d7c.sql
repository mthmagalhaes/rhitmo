-- Transação Atômica com Lock para correção definitiva

-- 1. BLOQUEIO TOTAL - Impede qualquer INSERT/UPDATE até o COMMIT final
LOCK TABLE workspaces IN ACCESS EXCLUSIVE MODE;

-- 2. Deletar teams dos workspaces duplicados do Matheus (Faster)
DELETE FROM teams 
WHERE workspace_id IN (
  SELECT id FROM workspaces 
  WHERE owner_id = '79a6f679-7920-42e2-9727-1fcee6edbf5a'
  AND id != '27ee8977-d538-482f-a9a7-7a4363b89e5e'
);

-- 3. Deletar workspaces duplicados do Matheus (manter apenas Faster Ops)
DELETE FROM workspaces 
WHERE owner_id = '79a6f679-7920-42e2-9727-1fcee6edbf5a'
AND id != '27ee8977-d538-482f-a9a7-7a4363b89e5e';

-- 4. Limpeza geral para outros usuários (prevenção)
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

-- 5. Aplicar constraint UNIQUE (com tabela limpa e bloqueada)
ALTER TABLE workspaces 
ADD CONSTRAINT workspaces_owner_id_unique UNIQUE (owner_id);