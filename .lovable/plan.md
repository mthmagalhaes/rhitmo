## Objetivo

Reorganizar o WorkspaceSwitcher (canto superior esquerdo da sidebar) para que ele se torne o ponto central de ações de "conta/organização", trazendo para dentro do dropdown:

1. **Settings / Configurações** (hoje aparece duplicado: como item no rodapé e como aba na sidebar de navegação principal — ambos continuam, mas ganham um atalho aqui).
2. **Help Center** (hoje é aba dentro de `/lider/configuracoes?tab=ajuda` — vira item de primeira classe acessível pelo seletor).
3. **Convidar membros / liderados** (hoje há um botão `setInviteOpen` espalhado em `Pessoas.tsx` e no rodapé da sidebar — centraliza no seletor, mantendo a action existente no rodapé como atalho mas removendo a duplicação visual).

Inspiração: print do Windmill — o seletor da org abre um menu com Settings, Help Center e Invite Members logo abaixo do nome do workspace.

## O que muda

### `src/components/sidebar/WorkspaceSwitcher.tsx` (refatoração principal)

- Hoje só lista workspaces para troca. Passa a renderizar o dropdown **sempre** (mesmo com 1 workspace), porque agora ele tem ações úteis além da troca.
- Estrutura do dropdown:
  - **Workspaces** (label + lista, só se `workspaces.length > 1`)
  - Separador
  - **Configurações** → navega para `/lider/configuracoes` (ou `/liderado/configuracoes` conforme persona)
  - **Central de Ajuda** → navega para `/lider/configuracoes?tab=ajuda` (rota já existe via `HelpRedirect`)
  - **Convidar membros** → abre o `BulkOnboardDialog` (apenas para persona = `leader`)
- Para abrir o dialog de convite a partir do switcher, vamos elevar o estado: o `WorkspaceSwitcher` aceitará props `onOpenInvite?` e `onOpenSettings?`, e o `AppSidebar` passa os handlers já existentes (`setInviteOpen`, `setSettingsOpen`). Isso mantém um único ponto de verdade para o dialog (instanciado em `AppSidebar`).
- Persona é resolvida lendo `useAccount` (já presente) + `resolvePersona` de `@/lib/navigation`.

### `src/components/AppSidebar.tsx`

- Passa as novas props para `<WorkspaceSwitcher onOpenInvite={() => setInviteOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />`.
- **Remove duplicação do rodapé**:
  - Remove o botão "Convidar membros" do rodapé (linhas com `setInviteOpen` no footer) — ação fica só no switcher.
  - Mantém o botão "Configurações" do rodapé (é um padrão comum ter atalho rápido ali) **OU** remove para evitar duplicidade. Recomendação: **manter** o do rodapé porque está perto do bloco de perfil; remover apenas o "Convidar". Se preferir UI mais enxuta, removemos ambos — confirmar na implementação.
  - Mantém o botão de Suporte (LifeBuoy) do rodapé.

### `src/pages/lider/Pessoas.tsx`

- Remove o botão "Convidar liderados" duplicado do header da página (linhas ~83 e ~138). A aba "Convites" continua existindo, mas o CTA principal de convite passa a viver no switcher (consistência: 1 lugar pra convidar). Mantemos o `BulkOnboardDialog` instanciado na página para a aba "Convites" funcionar, **ou** redirecionamos a aba para abrir o dialog global. Decisão: manter o dialog local da página `Pessoas` (a aba precisa dele) e apenas remover os botões soltos do header (`onInvite` no empty state e `Convidar` no header da página).
- Resultado: dentro de `/lider/pessoas` → aba Convites continua com seu fluxo; nas outras páginas (`Diário`, `Objetivos`, `Avaliações`) o usuário convida pelo switcher.

### i18n (`src/i18n/locales/{pt-BR,en,es}.json`)

- Adicionar chaves:
  - `sidebar.workspace.settings`
  - `sidebar.workspace.helpCenter`
  - `sidebar.workspace.inviteMembers`

### Memória

- Atualizar `mem://design/dashboard/onboarding-demo-visibility` ou criar nova memória curta `mem://design/sidebar/workspace-switcher-actions` documentando: "WorkspaceSwitcher concentra Settings, Help Center e Convidar Membros (padrão Windmill/Linear). Convite NÃO deve ser duplicado em páginas individuais (Diário, Objetivos, Avaliações); apenas a página /lider/pessoas mantém fluxo próprio na aba Convites."

## Layout do dropdown (referência)

```text
┌─ Workspace [name] ▾ ──────────┐
│ Workspaces                    │  (label, só se >1)
│  ✓ Faster                     │
│    Acme                       │
│ ─────────────────────────     │
│ ⚙  Configurações              │
│ ⓘ  Central de Ajuda           │
│ ➕  Convidar membros           │  (apenas leader)
└───────────────────────────────┘
```

## Detalhes técnicos

- `WorkspaceSwitcher` deixa de ter o early-return `if (!hasMultiple) return trigger` — sempre renderiza o `DropdownMenu`.
- O ícone `ChevronsUpDown` deixa de ficar com `opacity-30` quando há 1 workspace (agora há outras ações).
- Para navegação, usa `useNavigate` de `react-router-dom`.
- Para a action de convite, dispara o callback prop em vez de instanciar outro `BulkOnboardDialog` (evita duplicar dialogs no DOM).
- Persona-aware: o item "Convidar membros" só aparece para `persona === 'leader'`.

## Arquivos editados

- `src/components/sidebar/WorkspaceSwitcher.tsx` (refator)
- `src/components/AppSidebar.tsx` (passa props, remove botão "Convidar" do rodapé)
- `src/pages/lider/Pessoas.tsx` (remove botões de convite duplicados do header da página)
- `src/i18n/locales/pt-BR.json`, `en.json`, `es.json` (3 chaves novas)
- `.lovable/memory/design/sidebar/workspace-switcher-actions.md` (nova) + atualização do `index.md`

## Fora de escopo

- Não mexemos no fluxo interno do `BulkOnboardDialog`.
- Não removemos a aba "Ajuda" das Configurações (continua acessível por URL e pela navegação atual).
- Não alteramos a aba "Convites" dentro de `/lider/pessoas`.