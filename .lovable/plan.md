

## Análise: Bloqueio de Acesso Anônimo

### Conclusão Principal

**O acesso anônimo já está bloqueado na prática** - as políticas RLS existentes usam `effective_user_id()` que retorna NULL para usuários anônimos, e `NULL = owner_id` sempre avalia como FALSE em SQL. Entretanto, adicionar políticas explícitas de DENY para `anon` é uma boa prática de "defense in depth".

---

### Análise Técnica do Estado Atual

| Aspecto | Status |
|---------|--------|
| Grants de tabela para `anon` | SIM - `anon=arwdDxtm` (todas permissões) |
| RLS habilitado | SIM |
| Políticas verificam auth | SIM - via `effective_user_id()` |
| `effective_user_id()` para anon | Retorna NULL |
| NULL = owner_id | Sempre FALSE (bloqueia acesso) |

**Resultado**: Mesmo com grants, RLS bloqueia acesso anônimo porque nenhuma política retorna TRUE para NULL.

---

### Problemas com o SQL Proposto

O SQL proposto tem um problema técnico:

```sql
-- PROBLEMA: Criar política PERMISSIVE com USING (false) não bloqueia
CREATE POLICY "Deny anonymous select on team_members" 
ON team_members FOR SELECT TO anon USING (false);
```

Em PostgreSQL, políticas são **PERMISSIVE por default**. Múltiplas políticas permissivas funcionam como OR - se qualquer uma for TRUE, o acesso é permitido. Adicionar uma política que retorna FALSE não altera o comportamento porque as outras políticas continuam permitindo acesso para authenticated users.

---

### SQL Corrigido (Se Desejar Defesa em Profundidade)

Para bloquear explicitamente anon, precisamos **REVOGAR os grants** em vez de adicionar políticas:

```sql
BEGIN;

-- Opção 1: Revogar grants diretos para anon (mais seguro)
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.team_members FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.feedbacks FROM anon;

-- As funções RPC com SECURITY DEFINER continuarão funcionando
-- pois executam como o owner da função (postgres), não como anon

COMMIT;
```

---

### Verificação de Impacto no Rhitmo Sync

| Funcionalidade | Usa tabela direta? | Continuará funcionando? |
|----------------|-------------------|------------------------|
| `get_member_for_sync` | Não - é RPC SECURITY DEFINER | SIM |
| `submit_rhitmo_sync` | Não - é RPC SECURITY DEFINER | SIM |
| Loading member data | Via RPC | SIM |
| Saving work_style_data | Via RPC | SIM |

**Conclusão**: O Rhitmo Sync não será afetado porque usa exclusivamente funções RPC com SECURITY DEFINER.

---

### Recomendação

**Opção A**: Não fazer nada - a segurança já está garantida via RLS.

**Opção B**: Aplicar defense in depth revogando grants para anon:

```sql
BEGIN;

-- Revogar acesso direto do role anon às tabelas sensíveis
REVOKE ALL ON public.team_members FROM anon;
REVOKE ALL ON public.feedbacks FROM anon;
REVOKE ALL ON public.workspaces FROM anon;
REVOKE ALL ON public.teams FROM anon;
REVOKE ALL ON public.goals FROM anon;
REVOKE ALL ON public.performance_reviews FROM anon;
REVOKE ALL ON public.meeting_transcripts FROM anon;
REVOKE ALL ON public.mentor_messages FROM anon;
REVOKE ALL ON public.chat_threads FROM anon;

-- Manter acesso para waitlist_leads (INSERT público intencional)
-- Já está restrito por RLS para SELECT

COMMIT;
```

---

### Resumo das Alterações Propostas

| Ação | Arquivo/Local | Descrição |
|------|--------------|-----------|
| REVOKE grants | Migration SQL | Remover permissões diretas do role `anon` em tabelas sensíveis |
| Manter RPC | Sem alteração | Funções SECURITY DEFINER continuam funcionando normalmente |
| Validar | Teste manual | Acessar `/sync/:memberId` para confirmar que Rhitmo Sync funciona |

---

### Seção Técnica

**Por que REVOKE em vez de política DENY?**

```text
┌─────────────────────────────────────────────────────────────┐
│                     Camadas de Segurança                    │
├─────────────────────────────────────────────────────────────┤
│  1. GRANT/REVOKE  →  Permissões base (porta de entrada)     │
│  2. RLS Policies  →  Filtros por linha (quem vê o quê)      │
│  3. App Logic     →  Validações adicionais no código        │
└─────────────────────────────────────────────────────────────┘

REVOKE bloqueia na camada 1 - nem chega a avaliar RLS.
Política DENY com USING(false) + PERMISSIVE não funciona como esperado.
```

**Teste de validação pós-aplicação**:
```sql
-- Verificar que grants foram removidos
SELECT 
  relname,
  relacl::text 
FROM pg_class 
WHERE relnamespace = 'public'::regnamespace 
  AND relname = 'team_members';

-- Esperado: Não conter 'anon=' no resultado
```

