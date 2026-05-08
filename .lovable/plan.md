## Diagnóstico

A área `/admin` foi crescendo em camadas e hoje tem três problemas claros:

1. **Sidebar quebrada** — em `AdminLayout.tsx`, o `<nav>` usa `flex-1`, então o botão "Sair" é jogado para o rodapé do viewport, longe dos itens de navegação. Em telas grandes fica a "quilômetros" do último item.
2. **Excesso de abas com sobreposição funcional**:
   - **Command Center** (Overview): empilha 6 cards verticais (Funnel, Cohorts, StatsGrid, InactiveWorkspaces, RecentActivity, Waitlist). É um "wall of cards" sem hierarquia.
   - **Usuários**: gestão completa de pessoas + filtros + export CSV.
   - **Estrutura** (883 linhas): CRUD de workspaces / times / membros com dispatch de convites — duplica metade do que "Usuários" já faz.
   - **Acessos & Export**: convidar HR Admin + listar HR Admins + Data Export (5 botões CSV). Tudo isso já cabe em "Usuários" / "Estrutura".
   - **Inteligência**: health score por workspace + Revenue. Só 2 blocos.
   - **Observabilidade**: logs de Edge Functions (mantém, é único).
3. **UX de detalhe**: header "Rhitmo + ADMIN" ocupa muito espaço; tabs custom com event bus (`window.dispatchEvent('admin-tab-change')`) é desnecessariamente complexo; `Sair` separado dos demais itens; sem indicador de qual usuário está logado.

## O que fazer

### 1. `AdminLayout.tsx` — sidebar enxuta e coesa
- **Colar `Sair` ao final dos itens de nav** (não pinned no rodapé do viewport). Trocar `flex-1` no `<nav>` por altura natural; mover o `Sair` para dentro do mesmo `TabsList` visual (como item separado por uma linha sutil), eliminando o bloco `border-t` solto.
- **Reduzir o header** do logo: remover o `Badge ADMIN` redondo grande; manter `RhitmoLogo size="sm"` + texto fino "Admin" abaixo. Padding `p-4` em vez de `p-6`.
- **Adicionar mini-bloco do usuário logado** no rodapé (avatar + email + "Sair" inline), padrão da sidebar principal do produto. Resolve o "Sair a quilômetros".
- **Trocar event bus por contexto/prop** — Hoje `Admin.tsx` escuta `admin-tab-change` via `MutationObserver` + `CustomEvent`. Substituir por um `useState` simples no `Admin.tsx` passado por prop, ou um pequeno `AdminTabsContext`. Remove ~30 linhas de gambiarra.

### 2. Consolidar abas (de 6 → 4)

```text
Antes:  Command Center | Usuários | Estrutura | Acessos & Export | Inteligência | Observabilidade
Depois: Visão Geral    | Pessoas  | Workspaces                   | Sistema
```

- **Visão Geral** (era Command Center): reorganizar em layout 2-col bento — KPIs no topo (StatsGrid compacto), depois Funnel + Cohorts lado a lado, e na base "Atenção" (InactiveWorkspaces + Waitlist colapsados/compactos). Remover `RecentActivityCard` da overview (vai para "Sistema" como log secundário, ou some — é redundante com Observabilidade).
- **Pessoas** (era Usuários): mantém intacto. Absorve "Convidar HR Admin" da aba Acessos como ação dentro do dialog de edição de usuário (já existe edição via `admin-update-user`).
- **Workspaces** (era Estrutura + parte de Acessos): mantém o CRUD de workspaces/times/membros + lista de "HR Admins ativos" como sub-tab/coluna. Mantém o Bulk Dispatch de convites.
- **Sistema** (era Inteligência + Observabilidade + Data Export): combina health-score por workspace, RevenueOverview, logs de Edge Functions e os 5 botões de CSV export como bloco final "Exportar dados". Tudo que é "operação interna" mora aqui.

### 3. Penduricalhos a remover

- `AdminSupport.tsx` (541 linhas) — não está rota nem importado em `Admin.tsx`. **Deletar arquivo**.
- `AdminExport.tsx` (244 linhas) — também órfão (Export vive dentro de `AdminAccess`). **Deletar**.
- `ImpersonationBanner.tsx` vs `ImpersonationIndicator.tsx` — verificar duplicidade; manter apenas um.
- `RecentActivityCard` na Overview — redundante com Observabilidade. Remover do Overview.

### 4. Detalhes de UX
- Trocar `bg-slate-900` da sidebar pelo token `bg-sidebar` do design system (consistência com sidebar do produto). Hoje quebra o tema escuro/claro.
- Headers de página com tipografia Lora (igual ao resto do produto), não `font-bold` genérico.
- Densidade: padding `p-6` (era `p-8`) e `space-y-6` no container das abas — caber mais conteúdo sem scroll.

## Fora de escopo

- Mexer em lógica de RPC, RLS ou edge functions.
- Refatorar internamente `AdminUsers` ou `AdminStructure` (apenas movimentação e remoção de blocos).
- Tocar na rota `/admin` ou no `AdminGuard`.

## Resultado esperado

- Sidebar com 4 itens + bloco do usuário/Sair ao pé → "Sair" a 1 clique de qualquer item.
- 4 abas com responsabilidades claras, sem features órfãs.
- ~785 linhas removidas (AdminSupport + AdminExport + event bus).
