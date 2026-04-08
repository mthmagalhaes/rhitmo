

## Mover abas do Liderado para o menu lateral

### Contexto
Hoje o liderado (`isUser`) vê apenas "Início" no sidebar e navega entre "Visão Geral", "Minha Carreira", "Feedbacks" e "Meu Perfil" via abas internas no `DirectReportDashboard.tsx`. Vamos transformar essas abas em rotas separadas no menu lateral, igualando a experiência dos líderes e HR Admins.

### Plano

**1. Criar rotas dedicadas para cada seção**

**Arquivo:** `src/App.tsx`
- Adicionar rotas: `/dashboard` (Início), `/dashboard/carreira`, `/dashboard/feedbacks`, `/dashboard/perfil`
- Todas protegidas pelo mesmo `DirectReportGuard` + `AppLayout`
- Cada rota renderiza o `DirectReportDashboard` com uma prop `activeTab` diferente

**2. Adicionar itens no sidebar para o liderado**

**Arquivo:** `src/components/AppSidebar.tsx`
- Criar array `memberMenuItems` com:
  - Início → `/dashboard` (icon: Home)
  - Minha Carreira → `/dashboard/carreira` (icon: Compass)
  - Feedbacks → `/dashboard/feedbacks` (icon: FileText)
  - Meu Perfil → `/dashboard/perfil` (icon: User)
- No bloco `!isInHRContext`, quando `isUser` é true, renderizar `memberMenuItems` em vez de `menuItems`

**3. Refatorar DirectReportDashboard para aceitar tab via prop/rota**

**Arquivo:** `src/components/dashboard/DirectReportDashboard.tsx`
- Aceitar prop `activeTab` (default: `'visao-geral'`)
- Remover o `TabsList` visual (as tabs horizontais)
- Manter o `Tabs` component com `value={activeTab}` controlado pela rota
- Todo o conteúdo de cada `TabsContent` permanece intacto

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/App.tsx` | Adicionar 3 novas rotas para carreira/feedbacks/perfil |
| `src/components/AppSidebar.tsx` | Adicionar `memberMenuItems` para liderados |
| `src/components/dashboard/DirectReportDashboard.tsx` | Receber `activeTab` via prop, ocultar TabsList |

### Resultado
O liderado vê 4 itens no menu lateral (Início, Minha Carreira, Feedbacks, Meu Perfil) — mesma experiência visual dos outros perfis. Todas as funcionalidades existentes são preservadas.

