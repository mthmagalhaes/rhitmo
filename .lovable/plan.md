
## Problema

Hoje `resolvePersona` retorna **uma única persona** por usuário, com prioridade Owner/HR > Leader. Resultado:

- **Vitor** (CEO, Owner): cai em `/lider/inicio` mas só "é líder" do time C-Level. Não tem caminho claro pra ver a Faster inteira.
- **Matheus** (COO, Owner + HR Admin + Leader de Operações): mesma coisa, e ainda perde o atalho pro `/hr` quando está em modo líder.
- **Guto** (HR Admin puro): já cai em `/hr` (correto).

Falta um conceito explícito de **"modo ativo"** com troca de sidebar.

## Solução: Modo ativo + Workspace Switcher dupla persona

### Conceito

Para usuários com **dois ou mais papéis elegíveis** (Leader + Owner, Leader + HR Admin, ou os três), introduzimos um **modo ativo** persistido por sessão:

- **Modo "Minha equipe"** → sidebar atual de líder (`/lider/*`)
- **Modo "Empresa"** → sidebar de HR/Owner (`/hr/*`)

O `WorkspaceSwitcher` (canto superior esquerdo da sidebar) ganha uma seção nova **"Modo"** acima da lista de workspaces, com os dois itens e um check no atual. Um clique:

1. Atualiza o modo ativo (localStorage + estado global).
2. Redireciona para a home do modo escolhido (`/lider/inicio` ou `/hr`).
3. A sidebar se redesenha porque `resolvePersona` agora usa o modo ativo como tiebreaker.

### Default ao logar

- Default = **"Minha equipe"** (`/lider/inicio`) para qualquer usuário multi-papel — owners/HR escolhem ativamente quando querem a visão macro.
- Usuários single-role continuam exatamente como hoje (HR puro vai pra `/hr`, liderado vai pra `/liderado/*`).

### Indicação visual

- Trigger do switcher mostra um chip pequeno do modo atual ao lado do nome do workspace: `Faster · Minha equipe` ou `Faster · Empresa`.
- Substitui o badge atual `· RH` (que hoje só aparece pra HR Admin) por essa lógica unificada.

### Exemplos práticos

| Usuário | Papéis | Modo default | Pode trocar para |
|---|---|---|---|
| Vitor | Owner | Minha equipe | Empresa |
| Matheus | Owner + HR + Leader | Minha equipe | Empresa |
| Guto | HR Admin (não-owner) | Empresa (único modo) | — |
| Douglas | Leader puro | Minha equipe (único modo) | — |
| Liderado | Direct report | Liderado (único) | — |

## Mudanças técnicas

**Novo: `useActiveMode` hook** (`src/hooks/useActiveMode.ts`)
- Estado: `'leader' | 'company'`
- Persiste em `localStorage` por `userId` (key: `rhitmo:active-mode:<userId>`)
- Default `'leader'` na primeira sessão.
- Expõe `mode`, `setMode(next)`, e `availableModes` derivado de `useAccount()`.

**`src/lib/navigation.ts`**
- `resolvePersona()` ganha parâmetro opcional `activeMode`.
- Quando o usuário tem ambos (`isLeader && (isHRAdmin || isWorkspaceOwner)`), retorna `'hr_admin'` se `activeMode==='company'`, senão `'leader'`. Comportamento pra single-role usuários é idêntico ao atual.
- `getHomeRoute()` aceita o mesmo parâmetro.

**`src/components/sidebar/WorkspaceSwitcher.tsx`**
- Usa `useActiveMode()`.
- Renderiza nova seção "Modo" no topo do dropdown com dois itens só se `availableModes.length > 1`.
- Trigger mostra chip do modo atual.
- Mantém os atalhos atuais (Settings, Help Center, Convidar) — eles aparecem conforme o modo ativo já naturalmente, então sem mudança de lógica ali.

**`src/components/RoleRouteGuard.tsx`**
- Lê `activeMode` e passa pra `resolvePersona`. Assim, se Matheus em modo "company" tentar entrar em `/lider/inicio` direto pela URL, é redirecionado pra `/hr`; e vice-versa. Pra usuários single-role nada muda.

**`src/hooks/useHomeRoute.ts`**
- Mesma propagação de `activeMode`.

**`AccountContext`** — sem mudanças (continua resolvendo papéis brutos via RPC).

### Diagrama

```text
┌──────────────────────────────────────┐
│ [🏢] Faster · Minha equipe    [⌄]    │ ← trigger
└──────────────────────────────────────┘
        │ clica
        ▼
┌──────────────────────────────────────┐
│ MODO                                 │
│  ✓ Minha equipe   (sidebar líder)    │
│    Empresa        (sidebar /hr)      │
│ ─────────────────────────────────────│
│ WORKSPACES                           │
│  ✓ Faster                            │
│    Outro workspace                   │
│ ─────────────────────────────────────│
│ Visão do workspace · Times · Pessoas │ (atalhos atuais)
│ Configurações · Central de Ajuda     │
└──────────────────────────────────────┘
```

## O que NÃO muda nesta fase

- Estrutura de dados (workspaces/teams/papéis) — já consolidada na Fase 1.
- Páginas `/hr/*` e `/lider/*` em si — só o que muda é qual conjunto a sidebar mostra.
- Lógica de impersonation, RLS, AccountContext.

## Memory a salvar após approval

`mem://design/sidebar/active-mode-switcher` — Owners/HR que também são líderes alternam entre "Minha equipe" (/lider) e "Empresa" (/hr) via WorkspaceSwitcher; default = Minha equipe; persistido em localStorage por userId; aplicado em `resolvePersona` + `RoleRouteGuard`.

## Próximas fases (não inclusas aqui — confirmar depois)

- Fase 2: Admin reformulado (org chart, "O que falta", filtros).
- Fase 3: Wizard de nova empresa.
- Fase 4: Health-score por empresa.
