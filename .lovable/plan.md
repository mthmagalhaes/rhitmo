

## Plano: Fluxo de Onboarding e Job Crafting para Liderados

### Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Onboarding.tsx` | **NOVO** - Wizard de 3 passos para Job Crafting |
| `src/App.tsx` | Adicionar rota `/onboarding` |
| `src/components/DirectReportGuard.tsx` | **NOVO** - Componente para detectar e redirecionar liderados sem onboarding |
| `src/hooks/useLinkedMember.ts` | **NOVO** - Hook para verificar se usuario e um linked_member |

---

### Parte 1: Nova Pagina Onboarding.tsx

#### 1.1 Layout Visual (Baseado no RhitmoSync.tsx e Invite.tsx)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Header: "Bem-vindo ao Rhitmo" + Nome do usuario               │
├─────────────────────────────────────────────────────────────────┤
│  [====○============○============○] Barra de Progresso           │
│     Passo 1       Passo 2       Passo 3                         │
│     Identidade    Job Crafting  Futuro                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PASSO 1: O Cracha                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Nome: [Lais Silva] (readonly)                              ││
│  │  Email: [lais@empresa.com] (readonly)                       ││
│  │  Cargo Atual: [Analista de Marketing___] (editavel)         ││
│  │  Ha quanto tempo nesta funcao? [Dropdown: <1 ano, 1-3...]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│              [Anterior]    [Proximo →]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.2 Estrutura dos 3 Passos

| Passo | Titulo | Campos | Obrigatorios |
|-------|--------|--------|--------------|
| 1 - Identidade | "O Cracha" | Nome (readonly), Email (readonly), Cargo (editavel, pre-preenchido), Tempo na funcao | Cargo, Tempo |
| 2 - Job Crafting | "Mapeando suas Responsabilidades" | 3 campos de texto para atividades/entregas principais | Todos os 3 |
| 3 - Futuro | "Onde voce quer chegar?" | Textarea para habilidades a desenvolver + Multi-select de areas de interesse | Textarea obrigatorio, Tags opcional |

#### 1.3 Interface de Dados

```typescript
interface OnboardingFormData {
  // Step 1: Identidade
  role: string;  // Cargo atual (editavel, pre-preenchido)
  roleTenure: string;  // Tempo na funcao

  // Step 2: Job Crafting
  responsibility1: string;
  responsibility2: string;
  responsibility3: string;

  // Step 3: Futuro
  aspirations: string;  // Habilidades a desenvolver
  interests: string[];  // Areas de interesse (opcional)
}

const tenureOptions = [
  { value: 'less_than_1', label: 'Menos de 1 ano' },
  { value: '1_to_3', label: '1 a 3 anos' },
  { value: '3_to_5', label: '3 a 5 anos' },
  { value: 'more_than_5', label: 'Mais de 5 anos' },
];

const interestOptions = [
  { value: 'leadership', label: 'Lideranca' },
  { value: 'technical', label: 'Tecnica' },
  { value: 'communication', label: 'Comunicacao' },
  { value: 'strategy', label: 'Estrategia' },
  { value: 'creativity', label: 'Criatividade' },
  { value: 'analytics', label: 'Analise de Dados' },
];
```

---

### Parte 2: Hook useLinkedMember

Cria um hook reutilizavel para verificar se o usuario logado e um liderado vinculado:

```typescript
// src/hooks/useLinkedMember.ts
export function useLinkedMember() {
  const { user, loading: authLoading } = useAuth();
  
  const { data: linkedMember, isLoading } = useQuery({
    queryKey: ['linked-member', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('team_members')
        .select('id, name, email, role, skills_data')
        .eq('linked_user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  
  const needsOnboarding = linkedMember && 
    (!linkedMember.skills_data?.onboarding_completed);
  
  return {
    linkedMember,
    isLinkedMember: !!linkedMember,
    needsOnboarding,
    isLoading: authLoading || isLoading,
  };
}
```

---

### Parte 3: DirectReportGuard Component

Componente wrapper que redireciona liderados para o onboarding quando necessario:

```typescript
// src/components/DirectReportGuard.tsx
export function DirectReportGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { linkedMember, isLinkedMember, needsOnboarding, isLoading } = useLinkedMember();
  
  useEffect(() => {
    // Nao redirecionar se ja esta no onboarding
    if (location.pathname === '/onboarding') return;
    
    // Redirecionar se e linked member e precisa de onboarding
    if (!isLoading && isLinkedMember && needsOnboarding) {
      navigate('/onboarding', { replace: true });
    }
  }, [isLoading, isLinkedMember, needsOnboarding, location.pathname, navigate]);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return <>{children}</>;
}
```

---

### Parte 4: Logica de Salvamento

Usar a RPC `update_member_own_data` existente para salvar os dados:

```typescript
const handleSubmit = async () => {
  setSubmitting(true);
  
  const skillsData = {
    role_tenure: formData.roleTenure,
    responsibilities: [
      formData.responsibility1,
      formData.responsibility2,
      formData.responsibility3,
    ].filter(Boolean),
    aspirations: formData.aspirations,
    interests: formData.interests,
    onboarding_completed: true,
    completed_at: new Date().toISOString(),
  };
  
  try {
    // Atualizar role via team_members direto (RLS permite linked_user)
    // A RPC atual nao atualiza role, precisaremos verificar
    
    const { data: success, error } = await supabase.rpc('update_member_own_data', {
      p_skills_data: skillsData,
    });
    
    if (error) throw error;
    if (!success) throw new Error('Nao foi possivel salvar os dados');
    
    // Se o cargo foi alterado, atualizar separadamente
    if (formData.role !== memberData.originalRole) {
      await supabase
        .from('team_members')
        .update({ role: formData.role })
        .eq('linked_user_id', user.id);
    }
    
    toast({ title: "Perfil configurado!", description: "Bem-vindo ao Rhitmo!" });
    navigate('/', { replace: true });
  } catch (err) {
    toast({ title: "Erro", description: err.message, variant: "destructive" });
  } finally {
    setSubmitting(false);
  }
};
```

---

### Parte 5: Atualizacoes no App.tsx

```tsx
// Importar nova pagina e guard
import Onboarding from "./pages/Onboarding";
import { DirectReportGuard } from "./components/DirectReportGuard";

// Dentro de <Routes>
{/* Rota de Onboarding para liderados */}
<Route path="/onboarding" element={<Onboarding />} />

{/* Dashboard com guard para detectar linked members */}
<Route 
  path="/dashboard" 
  element={
    <DirectReportGuard>
      <AppLayout><Index /></AppLayout>
    </DirectReportGuard>
  } 
/>
```

---

### Parte 6: JSX Completo da Pagina Onboarding.tsx

```tsx
export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormData>({
    role: '',
    roleTenure: '',
    responsibility1: '',
    responsibility2: '',
    responsibility3: '',
    aspirations: '',
    interests: [],
  });
  
  // Carregar dados do membro
  const { data: memberData, isLoading } = useQuery({
    queryKey: ['onboarding-member', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('team_members')
        .select('id, name, email, role')
        .eq('linked_user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  
  // Pre-preencher cargo quando dados carregarem
  useEffect(() => {
    if (memberData?.role) {
      setFormData(prev => ({ ...prev, role: memberData.role }));
    }
  }, [memberData]);
  
  // Validacao por passo
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Identidade
        return !!formData.role && !!formData.roleTenure;
      case 1: // Job Crafting
        return !!formData.responsibility1 && 
               !!formData.responsibility2 && 
               !!formData.responsibility3;
      case 2: // Futuro
        return !!formData.aspirations;
      default:
        return true;
    }
  };
  
  // Loading
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  // UI do Wizard
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-6 text-center border-b bg-card">
        <RhitmoLogo size="md" className="mx-auto mb-2" />
        <h1 className="text-xl font-bold">Bem-vindo ao Rhitmo</h1>
        <p className="text-sm text-muted-foreground">
          Ola, {memberData?.name}! Vamos configurar seu perfil
        </p>
      </div>

      {/* Progress */}
      <div className="px-4 py-4 bg-card/50">
        <StepIndicator steps={steps} currentIndex={currentStep} />
        <Progress value={(currentStep + 1) / 3 * 100} className="h-2 max-w-lg mx-auto" />
      </div>

      {/* Content por Step */}
      <div className="flex-1 flex items-start justify-center p-4 pt-6">
        <div className="max-w-2xl w-full space-y-6">
          {currentStep === 0 && <IdentityStep />}
          {currentStep === 1 && <JobCraftingStep />}
          {currentStep === 2 && <FutureStep />}
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t bg-card p-4">
        <NavigationButtons />
      </div>
    </div>
  );
}
```

---

### Secao Tecnica

#### Diagrama do Fluxo de Onboarding

```text
┌─────────────────────────────────────────────────────────────────┐
│                 FLUXO DE ONBOARDING DO LIDERADO                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Liderado faz login (via convite ou direto)                  │
│     └── AuthEventProvider vincula pending_invite                │
│     └── Redireciona para /dashboard                             │
│                                                                 │
│  2. DirectReportGuard verifica:                                 │
│     └── SELECT * FROM team_members WHERE linked_user_id = uid   │
│     └── Se skills_data.onboarding_completed = false/null        │
│         └── Redireciona para /onboarding                        │
│                                                                 │
│  3. Onboarding.tsx exibe Wizard de 3 passos:                    │
│     └── Passo 1: Identidade (nome/email readonly, cargo edit)   │
│     └── Passo 2: Job Crafting (3 responsabilidades)             │
│     └── Passo 3: Futuro (aspiracoes + areas de interesse)       │
│                                                                 │
│  4. Ao finalizar:                                               │
│     └── RPC update_member_own_data({ p_skills_data: {...} })    │
│     └── skills_data.onboarding_completed = true                 │
│     └── Redireciona para / (home)                               │
│                                                                 │
│  5. Proximas visitas:                                           │
│     └── DirectReportGuard verifica onboarding_completed = true  │
│     └── Permite acesso normal ao dashboard                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Estrutura do skills_data (JSONB)

```typescript
interface SkillsData {
  // Job Crafting Data
  role_tenure: 'less_than_1' | '1_to_3' | '3_to_5' | 'more_than_5';
  responsibilities: string[];  // Array de 3 strings
  aspirations: string;  // Texto livre
  interests: string[];  // Array de areas selecionadas
  
  // Controle
  onboarding_completed: boolean;
  completed_at: string;  // ISO timestamp
}
```

#### Atualizacao da RPC (se necessario)

A RPC `update_member_own_data` ja suporta `p_skills_data`, entao nao precisa de alteracao.

Porem, para permitir que o liderado atualize seu cargo, sera necessario:
- **Opcao 1**: Adicionar `p_role` a RPC existente
- **Opcao 2**: Permitir UPDATE direto via RLS (ja existe policy "Linked users can view own profile" mas e apenas SELECT)

Recomendamos criar uma nova migration para:
1. Adicionar parametro `p_role` a RPC `update_member_own_data`
2. OU criar policy de UPDATE para linked_user (mais simples)

```sql
-- Opcao mais simples: criar policy de UPDATE
CREATE POLICY "Linked users can update own basic profile"
ON public.team_members
FOR UPDATE
TO authenticated
USING (linked_user_id = auth.uid())
WITH CHECK (linked_user_id = auth.uid());
```

#### Componentes Reutilizados

| Componente | Origem | Uso |
|------------|--------|-----|
| `StepIndicator` | RhitmoSync.tsx | Indicador visual dos passos |
| `MultiSelectChips` | RhitmoSync.tsx | Selecao de areas de interesse |
| `Progress` | shadcn/ui | Barra de progresso |
| `RhitmoLogo` | Existente | Branding consistente |

#### Validacao de Acesso

O onboarding so deve ser acessivel por usuarios que:
1. Estao logados (`user !== null`)
2. Sao linked_members (`linked_user_id` preenchido)
3. NAO completaram o onboarding (`skills_data.onboarding_completed !== true`)

Se um usuario nao-liderado tentar acessar `/onboarding`, deve ser redirecionado para `/`.

```typescript
// Em Onboarding.tsx
useEffect(() => {
  if (!isLoading && !memberData) {
    // Nao e um linked member, redirecionar
    navigate('/', { replace: true });
  }
}, [isLoading, memberData, navigate]);
```

