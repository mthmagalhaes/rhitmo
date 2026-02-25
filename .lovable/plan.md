

## Portal do Liderado — Estrutura Base com Tabs

### Resumo

Reestruturar o `DirectReportDashboard` com 4 tabs (Visão Geral, Minha Carreira, Feedbacks, Meu Perfil), corrigir o bug de nome concatenado, e expandir os dados disponíveis do membro vinculado.

---

### Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useLinkedMember.ts` | Expandir interface e query para incluir `work_style_data`, `chronotype`, `feedback_style`, `recognition_style`, `ai_analysis` |
| `src/components/dashboard/DirectReportDashboard.tsx` | Rewrite completo: tabs, fix nome, 4 seções de conteúdo |

---

### Detalhamento

#### 1. useLinkedMember.ts — Expandir dados

Adicionar campos à interface `LinkedMemberData`:
```typescript
work_style_data?: Record<string, unknown> | null;
chronotype?: string | null;
feedback_style?: string | null;
recognition_style?: string | null;
```

Adicionar `ai_analysis` dentro de `skills_data`.

Atualizar o `.select()` para incluir os novos campos:
```typescript
.select('id, name, email, role, skills_data, work_style_data, chronotype, feedback_style, recognition_style')
```

#### 2. DirectReportDashboard.tsx — Fix do nome

Calcular `displayName` no topo do componente:
```typescript
const displayName = linkedMember.name?.replace(linkedMember.role, '').trim() || linkedMember.name;
```

Usar `displayName` em vez de `linkedMember.name` na saudação.

#### 3. DirectReportDashboard.tsx — Estrutura de Tabs

Imports adicionados:
- `Tabs, TabsList, TabsTrigger, TabsContent` de `@/components/ui/tabs`
- `Home, Compass, Zap, CheckCircle, ChevronRight, Sparkles` de `lucide-react`
- `toast` de `sonner`
- `useState` de `react`

Layout:
- Header com saudação (fora das tabs)
- `<Tabs defaultValue="visao-geral">` com `TabsList` sticky

**Tab "Visão Geral":**
- Card Bússola de Carreira (CareerCompassCard, full width, intacto)
- Card Resumo (1/3): count de feedbacks, links para outras tabs
- Card Próximas Ações (2/3): 3 itens placeholder com `ChevronRight`

**Tab "Minha Carreira":**
- Placeholder card centralizado com ícone Compass e texto "em breve"

**Tab "Feedbacks":**
- Título "Feedbacks do seu líder"
- FeedbackTimeline com query existente (intacta)
- Empty state existente (intacto)

**Tab "Meu Perfil":**
- Seção 1: Informações da função (conteúdo atual do card Meu Perfil)
  - Botão "Editar" com toast placeholder
- Seção 2: Card "Meu Rhitmo Sync"
  - Se `work_style_data` / `chronotype` / `feedback_style` / `recognition_style` existirem: badges coloridos
  - Se não: empty state com texto
  - Botão "Atualizar Sync" com toast placeholder

#### 4. O que NÃO muda
- CareerCompassCard (componente intacto)
- FeedbackTimeline (componente intacto)
- Query de feedbacks (mesma lógica, mesma posição no componente)
- DirectReportGuard, OnboardingModal
- Nenhum outro arquivo além dos 2 listados

