

## Plano: Hotfix de Roteamento + Dashboard do Liderado

### Problema Diagnosticado

O usuario liderado `mth.magalhaes@gmail.com` esta "preso" porque:
1. O `Index.tsx` atual verifica workspace ANTES de verificar se e um linked_member
2. O `DirectReportGuard` so redireciona para onboarding, mas nao impede a exibicao do modal de workspace
3. Falta um dashboard especifico para liderados que completaram o onboarding

### Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Index.tsx` | Inverter logica: verificar `isLinkedMember` ANTES de workspace |
| `src/components/dashboard/DirectReportDashboard.tsx` | **NOVO** - Home do colaborador |
| `src/components/AppSidebar.tsx` | Ocultar itens de menu para liderados |
| `src/components/AppLayout.tsx` | Nao mostrar WorkspaceOnboarding para liderados |

---

### Parte 1: Refatoracao do Index.tsx

A logica atual e:
```text
1. authLoading → Spinner
2. workspace check → (se nao tem, mostra modal no AppLayout)
3. Renderiza dashboard de lider
```

A nova logica sera:
```text
1. isLoading (auth + linkedMember) → Spinner
2. SE isLinkedMember:
   └── needsOnboarding? → Navigate /onboarding
   └── onboarding completo? → <DirectReportDashboard />
3. SE NAO isLinkedMember:
   └── Logica atual de lider (workspace, teams, members)
```

#### Codigo Modificado

```typescript
// src/pages/Index.tsx - Inicio do componente
import { useLinkedMember } from '@/hooks/useLinkedMember';
import { Navigate } from 'react-router-dom';
import DirectReportDashboard from '@/components/dashboard/DirectReportDashboard';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { linkedMember, isLinkedMember, needsOnboarding, isLoading: linkedMemberLoading } = useLinkedMember();
  
  // Loading combinado: auth + linked member
  const isLoading = authLoading || linkedMemberLoading;
  
  // Renderizacao condicional no inicio
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // INVERSAO: Priorizar fluxo de liderado
  if (isLinkedMember) {
    if (needsOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
    // Liderado com onboarding completo → Dashboard proprio
    return <DirectReportDashboard linkedMember={linkedMember} />;
  }

  // Fluxo de lider (codigo existente)
  // ... resto do componente atual
};
```

---

### Parte 2: Novo Componente DirectReportDashboard.tsx

Criar em `src/components/dashboard/DirectReportDashboard.tsx`:

#### Layout Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│  Header: "Ola, [Nome]!"                                         │
│  Subtitle: "Painel do Colaborador"                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌──────────────────────────────┐ │
│  │  📋 Meu Perfil           │  │  📝 Minhas Anotacoes         │ │
│  │                          │  │                              │ │
│  │  Cargo: Analista         │  │  <FeedbackTimeline           │ │
│  │  Tempo: 1-3 anos         │  │     readonly (sem delete)    │ │
│  │                          │  │     filtrado por member_id   │ │
│  │  Responsabilidades:      │  │  />                          │ │
│  │  • Analise de dados      │  │                              │ │
│  │  • Reports mensais       │  │  [Empty state se nao houver] │ │
│  │  • Dashboards            │  │                              │ │
│  │                          │  │                              │ │
│  └──────────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Estrutura do Componente

```typescript
interface DirectReportDashboardProps {
  linkedMember: {
    id: string;
    name: string;
    email: string | null;
    role: string;
    skills_data: {
      role_tenure?: string;
      responsibilities?: string[];
      aspirations?: string;
      interests?: string[];
      onboarding_completed?: boolean;
      completed_at?: string;
    } | null;
  };
}

export default function DirectReportDashboard({ linkedMember }: DirectReportDashboardProps) {
  // Query feedbacks do proprio membro (visibility = 'shared' ou sem filtro para MVP)
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['my-feedbacks', linkedMember.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('member_id', linkedMember.id)
        .eq('visibility', 'shared') // Apenas feedbacks compartilhados pelo lider
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Mapear tenure para label legivel
  const tenureLabels = {
    'less_than_1': 'Menos de 1 ano',
    '1_to_3': '1 a 3 anos',
    '3_to_5': '3 a 5 anos',
    'more_than_5': 'Mais de 5 anos',
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold">Ola, {linkedMember.name}!</h1>
          <p className="text-muted-foreground">Painel do Colaborador</p>
        </div>
      </div>

      {/* Grid de Cards */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Meu Perfil */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              Meu Perfil
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-medium">{linkedMember.role}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Tempo na funcao</p>
                <p className="font-medium">
                  {tenureLabels[linkedMember.skills_data?.role_tenure] || '-'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Responsabilidades</p>
                <ul className="list-disc list-inside space-y-1">
                  {linkedMember.skills_data?.responsibilities?.map((resp, i) => (
                    <li key={i} className="text-foreground">{resp}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* Card: Minhas Anotacoes */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              Minhas Anotacoes
            </h2>
            
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma anotacao compartilhada</p>
                <p className="text-sm">Seu lider pode compartilhar feedbacks com voce</p>
              </div>
            ) : (
              <FeedbackTimeline feedbacks={feedbacks} />
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
```

---

### Parte 3: Limpeza do AppSidebar.tsx

Filtrar itens do menu baseado em `isLinkedMember`:

```typescript
// AppSidebar.tsx
import { useLinkedMember } from '@/hooks/useLinkedMember';

const leaderOnlyItems = ['Analytics', 'Assinatura', 'Guia do Rhitmo'];

export function AppSidebar() {
  const { isLinkedMember } = useLinkedMember();
  
  // Filtrar menu para liderados
  const visibleMenuItems = isLinkedMember 
    ? menuItems.filter(item => !leaderOnlyItems.includes(item.title))
    : menuItems;

  // ... resto do componente usando visibleMenuItems
}
```

Menu do liderado tera apenas:
- Inicio (Home icon)

O link de Suporte e Configuracoes permanecem no footer.

---

### Parte 4: Correcao do AppLayout.tsx

Impedir que o modal de WorkspaceOnboarding apareca para liderados:

```typescript
// AppLayout.tsx
import { useLinkedMember } from '@/hooks/useLinkedMember';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLinkedMember, isLoading: linkedMemberLoading } = useLinkedMember();
  
  // Liderados NAO precisam de workspace
  const needsWorkspaceSetup = !authLoading 
    && !workspaceLoading 
    && !linkedMemberLoading
    && user 
    && !workspace 
    && !isLinkedMember; // <-- ADICIONAR ESTA VERIFICACAO

  // ... resto do componente
}
```

---

### Secao Tecnica

#### Diagrama do Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE AUTENTICACAO                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Usuario faz login                                              │
│     │                                                           │
│     ▼                                                           │
│  DirectReportGuard                                              │
│     │                                                           │
│     ├── isLoading? → Spinner                                    │
│     │                                                           │
│     ├── isLinkedMember && needsOnboarding?                      │
│     │      └── Redirect → /onboarding                           │
│     │                                                           │
│     └── Else → Continua para Index.tsx                          │
│                                                                 │
│  Index.tsx                                                      │
│     │                                                           │
│     ├── isLinkedMember && !needsOnboarding?                     │
│     │      └── Renderiza DirectReportDashboard                  │
│     │                                                           │
│     └── !isLinkedMember?                                        │
│            └── Renderiza dashboard de lider (atual)             │
│                                                                 │
│  AppLayout.tsx                                                  │
│     │                                                           │
│     └── needsWorkspaceSetup && !isLinkedMember?                 │
│            └── Mostra modal WorkspaceOnboarding                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Arquivos Criados

| Arquivo | Descricao |
|---------|-----------|
| `src/components/dashboard/DirectReportDashboard.tsx` | Dashboard do liderado com perfil e anotacoes |

#### Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Index.tsx` | Importar hook e componente, inverter logica de renderizacao |
| `src/components/AppSidebar.tsx` | Filtrar menu items para liderados |
| `src/components/AppLayout.tsx` | Nao mostrar modal de workspace para liderados |

#### Dependencias de Query

O `DirectReportDashboard` usara:
- `useQuery(['my-feedbacks', linkedMember.id])` → buscar feedbacks com visibility='shared'
- Dados de `skills_data` ja vem do hook `useLinkedMember` (nao precisa de query adicional)

#### Consideracao sobre Feedbacks

Por padrao, feedbacks tem `visibility = 'private_leader'`. Para o liderado ver suas anotacoes, o lider precisara compartilhar (definir `visibility = 'shared'`). Isso sera implementado em uma feature futura. No MVP, o card mostrara empty state se nao houver feedbacks compartilhados.

