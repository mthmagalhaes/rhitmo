---
name: Sidebar Active Mode Switcher
description: Multi-role users (Owner/HR + Leader) toggle between "Minha equipe" (/lider) and "Empresa" (/hr) via WorkspaceSwitcher; default = leader; persisted per-user in localStorage
type: feature
---

Para usuários com **dois ou mais papéis** (Owner + Leader, HR + Owner + Leader), introduzimos um conceito explícito de **modo ativo**:

- **`'leader'`** → sidebar `/lider/*`, home `/lider/inicio`
- **`'company'`** → sidebar `/hr/*`, home `/hr`

## Componentes

- **`src/hooks/useActiveMode.ts`** — hook único de fonte da verdade. Persiste em `localStorage` com chave `rhitmo:active-mode:<userId>`. Expõe `mode`, `setMode`, `availableModes`, `canSwitch`.
- **`src/lib/navigation.ts`** — `resolvePersona` e `getHomeRoute` aceitam `activeMode?: ActiveMode` em `PersonaOpts`. Pra single-role nada muda; pra multi-role o modo determina a persona efetiva.
- **`src/components/sidebar/WorkspaceSwitcher.tsx`** — quando `canSwitch=true`, renderiza seção "Modo" no topo do dropdown (Minha equipe / Empresa) e mostra chip do modo atual ao lado do nome do workspace. Trocar o modo também navega pra home correspondente.
- **`RoleRouteGuard`, `DirectReportGuard`, `useHomeRoute`, `AppSidebar`** — todos lêem `useActiveMode()` e propagam pra `resolvePersona`/`getHomeRoute`.

## Regras

- **Default** = `'leader'` na primeira sessão (multi-role users escolhem a visão macro ativamente).
- **`canSeeLeader = isTeamLeader`** — vem direto do RPC `get_account_context.is_team_leader`.
- **`canSeeCompany = isHRAdmin || isWorkspaceOwner`**.
- **`resolvePersona`** usa `isTeamLeader` (não `isLeader`) para decidir se tem acesso de líder real. Multi-role com `activeMode='leader'` → persona `leader`; `'company'` → `hr_admin`.
- **AppSidebar** escolhe o menu pela `persona` (que segue `activeMode`), nunca pelo `location.pathname`. Um efeito sincroniza modo ↔ URL: cair em `/hr/*` força modo `company`; cair em `/lider/*` força `leader`. Evita o estado "chip Minha equipe + tela /hr/members".
- **WorkspaceSwitcher** e os botões auxiliares chamam `setMode(...)` antes de `navigate(...)` para manter modo e rota sempre alinhados.
- O modo **nunca afeta RLS ou data scoping** — é puramente camada de navegação/UX.
