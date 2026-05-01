---
name: Workspace Switcher Actions
description: Sidebar tem UM ponto de entrada por ação — WorkspaceSwitcher concentra ações da org (Settings, Ajuda, Convidar); Configurações NUNCA aparece na nav principal; avatar abre perfil pessoal
type: design
---

## Regra mestra: zero duplicação de pontos de entrada

Cada ação do sidebar tem UM lugar canônico. Atalhos só são justificados quando economizam muitos cliques (cmd+K, Mentor persistente).

## Ações da organização → `WorkspaceSwitcher` (topo da sidebar)

Dropdown sempre renderizado:
1. **Workspaces** (lista, só aparece se houver >1)
2. **Configurações** → `/lider/configuracoes` (ou `/liderado/configuracoes`)
3. **Central de Ajuda** → `…/configuracoes?tab=ajuda`
4. **Convidar membros** → abre `NewMemberDialog` (formulário **individual** de 1 liderado: nome, cargo, e-mail, time, opção de enviar convite DISC). Mesmo componente do "Novo Membro" do dashboard e do "Novo liderado" da `MemberMasterList`. Só persona `leader`. **NÃO** é o bulk onboarding — esse continua disponível só para o RH Admin via `/admin` (`AdminStructure`) e dentro da aba "Convites" em `/lider/pessoas`.

`NewMemberDialog` é instanciado uma vez no `AppSidebar`. Headers de páginas internas (Diário, Objetivos, Avaliações) NÃO duplicam o botão "Convidar".

## Perfil pessoal → clique no avatar (`SidebarProfileBlock`)

O `ProfileSettingsDialog` (perfil pessoal: nome, avatar, senha) abre **clicando no avatar** no rodapé. Padrão Linear/Slack: avatar = perfil pessoal; item de menu Settings = configurações da organização. Resolve a ambiguidade entre "Settings da org" (rota) vs "Profile pessoal" (modal).

## O que foi REMOVIDO (e por quê)

- **Item "Configurações" da nav principal** (`LEADER_NAV_ITEMS` / `DIRECT_REPORT_NAV_ITEMS`): removido. Duplicava o "Configurações" do WorkspaceSwitcher dropdown (mesma rota). Settings é ação utilitária da org, não fluxo de trabalho — não pertence à nav primária. Padrão Linear/Notion/Slack.
- **`QuickActionsRow`** (linha de ícones Home/Calendar/People/Mentor/Search): deletada. 3 dos 4 botões duplicavam o nav primário 2cm abaixo. Mentor já tem `SidebarFooterCTA` persistente. Search virou link discreto + atalho `cmd+K`.
- **Botão "Configurações" do footer** (que abria `ProfileSettingsDialog`): removido. Conflitava com o item de nav e com o do WorkspaceSwitcher (mesmo nome, comportamentos diferentes).
- **Botão "LifeBuoy/Suporte" do footer**: removido. "Central de Ajuda" já vive no WorkspaceSwitcher dropdown.
- **Botão "Convidar membros" no footer**: removido (já estava — agora confirmado).

## Footer atual (de cima para baixo)

1. Banner de impersonation (se ativo)
2. `SidebarFooterCTA` — Pergunte ao Mentor (CTA persistente)
3. Botão Search discreto com atalho `⌘K`
4. `SidebarProfileBlock` — avatar clicável (abre profile) + toggle tema + logout
