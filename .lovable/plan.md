

## Plano: Superpoderes do Super Admin + Sistema de Multi-Cap para Usuários

### Contexto atual

- `matheus@rhitmo.co` já é `super_admin` e tem acesso ao painel `/admin`
- `matheus_hr@rhitmo.co` mantém-se como está (HR Admin + Owner, sem acesso ao `/admin`)
- O painel admin atual tem: Visão Geral, Suporte, Export, Usuários, Acessos, Estrutura
- A aba "Usuários" mostra apenas nome, cargo, telefone e status — **sem visibilidade de papéis múltiplos**
- A aba "Estrutura" permite CRUD de workspaces/times/membros mas **não mostra conceito de "cliente"** nem tags de multi-cap
- Caso real: Yasmin (`yasmin.nobrega@fstr.co`) é liderada de `matheus.magalhaes@fstr.co` (linked_member) mas em breve será líder dos seus próprios liderados

### O que será feito

**1. Conceito de "Cliente" na Estrutura**
- Na aba Estrutura, agrupar workspaces por "cliente" (o owner define o cliente)
- Adicionar campo visual de "empresa/cliente" ao criar/editar workspace (ex: "Faster Ops" como cliente, com múltiplos workspaces potenciais)
- Por ora, o workspace name funciona como identificador de cliente — sem nova tabela, apenas agrupamento visual pelo `owner_id`

**2. Multi-Cap Tags no AdminUsers**
- Para cada usuário na lista, mostrar **badges empilhados** indicando todos os "chapéus":
  - 🏢 **Owner** — se é `owner_id` de algum workspace
  - 🛡️ **HR Admin** — se está em `hr_admin_ids` de algum workspace  
  - 👑 **Líder** — se é `leader_user_id` de algum time
  - 👤 **Liderado** — se tem `linked_user_id` em `team_members`
  - ⚙️ **Super Admin** — se tem role `super_admin`
- Cada badge mostra o contexto (ex: "Líder @ Faster Ops", "Liderada @ Business Ops")
- Isso resolve o caso Yasmin: aparecerá como "Liderada @ Business Ops" hoje, e quando virar líder, ganhará badge "Líder @ [time]"

**3. Enriquecer AdminUsers com ações de gestão**
- Adicionar botão "Editar papéis" por usuário: promover a líder, vincular como liderado, atribuir HR admin
- Adicionar filtro por "cap": mostrar apenas Leaders, apenas Liderados, apenas HR Admins, etc.
- Adicionar busca por nome/email

**4. Configuração de owner ao criar workspace (Estrutura)**
- Atualmente, `handleSaveWorkspace` usa o admin logado como owner — incorreto para criar workspaces de clientes
- Alterar para permitir selecionar qualquer usuário como owner do workspace
- Adicionar campo para designar HR Admin(s) no momento da criação

### Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/components/admin/AdminUsers.tsx` | Adicionar query de multi-cap (workspaces, teams, team_members), badges de papéis, filtros, busca |
| `src/components/admin/AdminStructure.tsx` | Corrigir criação de workspace (owner selecionável), campo HR admin, agrupamento por cliente |
| Nova RPC: `get_user_caps` | Função SQL que retorna todos os "chapéus" de cada usuário (owner_of, hr_admin_of, leader_of, member_of) em uma query otimizada |

### Detalhes técnicos

A nova RPC `get_user_caps` consolidará em uma única query:
```text
SELECT u.id, u.email,
  array de workspaces onde é owner,
  array de workspaces onde é hr_admin,
  array de times onde é leader,
  array de team_members onde é linked_user
FROM auth.users u
-- joins com workspaces, teams, team_members
```

Isso evita N+1 queries no frontend e garante que o painel admin carregue rápido mesmo com dezenas de usuários.

### Fora de escopo (por agora)
- Analytics cross-workspace (será uma fase seguinte)
- Nova tabela de "clientes" — workspace name já serve como identificador

