

## Análise: RLS Hardening - Status Atual

### Conclusão Principal

**As políticas RLS já estão implementadas corretamente.** O SQL proposto pode causar erros porque tenta dropar políticas que não existem e substituiria a função `effective_user_id()` (que suporta admin impersonation) por `auth.uid()` direto.

---

### Estado Atual das Políticas (Já Seguras)

| Tabela | Política | Isolamento |
|--------|----------|------------|
| `workspaces` | `effective_user_id() = owner_id` | Cada usuário só vê seu workspace |
| `teams` | JOIN com workspace + `owner_id = effective_user_id()` | Isolado via hierarquia |
| `team_members` | JOIN com teams + workspace + `owner_id = effective_user_id()` | Isolado via hierarquia |
| `feedbacks` | `manager_id = effective_user_id()` + check workspace ativo | Dupla verificação |
| `waitlist_leads` | SELECT/UPDATE/DELETE: `is_admin() = true` | Apenas super_admin acessa |

---

### Warnings do Linter

**WARN 1: RLS Policy Always True**
- Política: `Anyone can submit to waitlist` (INSERT com `WITH CHECK (true)`)
- Status: **INTENCIONAL** - Permite submissão pública de leads na landing page
- Não deve ser alterada

**WARN 2: Leaked Password Protection Disabled**
- Ação necessária: Habilitar manualmente no dashboard de autenticação do backend
- Não é resolvido via SQL

---

### Por que NÃO executar o SQL proposto

1. **Políticas inexistentes**: `"Enable read access for all users"`, `"Users can view teams"`, `"Users can view members"`, `"Users can manage feedbacks"` já foram removidas em migrações anteriores - tentará dropar o que não existe

2. **Quebra de impersonation**: Trocar `effective_user_id()` por `auth.uid()` quebraria a funcionalidade de admin impersonation (tabela `admin_impersonation`)

3. **Waitlist já protegida**: A proposta usa `auth.role() = 'service_role'` mas já existe `is_admin() = true` que é mais apropriado

---

### Recomendação

Nenhuma alteração de RLS é necessária. As políticas atuais já garantem:

- Isolamento total entre workspaces (Cross-Tenant Isolation)
- Apenas o owner_id do workspace acessa seus dados
- Suporte a admin impersonation via `effective_user_id()`
- Waitlist pública para INSERT, restrita para leitura

---

### Seção Técnica

**Única ação pendente (manual):**
Habilitar "Leaked Password Protection" nas configurações de autenticação do backend. Isso não é feito via migration SQL.

**Verificação das políticas atuais:**
```sql
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Função `effective_user_id()` (já implementada):**
```sql
-- Retorna o ID do usuário impersonado (se admin) ou auth.uid()
CREATE FUNCTION public.effective_user_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT impersonated_user_id 
     FROM public.admin_impersonation 
     WHERE admin_user_id = auth.uid()),
    auth.uid()
  )
$$;
```

**Conclusão:** O sistema já está protegido. Executar o SQL proposto causaria erros e potencialmente quebraria funcionalidades existentes.

