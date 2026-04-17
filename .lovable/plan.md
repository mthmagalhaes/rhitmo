## Sim, o desenho ajuda muito — e ele revela exatamente o problema

Seu modelo mental tem **4 papéis**:

1. **Owner** — dono do workspace (edita tudo)
2. **HR Admin** — vê analytics de tudo do workspace
3. **Leader** — lidera 1 ou N times
4. **Liderado (Direct Report)** — pertence a 1 time, sob 1 leader

O sistema hoje tem **5 conceitos** circulando — ou seja, **1 a mais do que precisa**:


| #   | Papel atual   | Onde mora                       | Equivale a quê no seu desenho?                                          |
| --- | ------------- | ------------------------------- | ----------------------------------------------------------------------- |
| 1   | `super_admin` | enum `app_role` em `user_roles` | **Você (Rhitmo)**. Não está no desenho do cliente, é interno. ✅ Manter. |
| 2   | `support`     | enum `app_role` em `user_roles` | ❌ **Sobrando.** Não usado em lugar nenhum (0 users).                    |
| 3   | `Owner`       | `workspaces.owner_id`           | ✅ Owner do desenho.                                                     |
| 4   | `HR Admin`    | `workspaces.hr_admin_ids[]`     | ✅ HR Admin do desenho.                                                  |
| 5   | `Leader`      | `teams.leader_user_id`          | ✅ Leader do desenho.                                                    |
| 6   | `Liderado`    | `team_members.linked_user_id`   | ✅ Direct Report do desenho.                                             |


### Problemas conceituais que o desenho expõe

**Problema A — "Owner" é vinculação de propriedade, não de papel funcional.**
Hoje, quem é Owner também precisa ser cadastrado como Leader de cada time se quiser ver dados desse time (já que RLS de feedbacks usa `manager_id = auth.uid()`). Mas pelo seu desenho, **Owner = pode editar tudo do workspace**, então deveria ter visibilidade transversal automática, sem precisar virar Leader manualmente.

**Problema B — "Leader" não tem entidade própria, só um campo em `teams`.**
Não existe tabela "leaders". Um líder de múltiplos times (ex: [matheus.magalhaes@fstr.co](mailto:matheus.magalhaes@fstr.co)) é só "uma pessoa que aparece como `leader_user_id` em N linhas de `teams`". Funciona, mas não há um lugar para "perfil de líder no workspace" (ex: cargo, área, observações).

**Problema C — "support" no enum está sobrando.**
Definido no enum `app_role` mas não usado em nenhuma policy nem código. Polui a UI (filtro "Todos os papéis" pode mostrar essa opção).

**Problema D — Liderado pode existir sem leader.**
Hoje `team_members.linked_user_id` pode estar vinculado a um time cujo `leader_user_id` é NULL (time órfão). Seu desenho diz "precisa estar associado a um time E a um leader" — então deveria ter validação.

## Recomendação de simplificação

### 1. Remover `support` do enum `app_role`

Não é usado. Mantém só `super_admin`. Limpa a UI de filtros.

### 2. Formalizar a regra "Owner enxerga tudo do workspace" no RLS

Hoje, várias policies checam `is_workspace_owner()` mas algumas (como `feedbacks`) só checam `manager_id = effective_user_id()`. Resultado: Owner que não é Leader de um time não vê os feedbacks daquele time. Conforme seu desenho, isso deveria ser automático — Owner edita tudo do workspace.

**Fix**: auditar policies de `feedbacks`, `meetings`, `goals`, `development_plans` para adicionar cláusula `OR is_workspace_owner_of_member(member_id)`.

### 3. Adicionar trigger validando "liderado precisa de time + leader"

Trigger BEFORE INSERT/UPDATE em `team_members` que rejeita se `team_id` aponta para time com `leader_user_id IS NULL`.

### 4. Esclarecer hierarquia na UI do painel admin

Renomear coluna "Papéis" para mostrar a hierarquia visual do desenho:

- 🟣 Super Admin (interno Rhitmo)
- 👑 Owner (do workspace X)
- 🛡️ HR Admin (do workspace X)
- ⭐ Leader (de N times no workspace X)
- 👤 Liderado (do time Y, sob leader Z)

E remover qualquer menção a "support".

### 5. Documentar limites/funções de cada papel


| Papel           | Pode ver                                                                                                           | Pode editar                                                                          | Limites                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Super Admin** | TUDO de TODOS workspaces (exceto durante impersonate)                                                              | Configurações globais, gerenciar usuários, segmentos comerciais                      | Apenas [matheus@rhitmo.co](mailto:matheus@rhitmo.co). Não conta no plano.          |
| **Owner**       | Tudo do SEU workspace (todos times, todos liderados, todos feedbacks, todos analytics)                             | Workspace inteiro: convidar/remover membros, criar times, definir HR Admins, billing | 1 owner por workspace. Conta como 1 assento.                                       |
| **HR Admin**    | Analytics agregados do workspace, perfis comportamentais, riscos, engagement                                       | Convidar membros, gerenciar competências, ver formal reviews compartilhados          | N HR Admins por workspace (sem limite). Conta como 1 assento cada.                 |
| **Leader**      | Apenas SEUS times: feedbacks que ele criou, reuniões dele, PDIs, reviews dos liderados dele                        | Criar/editar feedbacks, reuniões, reviews, PDIs dos liderados sob sua liderança      | N times por leader. Conta como 1 assento.                                          |
| **Liderado**    | Apenas dados PRÓPRIOS: feedbacks compartilhados com ele, próprio PDI, próprio Career Compass, reviews acknowledged | Próprio PDI, próprio perfil, próprias respostas DISC, acknowledge reviews            | 1 time por liderado (no momento). Conta como 1 assento (exceto Pulse plan: 2 cap). |


## Pergunta antes de eu implementar

Pode fazer **as 5 mudanças** acima de uma vez,

Sugestão de ordem (mais crítico → menos crítico):

1. **Remover `support` do enum** (5 min, só limpeza)
2. **Validar liderado → time → leader** (trigger, 10 min, evita órfãos)
3. **Documentar matriz de papéis** (criar memory file `mem://architecture/papeis-e-permissoes`, 5 min)
4. **Auditoria RLS Owner-vê-tudo** (mais arriscado, requer testar 4-5 tabelas — talvez 30 min)
5. **Renomear UI "Papéis"** (cosmético, 10 min)

Pode aprovar tudo, ou só o subset que quiser priorizar.