---
name: Papéis e permissões — modelo definitivo
description: Hierarquia de 5 papéis (Super Admin, Owner, HR Admin, Leader, Liderado), onde cada um mora no schema, o que cada um pode ver/editar e seus limites
type: feature
---

A plataforma opera com **exatamente 5 papéis**, refletindo a estrutura conceitual do cliente (Workspace → HR Admins → Leaders → Times → Liderados). O role `support` foi removido do enum `app_role` (não era usado). Apenas `super_admin` permanece como enum de privilégio interno.

## Onde cada papel mora no schema

| Papel | Storage | Identificador |
|---|---|---|
| **Super Admin** | `user_roles.role = 'super_admin'` | Apenas `matheus@rhitmo.co`. Conceito interno Rhitmo. |
| **Owner** | `workspaces.owner_id` | 1 owner por workspace. |
| **HR Admin** | `workspaces.hr_admin_ids[]` (array) | N HR Admins por workspace. |
| **Leader** | `teams.leader_user_id` | Mesma pessoa pode liderar N times (aparece em N rows). |
| **Liderado** | `team_members.linked_user_id` | 1 row por vínculo time↔usuário. |

## Matriz de permissões

| Papel | Pode ver | Pode editar | Limites |
|---|---|---|---|
| **Super Admin** | TUDO de TODOS workspaces (exceto durante impersonate, quando RLS aplica como o usuário alvo) | Configurações globais, gerenciar usuários, segmentos comerciais, billing global | Apenas `matheus@rhitmo.co`. NÃO conta no plano de ninguém. |
| **Owner** | Tudo do SEU workspace (todos times, todos liderados, todos feedbacks/reuniões/PDIs/reviews via RLS `is_workspace_owner_of_member`) | Workspace inteiro: convidar/remover membros, criar times, definir HR Admins, billing | 1 owner por workspace. Conta como 1 assento. |
| **HR Admin** | Analytics agregados do workspace (`get_hr_*` RPCs), perfis comportamentais, riscos, engagement, formal reviews compartilhados | Convidar membros, gerenciar competências (frameworks/job_roles) | N HR Admins por workspace. Conta como 1 assento cada. |
| **Leader** | Apenas SEUS times: feedbacks que ele criou (`manager_id`), reuniões dele, PDIs e reviews dos liderados sob sua liderança | Criar/editar feedbacks, reuniões, reviews, PDIs apenas dos liderados em times onde ele é `leader_user_id` | N times por leader. Conta como 1 assento. |
| **Liderado** | Apenas dados PRÓPRIOS: feedbacks com `visibility='shared'`, próprio PDI, próprio Career Compass, reviews com `shared_with_member=true` | Próprio PDI, próprio perfil, próprias respostas DISC/Sync, acknowledge reviews | 1 time por liderado (no momento). Conta como 1 assento (Pulse plan: cap 2 liderados). |

## Regras estruturais garantidas no banco

1. **Liderado precisa de leader** — trigger `enforce_member_team_has_leader` em `team_members` rejeita inserção/update se o `team_id` aponta para time com `leader_user_id IS NULL`. Aplica apenas quando `linked_user_id` está sendo definido (placeholders pendentes podem existir livres).

2. **Owner enxerga tudo do workspace** — políticas SELECT em `feedbacks`, `meeting_transcripts`, `goals`, `development_plans`, `development_items`, `performance_reviews` foram estendidas com `OR is_workspace_owner_of_member(member_id)`. Owner não precisa ser cadastrado como Leader de cada time para visualizar.

3. **Impersonate respeita RLS do alvo** — `is_admin()` retorna `false` durante impersonação ativa, fazendo o super_admin perder privilégios e enxergar exatamente como o usuário impersonado.

## UI

- Tabela `AdminUsers.tsx` exibe a coluna **"Hierarquia"** (antes "Papéis") com badges coloridos seguindo a ordem do modelo: Super Admin (âmbar) → Owner (violeta) → HR (azul) → Líder (esmeralda) → Liderado (céu).
- Filtro de papéis no header do admin segue a mesma ordem hierárquica.
