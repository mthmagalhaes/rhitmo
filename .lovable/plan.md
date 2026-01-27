

# Plano: Correção Definitiva do Loop de Workspaces

## Contexto do Problema

O loop de criação de workspaces no frontend está mais rápido que as queries de limpeza, impedindo a aplicação da constraint UNIQUE. A solução é usar `LOCK TABLE` para bloquear completamente a tabela durante a operação.

---

## Etapa 1: Transação Atômica com Lock (Banco de Dados)

Executar o seguinte bloco SQL como uma única transação:

```sql
BEGIN;

-- 1. BLOQUEIO TOTAL
-- Impede qualquer INSERT/UPDATE até o COMMIT final
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

COMMIT;
```

### Por que isso funciona

| Passo | Ação | Efeito |
|-------|------|--------|
| LOCK TABLE | Bloqueia escrita | Requisições do frontend ficam "penduradas" |
| DELETE teams | Limpa dependências | Remove teams órfãos |
| DELETE workspaces | Remove duplicatas | Mantém apenas 1 por usuário |
| ADD CONSTRAINT | Aplica regra UNIQUE | Garante 1 workspace por owner_id |
| COMMIT | Libera lock | Requisições pendentes falham com violação de constraint |

---

## Etapa 2: Correção do Código Frontend

Após a constraint estar aplicada, precisamos corrigir os 5 arquivos que usam `.maybeSingle()` para queries de workspace. Isso evitará erros de violação de constraint no console.

### Arquivos a corrigir

1. **src/components/AppLayout.tsx** - Já parcialmente corrigido, mas precisa usar `.single()` ao invés de `.maybeSingle()`
2. **src/pages/Index.tsx** - Mudar para `.order('created_at').limit(1).single()`
3. **src/pages/MemberDetails.tsx** - Mesma correção
4. **src/hooks/usePlanLimits.ts** - Mesma correção
5. **src/components/OnboardingModal.tsx** - Mesma correção

### Padrão de correção

```typescript
// ANTES (problemático)
const { data } = await supabase
  .from('workspaces')
  .select('*')
  .eq('owner_id', user.id)
  .maybeSingle();

// DEPOIS (correto)
const { data } = await supabase
  .from('workspaces')
  .select('*')
  .eq('owner_id', user.id)
  .order('created_at', { ascending: true })
  .limit(1)
  .single();
```

---

## Resultado Esperado

Após a implementação:
- **matheus.magalhaes@fstr.co** verá seu workspace "Faster Ops" com 6 liderados
- Novos workspaces duplicados são impossíveis (constraint UNIQUE)
- Tentativas de criar duplicatas retornarão erro 23505 (unique_violation)
- Frontend tratará corretamente a busca por workspace único

---

## Notas Técnicas

A constraint UNIQUE no banco de dados é a "blindagem final" - mesmo que o código frontend tenha bugs, o banco não permitirá duplicatas. O lock temporário garante uma janela limpa para aplicar essa proteção.

