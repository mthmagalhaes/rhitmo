

## Diagnóstico: RLS bloqueia leitura durante impersonate

### Causa raiz confirmada

A Yasmin tem **2 avaliações formais compartilhadas** (`shared_with_member=true`) na DB. As tabelas `feedbacks` e `performance_reviews` têm RLS para liderados ler dados próprios, mas **as policies usam `auth.uid()` (Matheus admin) em vez de `effective_user_id()` (Yasmin impersonada)**:

```sql
-- ❌ Atual: bloqueia durante impersonate
WHERE tm.linked_user_id = auth.uid()

-- ✅ Correto: respeita impersonate
WHERE tm.linked_user_id = effective_user_id()
```

A função `effective_user_id()` já existe e funciona (lê `admin_impersonation` e fallback `auth.uid()`). Só não é usada nas policies de leitura do liderado.

### Telas afetadas

Tudo que o liderado deveria ver mas está vazio durante impersonate:
- Aba **Feedbacks** (anotações compartilhadas + avaliações formais)
- Aba **Visão Geral** (banner "Nova avaliação disponível", contagem de reviews)
- Aba **Minha Carreira** (PDI / development_plans + items)
- Aba **Meu Perfil** (próprio team_members row via linked_user_id)
- **Goals** do liderado
- **Bias detections** próprias (se for líder impersonado)
- **Slack integration**, **user_preferences**, **extension_tokens**, **recall_bots** (escopo "meu")
- **leader_nudges** (se impersonar líder)
- **rhitmo_sync_notifications** (se impersonar líder)
- **kudos** (visualização no workspace do impersonado)

### Plano de correção: migration única

Recriar todas as policies SELECT/UPDATE de "dados próprios" trocando `auth.uid()` por `effective_user_id()`. Tabelas afetadas:

| Tabela | Policy |
|---|---|
| `feedbacks` | `Linked users can view shared feedbacks` |
| `performance_reviews` | `Linked members can view shared reviews` |
| `development_plans` | view/update own |
| `development_items` | view/update own |
| `goals` | `Linked members can view own goals` |
| `team_members` | `tm_read`, `tm_update` (cláusula `linked_user_id`) |
| `user_preferences` | view/update own |
| `slack_integrations` | view/update/delete own |
| `extension_tokens` | view/update own |
| `recall_bots` | view own |
| `leader_nudges` | view/dismiss |
| `rhitmo_sync_notifications` | view/update own |
| `bias_detections` | view/update (leader_id) |
| `kudos` | view in own workspace |
| `feedback_streaks` | view own |
| `pending_slack_invites` | view (leader scope) |

**NÃO mexer**:
- `admin_impersonation` (sempre `auth.uid()` real para evitar loop)
- `user_roles` (usado pra checar se admin)
- Policies INSERT/criação de auditoria (manter `auth.uid()` para registrar autor real)

### Validação pós-fix

Impersonando Yasmin (`yasmin.nobrega@fstr.co`) deve mostrar:
1. Aba Feedbacks → 2 avaliações formais (Q1/2026, Q4/2025) + qualquer nota com `visibility='shared'`
2. Aba Visão Geral → "Nova avaliação disponível" se não vista, contagem correta
3. Aba Meu Perfil → dados da Yasmin (Head CreativeOps), não do Matheus
4. Aba Minha Carreira → PDI próprio se houver

### Arquivos modificados

- 1 migration SQL (recriar ~20 policies em 16 tabelas)
- Memory update: `mem://admin/impersonation-view-mode` adicionar regra "RLS de leitura de dados próprios deve usar `effective_user_id()`"

### Escopo

Médio. Apenas SQL — sem mudanças de código TS. ~10 min. Sem risco arquitetural — `effective_user_id()` já é STABLE SECURITY DEFINER e cai pra `auth.uid()` quando não há impersonate.

