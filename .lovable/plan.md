

## Plano: Transformar matheus@rhitmo.co em "God's Eye" — Painel de Controle Total

O objetivo é que o super admin nunca veja o dashboard de líder. Ao logar, ele vai direto para o painel Admin, com uma sidebar dedicada contendo apenas Design System e Admin.

---

### Mudanças

#### 1. Redirecionamento automático para /admin
- **`src/pages/Landing.tsx`** (~linha 590): Quando o usuário autenticado for super_admin, redirecionar para `/admin` em vez de `/dashboard`
- Usar o hook `useAdmin` para detectar isso, com fallback para `/dashboard` enquanto o check carrega

#### 2. Sidebar dedicada para super admin
- **`src/components/AppSidebar.tsx`**: Quando `isAdmin && user?.email === 'matheus@rhitmo.co'` (ou simplesmente `isAdmin`), renderizar um menu mínimo:
  - **Design System** (`/design-system`)
  - **Painel Admin** (`/admin`)
  - Esconder itens de líder (Início, Analytics, Central de Conhecimento, Assinatura), conectores (Chrome/Slack), e botão "Voltar ao Painel RH"

#### 3. Bloquear acesso ao /dashboard para super admin
- **`src/components/DirectReportGuard.tsx`**: Adicionar check — se `isAdmin`, redirecionar para `/admin` (impede acesso manual via URL)

#### 4. Design System dentro do AdminLayout (opcional)
- Mover a rota `/design-system` para usar `AdminLayout` em vez de `AppLayout`, mantendo a experiência visual consistente para o super admin

---

### O que NÃO muda nesta fase
- O conteúdo do painel Admin (`AdminOverview`, `AdminUsers`, etc.) permanece igual por agora
- Melhorias de KPIs exaustivos, dashboards Minority Report-style serão uma fase seguinte
- A lógica de impersonation já existe e continua funcionando

### Arquivos modificados
| Arquivo | Mudança |
|---------|---------|
| `src/pages/Landing.tsx` | Redirect super_admin → `/admin` |
| `src/components/AppSidebar.tsx` | Menu mínimo para super admin |
| `src/components/DirectReportGuard.tsx` | Block `/dashboard` para admin |
| `src/App.tsx` | (Opcional) Mover `/design-system` para `AdminLayout` |

