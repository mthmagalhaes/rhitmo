

## Plano: Sincronizar Banco de Dados com Frontend Atual

### Diagnóstico Completo

| Componente | Estado no Banco | Ação |
|------------|-----------------|------|
| Constraint UNIQUE `workspaces.owner_id` | Não existe | **Criar** |
| Duplicatas de workspaces | 0 encontradas | Limpeza preventiva mantida |
| Tabela `goals` | Já existe (status como TEXT) | Nenhuma |
| RLS em `goals` | 4 políticas completas | Nenhuma |
| Coluna `feedbacks.action_items` | Não existe | **Criar** |
| Coluna `team_members.user_manual` | Não existe | **Criar** |
| ENUMs `goal_status`/`goal_type` | Não existem | **Ignorar** (frontend usa TEXT) |

---

### SQL Simplificado a Executar

O SQL original será ajustado para evitar erros e conflitos:

```sql
BEGIN;

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

COMMIT;
```

---

### O Que Foi Removido do SQL Original

| Item | Motivo |
|------|--------|
| Criação da tabela `goals` | Já existe no banco |
| Criação dos ENUMs `goal_status`/`goal_type` | Frontend usa TEXT, não ENUM |
| Criação de políticas RLS em `goals` | 4 políticas já existem |
| `ALTER TABLE goals ENABLE ROW LEVEL SECURITY` | Já está habilitado |

---

### Resultado Esperado

| Ação | Efeito |
|------|--------|
| Constraint UNIQUE aplicada | Impede fisicamente workspaces duplicados |
| Coluna `action_items` criada | Frontend pode salvar action items da IA |
| Coluna `user_manual` criada | Frontend pode salvar dados do Rhitmo Sync |

---

### Seção Técnica

**Migration Tool**: Será usado para executar o SQL em uma transação atômica.

**Arquivos impactados após migration**:
- `src/integrations/supabase/types.ts` - Será atualizado automaticamente com as novas colunas

**Verificação pós-execução**:
```sql
-- Confirmar constraint
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'workspaces' AND constraint_type = 'UNIQUE';

-- Confirmar colunas
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'feedbacks' AND column_name = 'action_items';
```

