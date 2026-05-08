
## Problemas identificados

1. **Sair muito longe da nav** — `AdminLayout` usa `min-h-screen` + um `<div className="flex-1" />` que empurra o bloco do usuário para o final da viewport. Com apenas 4 itens de nav, sobra um buraco enorme entre "Sistema" e o avatar/Sair, o que parece amador (visível no print 100%).
2. **Visão Geral** — header genérico, container `max-w-5xl mx-auto` desperdiça largura num painel admin, `StatsGrid` + `FunnelCard/ActivationCohorts` + alertas + waitlist competem sem hierarquia clara.
3. **Pessoas** — barra de filtros longa que quebra em múltiplas linhas no zoom 100%, contadores de segmento duplicam o filtro de segmento, coluna ID ocupa espaço sem valor, 5 ícones de ação espremidos, badges coloridos demais (visual ruidoso).
4. **Workspaces e Sistema** — só wrappers; ficam fora do escopo deste ajuste (mencionar mas não mexer agora).

## Mudanças propostas

### 1. `src/components/admin/AdminLayout.tsx` — sidebar compacta e ancorada

- Trocar o padrão "spacer flex-1" por **bloco do usuário logo abaixo da nav**, separado por um divisor sutil (mesmo padrão do `AppSidebar` da app principal: nav primária + CTA imediatamente embaixo, footer só com utilitários).
- Adicionar um pequeno header de seção "Admin" acima dos itens (já existe), mas reduzir paddings (`pt-3`, `gap-0.5`) para a lista respirar menos verticalmente.
- Mudar a estrutura para:
  ```text
  ┌─ Logo + chip ADMIN
  ├─ Nav (4 itens, rounded-xl, gap-0.5)
  ├─ ── divisor sutil ──
  ├─ Bloco usuário (avatar + nome + email)
  ├─ Botão Sair
  └─ flex-1 (vazio, só para empurrar nada — opcional remover)
  ```
- Resultado: no zoom 100% (≥768px de altura) tudo fica visível na metade superior; em telas curtas o bloco ainda permanece logo abaixo da nav, sem "voar" para o rodapé.

### 2. `src/components/admin/AdminOverview.tsx` — densidade e hierarquia

- Remover `max-w-5xl mx-auto` (admin pode usar largura total, como `AdminUsers` já faz com `p-8`); padronizar em `p-6 lg:p-8 space-y-6` sem container central.
- Header com chip "Painel admin" + título serif menor (`text-2xl`) e subtítulo mais curto.
- Reordenar para: **StatsGrid → InactiveWorkspacesAlert (se houver) → grid 2 col (FunnelCard | ActivationCohorts) → WaitlistTable**. Alerta sobe para chamar atenção; waitlist desce porque é tabela longa.
- Garantir que `StatsGrid` use 4 colunas no desktop (revisar se necessário) para ocupar bem a largura.

### 3. `src/components/admin/AdminUsers.tsx` — limpeza visual

- **Header**: padronizar com a Visão Geral (mesma tipografia serif, mesmo padding).
- **Contadores de segmento**: manter como filtros clicáveis e **remover** o `<Select>` de segmento da barra de filtros (é redundante).
- **Barra de filtros**: agrupar em uma linha só com `flex items-center gap-2`, larguras menores (`w-[130px]`), busca à esquerda com `flex-1 max-w-md`, "Convidar líder" e "Exportar CSV" empurrados para a direita com `ml-auto` num pequeno cluster. Em telas estreitas, deixar quebrar naturalmente.
- **Tabela**:
  - Remover coluna **ID** dedicada; mover para tooltip/copy no nome do usuário (ícone copy aparece em hover sobre o nome).
  - Coluna **Cliente** + **Segmento**: fundir em uma linha só (segmento já é badge).
  - Coluna **Hierarquia**: limitar a 3 badges visíveis + "+N" para evitar quebra excessiva.
  - **Ações**: agrupar 5 ícones num `DropdownMenu` "kebab" (⋯) com Impersonar destacado fora (ação mais usada). Reduz a coluna de ~180px para ~80px.
- Reduzir saturação dos badges de segmento (usar `bg-*-50` em vez de `bg-*-500/10` nas variantes mais agressivas) — opcional, posso aplicar se preferir.

### 4. Workspaces e Sistema

- Não tocados nesta rodada. Se quiser, abro tarefa separada depois (preciso saber se você quer mesmo padrão de header e densidade).

## Fora do escopo

- Lógica de negócio, queries, RLS, permissões — só camada visual/UX.
- Mudanças no super-admin sidebar do `AppSidebar` principal (já está OK, é só o `AdminLayout` do `/admin` que tem o problema do Sair afastado).

## Perguntas rápidas antes de implementar

1. **Sobre as ações da tabela de Pessoas**: posso colapsar em menu kebab (⋯) com Impersonar destacado? Ou prefere manter os 5 ícones inline?
2. **Workspaces e Sistema**: aplico o mesmo header/densidade agora ou deixo para depois?
