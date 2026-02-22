

## Revogar EXECUTE de anon em funções SECURITY DEFINER

### Diagnóstico

Todas as 16 funções RPC do schema `public` possuem EXECUTE granted ao role `anon`. A maioria delas deveria ser acessível apenas por usuários autenticados.

### Categorização das Funções

**Grupo A -- DEVEM manter acesso anon (fluxos sem login):**
- `get_member_for_sync` -- usado no Rhitmo Sync via magic link (sem autenticação)
- `submit_rhitmo_sync` -- idem
- `submit_rhitmo_sync_v2` -- idem
- `get_invite_details` -- usado no fluxo de convite (sem autenticação)

Estas 4 funções já possuem validação interna (verificam member_id, invite_token, etc.) e são parte do design "Zero Trust" do Rhitmo Sync. Revogar anon quebraria esses fluxos.

**Grupo B -- REVOGAR anon (funções de dados sensíveis):**
- `match_feedbacks` -- busca semântica de feedbacks
- `get_all_users_with_metadata` -- lista todos os usuários (admin)
- `update_member_own_data` -- atualiza perfil do membro

**Grupo C -- REVOGAR anon (helpers de RLS e utilitários):**
- `effective_user_id`
- `is_admin`
- `check_is_admin`
- `is_workspace_owner`
- `user_owns_team`
- `user_is_linked_member`
- `workspace_is_active`
- `can_update_own_sync`
- `update_updated_at_column` (trigger)

Estas funções são usadas internamente em policies RLS e triggers. Como todas as tabelas possuem policies que exigem `authenticated`, o role anon nunca chega a avaliar essas policies na prática -- revogar é seguro.

### Migration SQL

Uma única migration que:

1. Revoga EXECUTE de `anon` nas 12 funções dos Grupos B e C
2. Garante EXECUTE para `authenticated` em todas elas
3. Adiciona verificação `auth.uid() IS NULL` nas 3 funções do Grupo B (as que são chamadas diretamente por usuários, não helpers de RLS)

As funções helper de RLS (Grupo C) não precisam da verificação `auth.uid() IS NULL` no corpo porque já são protegidas pelo contexto de execução das policies e pela revogação do grant.

### O que NAO muda

- As 4 funções do Grupo A (fluxos anon intencionais)
- Edge Functions
- Componentes de frontend
- Lógica de negócio das funções

### Detalhe Tecnico

Para as funções do Grupo B que precisam ser recriadas com a verificação, a migration usará `CREATE OR REPLACE FUNCTION` mantendo a mesma assinatura e corpo, apenas adicionando a checagem de `auth.uid()` no início.

