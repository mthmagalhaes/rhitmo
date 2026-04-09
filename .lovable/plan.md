

## Fix: Menu lateral do liderado não mostra abas

### Problema

O sidebar usa `isUser` (baseado em role do workspace) para decidir se mostra `memberMenuItems`. Mas um usuário pode ser `leader`/`hr_admin` no workspace E ao mesmo tempo ser `linkedMember` (liderado de outro líder). Nesse caso, `isUser = false` e o sidebar mostra o menu do líder, enquanto a página renderiza o `DirectReportDashboard` com as abas inline.

### Solução

1. **`src/components/AppSidebar.tsx`** — Na condição de renderização do menu, usar `isLinkedMember` junto com `isUser`:
   ```
   (isUser || isLinkedMember) ? memberMenuItems : menuItems
   ```
   Isso garante que qualquer usuário vinculado como liderado veja as 4 abas no sidebar.

2. **`src/components/dashboard/DirectReportDashboard.tsx`** — Confirmar que o `TabsList` inline está de fato oculto (remover se ainda renderiza). Pelo código atual já está comentado como hidden, mas se o screenshot mostra as abas, pode haver uma `TabsList` renderizada em outro ponto do componente. Verificar e remover.

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/AppSidebar.tsx` | Trocar `isUser` por `isUser \|\| isLinkedMember` na seleção de menu items |
| `src/components/dashboard/DirectReportDashboard.tsx` | Garantir que TabsList inline está removida (não apenas comentada) |

