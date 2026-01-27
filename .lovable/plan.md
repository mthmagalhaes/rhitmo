

## Plano: Aplicar Constraint UNIQUE no owner_id

### Situação Atual

| Métrica | Valor |
|---------|-------|
| Total de Workspaces | 5 |
| Owners Únicos | 5 |
| Duplicatas | 0 |
| Constraint UNIQUE | Não existe |

O banco está limpo, sem duplicatas. Podemos aplicar a constraint diretamente.

---

### SQL a Executar

Como não há duplicatas, o SQL simplificado será:

```sql
-- Aplicar constraint UNIQUE para prevenir duplicatas futuras
ALTER TABLE workspaces 
ADD CONSTRAINT workspaces_owner_id_unique UNIQUE (owner_id);
```

A limpeza preventiva de teams e workspaces será incluída por segurança, mas não afetará nenhum dado (pois não há duplicatas).

---

### Execução

Vou usar o migration tool para executar o bloco SQL completo que você forneceu:

```sql
BEGIN;

-- 1. Limpeza Preventiva de Teams em Workspaces Duplicados
DELETE FROM teams
WHERE workspace_id NOT IN (
  SELECT DISTINCT ON (owner_id) id
  FROM workspaces
  ORDER BY owner_id, created_at ASC
);

-- 2. Limpeza Preventiva de Workspaces Duplicados
DELETE FROM workspaces
WHERE id NOT IN (
  SELECT DISTINCT ON (owner_id) id
  FROM workspaces
  ORDER BY owner_id, created_at ASC
);

-- 3. APLICAÇÃO DA TRAVA (Blindagem)
ALTER TABLE workspaces
ADD CONSTRAINT workspaces_owner_id_unique UNIQUE (owner_id);

COMMIT;
```

---

### Resultado Esperado

| Item | Status |
|------|--------|
| Teams deletados | 0 (não há duplicatas) |
| Workspaces deletados | 0 (não há duplicatas) |
| Constraint aplicada | `workspaces_owner_id_unique` |

---

### Benefício

Após a aplicação, qualquer tentativa de criar um segundo workspace para o mesmo `owner_id` resultará em erro de constraint violation, impedindo fisicamente o bug do loop de duplicação.

---

### Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Adicionar constraint UNIQUE em `workspaces.owner_id` |

