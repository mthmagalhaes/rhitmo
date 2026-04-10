

## Análise Completa: O que aconteceu, o que perdemos e como prevenir

### Cronologia do Incidente

**10 de Abril ~04:20 — Migração grande (Phase 1-16)**
A migração `20260410042019` adicionou `leader_user_id` à tabela `teams` e reescreveu todas as políticas RLS. Na Phase 11, criou esta política em `workspaces`:

```text
CREATE POLICY "Leaders can view workspace" ON workspaces FOR SELECT
USING (
  EXISTS (SELECT 1 FROM teams t WHERE t.workspace_id = workspaces.id AND t.leader_user_id = ...)
);
```

Essa política consulta `teams` dentro de uma política de `workspaces`. Mas as políticas de `teams` já consultavam `workspaces` para verificar `w.owner_id`. Resultado: **recursão infinita entre as RLS de `workspaces` ↔ `teams`**.

**10 de Abril ~04:24 — Migração de admin**
A migração `20260410042424` adicionou políticas `FOR ALL` de admin nas três tabelas — inofensiva, mas não corrigiu a recursão.

**10 de Abril ~13:48 — Tentativas de correção**
Várias migrações adicionais tentaram corrigir (limpar emails de team_members, reescrever policies) mas o problema fundamental persistiu.

**10 de Abril ~19:41 — Fix de RLS com SECURITY DEFINER**
A migração `20260410194148` finalmente substituiu todas as políticas recursivas por 5 funções `SECURITY DEFINER` (`rls_check_workspace_access`, `rls_check_team_read_access`, etc.) que quebram a recursão. **Esta migração está ativa e funcionando corretamente no banco.**

**Frontend revertido** para antes das tentativas de hotfix, mas as migrações de banco (que corrigiram a recursão) continuam aplicadas.

---

### Estado Atual — O que está intacto

| Item | Status |
|------|--------|
| 215 feedbacks do Matheus | OK |
| 5 times (Business Ops, CreativeOps, Customer Success, Expansão, People) | OK |
| 6 membros distribuídos nos times | OK |
| Workspace "Faster Ops" | OK |
| Funções RLS anti-recursão | Ativas e funcionando |

**Nenhum dado foi perdido.**

---

### O que foi perdido no rollback do frontend

O rollback de frontend descartou as edições de emergência feitas nos arquivos:
- `AppLayout.tsx` — guard contra `workspaceError` (bloquear onboarding quando RLS falha)
- `useLinkedMember.ts` — verificação extra de sessão
- `Index.tsx` — verificação de sessão antes de queries

Essas mudanças eram **defensivas** mas não essenciais agora que a recursão de RLS foi corrigida no banco. O frontend atual (pré-hotfix) funciona porque as políticas RLS do banco já não entram em recursão.

---

### Causa Raiz e Como Prevenir

**Causa raiz**: Políticas RLS com dependências circulares entre tabelas.

```text
workspaces SELECT → consulta teams (para verificar leader)
teams SELECT     → consulta workspaces (para verificar owner)
→ Loop infinito
```

**O fix aplicado** (funções `SECURITY DEFINER` com `LANGUAGE plpgsql`) é correto porque:
1. `SECURITY DEFINER` + `plpgsql` impede que o Postgres faça inlining da função dentro da política, quebrando a recursão
2. Cada função acessa as tabelas diretamente, sem passar pelas RLS delas

### Plano de Blindagem (5 ações)

1. **Reaplicar os guards de frontend** — Voltar a tratar `workspaceError` como bloqueio real no `AppLayout.tsx`. Se RLS falhar por qualquer motivo, mostrar loading/erro, nunca o modal de onboarding.

2. **Regra arquitetural para migrações RLS** — Toda nova política RLS que precise consultar outra tabela DEVE usar uma função `SECURITY DEFINER plpgsql`. Nunca subqueries diretas entre `workspaces ↔ teams ↔ team_members`.

3. **Teste automatizado de recursão** — Adicionar um health-check SQL simples que pode ser executado após cada migração:
```sql
SELECT id FROM workspaces LIMIT 1;
SELECT id FROM teams LIMIT 1;
SELECT id FROM team_members LIMIT 1;
```
Se qualquer um falhar com "infinite recursion", a migração deve ser revertida.

4. **Contexto unificado de conta** — Criar um hook/contexto único (`useAccountContext`) que resolve workspace + role + linkedMember uma vez e propaga para todos os consumidores. Isso elimina o problema de cada componente resolver independentemente e chegar a conclusões diferentes.

5. **Limpar contas Matheus legadas** — Com segurança, agora que o mapeamento de dados está claro, neutralizar as contas auth antigas que não possuem dados mas podem causar conflito de auto-link.

### Arquivos a ajustar

- `src/components/AppLayout.tsx` — reaplicar guard de `workspaceError`
- `src/hooks/useUserRole.ts` — verificação de sessão antes de queries RLS
- `src/hooks/useLinkedMember.ts` — verificação de sessão antes de queries RLS
- Novo: `src/contexts/AccountContext.tsx` — contexto unificado
- Nova migração: limpeza segura de contas legadas

