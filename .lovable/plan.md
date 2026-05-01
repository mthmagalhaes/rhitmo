## Diagnóstico das duplicações no sidebar

Mapeei **4 conjuntos de botões duplicados**, alguns com comportamentos divergentes (pior tipo de UX):

| # | Item | Local 1 | Local 2 (e 3) | Problema |
|---|------|---------|---------------|----------|
| 1 | **Início** | `QuickActionsRow` (ícone Home) | `LEADER_NAV_ITEMS[0]` (Início) | Mesmo destino `/lider/inicio`, mesmo ícone, empilhados |
| 2 | **Calendário / 1:1s** | `QuickActionsRow` (Calendar) | `LEADER_NAV_ITEMS[1]` (1:1s) | Mesmo destino `/lider/1on1s` |
| 3 | **Configurações** 🚨 | `LEADER_NAV_ITEMS` → rota | `SidebarFooter` botão → **abre modal** + `WorkspaceSwitcher` dropdown → rota | 3 entradas, 2 destinos diferentes (rota vs modal de profile) |
| 4 | **Suporte/Ajuda** | `SidebarFooter` botão LifeBuoy → dialog email | `WorkspaceSwitcher` dropdown → `/lider/configuracoes?tab=ajuda` | 2 entradas, 2 destinos diferentes |

A `QuickActionsRow` toda ficou redundante: 3 dos 4 botões duplicam o nav que vem 2cm abaixo. Ela existia como atalho "estilo Linear" mas hoje só polui.

## Decisões como cofundador técnico

**Princípio**: cada ação do app deve ter UM ponto de entrada óbvio. Duplicar só faz sentido se o atalho economiza muito clique (ex: cmd+K, mentor sempre visível). Tudo que duplica nav primário = corte.

### O que sai

1. **`QuickActionsRow` é removida inteira** do sidebar.
   - Home, Calendar, People já estão no nav primário (Início, 1:1s, Pessoas via /lider/pessoas — esse último não está no nav, mas é acessível pela página Início que lista pessoas).
   - **Search** (`cmd+K`) e **Mentor (Pergunte ao Mentor)** continuam disponíveis: o Mentor já vive como **`SidebarFooterCTA`** persistente (botão roxo no canto inferior). O Search vira atalho global via teclado (`cmd+K` já funciona pelo `GlobalSearchDialog`) + um pequeno botão ícone discreto na linha do perfil.

2. **Botão "Configurações" do `SidebarFooter` (que abre modal) é removido.**
   - Único ponto de entrada de Configurações: o item **Configurações** no nav primário (rota `/lider/configuracoes`) e o atalho secundário no dropdown do `WorkspaceSwitcher` (que é razoável como atalho organizacional).
   - O **modal `ProfileSettingsDialog`** (que mexe no perfil pessoal: nome, avatar, senha) passa a ser invocado **clicando no avatar do `SidebarProfileBlock`**. Isso é o padrão Linear/Slack: avatar = perfil pessoal; item de menu Settings = configurações da organização. Resolve ambiguidade.

3. **Botão "LifeBuoy/Suporte" do `SidebarFooter` é removido.**
   - "Central de Ajuda" já existe no dropdown do WorkspaceSwitcher. O modal "Talk to us" (que só mostra `support@rhitmo.co`) é informação que pode viver dentro da própria aba Ajuda em Configurações — ou ser substituído por um link "Falar com a gente" lá dentro.

### O que fica (e por quê)

- **Nav primário** (`LEADER_NAV_ITEMS`): único lugar pra navegar entre módulos. Sem mexer.
- **`WorkspaceSwitcher` dropdown**: Configurações + Central de Ajuda + Convidar membros. Mantém — é o "menu da organização", padrão Windmill.
- **`SidebarFooterCTA`** (Pergunte ao Mentor): mantém como CTA persistente, é o produto core.
- **`SidebarProfileBlock`**: avatar agora é clicável → abre `ProfileSettingsDialog` (perfil pessoal). Mantém tema toggle e logout.
- **HR context switcher**: mantém (não é duplicado).

### Resultado visual (antes → depois)

```text
ANTES                          DEPOIS
─────────                      ─────────
[Faster Ops ▼]                 [Faster Ops ▼]
🏠 📅 👥 💬 🔍   ← QuickRow    
🏠 Início                      🏠 Início
📅 1:1s                        📅 1:1s
📖 Diário de Bordo             📖 Diário de Bordo
... etc                        ... etc
⚙️ Configurações               ⚙️ Configurações
                               
[Pergunte ao Mentor]           [Pergunte ao Mentor]
👥 Convidar membros (já saiu)
⚙️ Configurações  🛟           🔍 (search atalho discreto)
[avatar] Matheus 🌙 ⏻          [avatar clicável] Matheus 🌙 ⏻
```

Sai: 1 linha de quick actions + 2 botões redundantes no footer. Entra: avatar do perfil vira clicável (ganho funcional sem novo elemento visual).

## Arquivos a editar

1. **`src/components/AppSidebar.tsx`**
   - Remove import e renderização de `QuickActionsRow`
   - Remove botão "Configurações" e botão "LifeBuoy" do `SidebarFooter` (e o `Dialog` de suporte)
   - Remove estado `supportOpen`, `copied`, função `handleCopyEmail`
   - Adiciona pequeno botão Search (ícone lupa) na linha do `SidebarProfileBlock` ou logo acima — atalho `cmd+K` continua funcionando
   - Passa `onOpenProfileSettings={() => setSettingsOpen(true)}` para o `SidebarProfileBlock`

2. **`src/components/sidebar/SidebarProfileBlock.tsx`**
   - Aceita prop opcional `onOpenProfileSettings`
   - Avatar vira `<button>` que dispara essa callback (cursor-pointer, hover sutil)
   - Adiciona `title="Editar perfil"` para affordance

3. **`src/components/sidebar/QuickActionsRow.tsx`** — DELETE (componente não usado mais)

4. **`src/lib/navigation.ts`**
   - Remove exports `LEADER_QUICK_ACTIONS`, `DIRECT_REPORT_QUICK_ACTIONS`, interface `QuickAction` (não é mais usado)

5. **`.lovable/memory/design/sidebar/workspace-switcher-actions.md`** — atualiza para registrar a nova regra: "perfil pessoal abre via avatar; configurações da org abrem via item Configurações ou WorkspaceSwitcher; sem QuickActionsRow"

## Fora de escopo

- Não mexer no `SidebarFooterCTA` (Pergunte ao Mentor).
- Não mexer no nav primário (LEADER_NAV_ITEMS / DIRECT_REPORT_NAV_ITEMS).
- Não mexer no comportamento mobile do sidebar (Sheet).
- Não mexer no super-admin sidebar (já é minimalista).
- Não mexer nas páginas Master-Detail (são corte separado).

## Risco

Zero risco funcional: nenhuma rota some, nenhum modal some. Só consolidamos pontos de entrada. A única curva de aprendizado é "perfil agora abre clicando no avatar" — afford­ance natural e padrão de mercado.