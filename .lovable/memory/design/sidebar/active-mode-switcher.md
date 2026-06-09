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
- **Pure HR Admin** (HR + não-Owner): só vê modo `'company'` — continua single-role como antes.
- **Liderado puro**: não afetado, segue persona `'direct_report'`.
- O modo **nunca afeta RLS ou data scoping** — é puramente camada de navegação/UX.
