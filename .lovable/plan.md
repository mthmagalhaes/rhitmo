

## Plano: Rhitmo Sync 2.0 - Manual do Usuário (Wizard)

### Objetivo

Evoluir a página de Rhitmo Sync para uma experiência de wizard mais completa, coletando dados comportamentais profundos que alimentarão a Análise Holística da IA. O visual será dark/violet com 4 passos organizados.

---

### Estado Atual

| Item | Situação |
|------|----------|
| Tabela `team_members` | Possui `work_style_data` (JSONB) e `user_manual` (JSONB) |
| Campos coletados atualmente | 5 perguntas simples (processing, feedback, autonomy, energy, motivation) |
| Dados demográficos | Não coletados |
| Respostas abertas | Não coletadas |
| RPC `submit_rhitmo_sync` | Atualiza apenas `work_style_data` |

---

### Parte 1: Alterações no Banco de Dados

Adicionar novas colunas à tabela `team_members`:

```sql
-- Dados demográficos
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS birth_year INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS chronotype TEXT CHECK (chronotype IN ('morning', 'commercial', 'night'));

-- Preferências de trabalho expandidas
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS feedback_style TEXT CHECK (feedback_style IN ('direct', 'empathetic', 'written')),
ADD COLUMN IF NOT EXISTS recognition_style TEXT CHECK (recognition_style IN ('public', 'private')),
ADD COLUMN IF NOT EXISTS motivators JSONB DEFAULT '[]'::jsonb;
```

O campo `user_manual` (JSONB, já existe) armazenará:
- `stress_signs`: Sinais de stress
- `bad_day_support`: Como ajudar em dias ruins
- `ideal_environment`: Ambiente ideal
- `hobbies`: Hobbies/interesses
- `energy_drainers`: O que drena energia
- `energy_boosters`: O que carrega energia
- `skill_goal`: Meta de skill

---

### Parte 2: Atualizar RPC `submit_rhitmo_sync`

Criar nova versão da função para aceitar todos os novos dados:

```sql
CREATE OR REPLACE FUNCTION public.submit_rhitmo_sync_v2(
  p_member_id UUID,
  p_birth_year INTEGER DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_chronotype TEXT DEFAULT NULL,
  p_feedback_style TEXT DEFAULT NULL,
  p_recognition_style TEXT DEFAULT NULL,
  p_motivators JSONB DEFAULT NULL,
  p_user_manual JSONB DEFAULT NULL,
  p_work_style_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só atualiza se work_style_data ainda for NULL (previne re-submissão)
  UPDATE public.team_members
  SET 
    birth_year = COALESCE(p_birth_year, birth_year),
    gender = COALESCE(p_gender, gender),
    chronotype = COALESCE(p_chronotype, chronotype),
    feedback_style = COALESCE(p_feedback_style, feedback_style),
    recognition_style = COALESCE(p_recognition_style, recognition_style),
    motivators = COALESCE(p_motivators, motivators),
    user_manual = COALESCE(p_user_manual, user_manual),
    work_style_data = COALESCE(p_work_style_data, work_style_data),
    updated_at = now()
  WHERE id = p_member_id
    AND work_style_data IS NULL;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_rhitmo_sync_v2 TO public;
GRANT EXECUTE ON FUNCTION public.submit_rhitmo_sync_v2 TO anon;
```

---

### Parte 3: Nova Interface - RhitmoSyncWizard

Refatorar `src/pages/RhitmoSync.tsx` com estrutura de 4 passos:

#### Estrutura de Steps

```typescript
type WizardStep = 'identity' | 'rhythm' | 'manual' | 'future';

const steps: { id: WizardStep; title: string; emoji: string }[] = [
  { id: 'identity', title: 'Quem Sou Eu', emoji: '🆔' },
  { id: 'rhythm', title: 'Ritmo e Energia', emoji: '⚡' },
  { id: 'manual', title: 'Manual de Instruções', emoji: '🆘' },
  { id: 'future', title: 'Futuro', emoji: '🚀' },
];
```

#### Interface de Dados

```typescript
interface SyncFormData {
  // Step 1: Identity
  gender: string;
  birthYear: number | null;
  hobbies: string;
  
  // Step 2: Rhythm
  chronotype: 'morning' | 'commercial' | 'night';
  idealEnvironment: 'silence' | 'music' | 'buzz';
  energyDrainers: string;
  energyBoosters: string;
  
  // Step 3: Manual
  stressSigns: string;
  badDaySupport: string;
  feedbackStyle: 'direct' | 'empathetic' | 'written';
  recognitionStyle: 'public' | 'private';
  
  // Step 4: Future
  motivators: string[]; // max 3
  skillGoal: string;
}
```

---

### Parte 4: Design de Cada Step

#### Step 1: Quem Sou Eu 🆔

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Gênero | Select | Masculino, Feminino, Outro, Prefiro não dizer |
| Ano de Nascimento | Number Input | 4 dígitos (1950-2010) |
| Hobbies | Textarea curto | "Fora do trabalho eu..." |

#### Step 2: Ritmo e Energia ⚡

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Cronotipo | 3 Cards Selecionáveis | 🌅 Madrugador, 🏢 Comercial, 🦉 Noturno |
| Ambiente Ideal | Select | Silêncio, Música/Ruído de fundo, Agito/Coworking |
| O que drena energia | Textarea | Texto livre |
| O que carrega energia | Textarea | Texto livre |

#### Step 3: Manual de Instruções 🆘 (Coração da IA)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Sinais de Stress | Textarea | "Quando estou estressado, eu..." |
| Apoio em dias ruins | Textarea | "Em dias ruins, me ajude..." |
| Estilo de Feedback | 3 Cards | 💬 Direto, 🤗 Empático/Sanduíche, ✍️ Escrito |
| Reconhecimento | 2 Cards | 👥 Público, 🔒 Privado |

#### Step 4: Futuro 🚀

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Motivadores | Multi-select (max 3) | Autonomia, Dinheiro, Estabilidade, Aprendizado, Propósito, Status |
| Meta de Skill | Input | "Quero aprender..." |

---

### Parte 5: Componentes UI Necessários

Criar/usar componentes:

1. **SelectableCard** - Card clicável com ícone, título e descrição
2. **MultiSelectChips** - Chips selecionáveis com limite máximo
3. **StepIndicator** - Indicador de progresso do wizard

```tsx
// Exemplo SelectableCard
<Card 
  className={cn(
    "cursor-pointer transition-all hover:scale-105",
    selected ? "border-primary bg-primary/10 ring-2 ring-primary" : "hover:border-primary/50"
  )}
  onClick={onSelect}
>
  <div className="text-center p-6 space-y-3">
    <div className="text-4xl">{emoji}</div>
    <h4 className="font-semibold">{title}</h4>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
</Card>
```

---

### Parte 6: Lógica de Submissão

```typescript
const handleSubmit = async () => {
  const userManual = {
    stress_signs: formData.stressSigns,
    bad_day_support: formData.badDaySupport,
    ideal_environment: formData.idealEnvironment,
    hobbies: formData.hobbies,
    energy_drainers: formData.energyDrainers,
    energy_boosters: formData.energyBoosters,
    skill_goal: formData.skillGoal,
  };

  const workStyleData = {
    completed_at: new Date().toISOString(),
    version: 2,
  };

  const { error } = await supabase.rpc('submit_rhitmo_sync_v2', {
    p_member_id: memberId,
    p_birth_year: formData.birthYear,
    p_gender: formData.gender,
    p_chronotype: formData.chronotype,
    p_feedback_style: formData.feedbackStyle,
    p_recognition_style: formData.recognitionStyle,
    p_motivators: formData.motivators,
    p_user_manual: userManual,
    p_work_style_data: workStyleData,
  });
};
```

---

### Parte 7: Tela de Sucesso

```tsx
<div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
  <Card className="max-w-md p-8 text-center space-y-6">
    <div className="text-6xl">🎧</div>
    <h1 className="text-2xl font-bold">Perfil Sintonizado!</h1>
    <p className="text-muted-foreground">
      O seu líder já recebeu seu manual. Agora ele pode te ajudar 
      de forma mais assertiva e personalizada.
    </p>
    <div className="pt-4">
      <p className="text-sm text-muted-foreground">
        Você pode fechar esta página.
      </p>
    </div>
  </Card>
</div>
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Adicionar colunas + criar `submit_rhitmo_sync_v2` |
| `src/pages/RhitmoSync.tsx` | Refatorar completamente para wizard de 4 steps |
| `src/components/WorkStyleCard.tsx` | Atualizar para exibir novos dados (opcional, futuro) |

---

### Seção Técnica

**Estrutura do Wizard:**

```text
┌──────────────────────────────────────────────────────────────────────┐
│  🎵 Rhitmo Sync                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  [●] Quem Sou  [○] Ritmo  [○] Manual  [○] Futuro     ← Progress Bar  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Step Content Area                                                   │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │
│  │  🌅            │  │  🏢            │  │  🦉            │         │
│  │  Madrugador    │  │  Comercial     │  │  Noturno       │         │
│  │  5h-7h         │  │  8h-18h        │  │  Depois 18h    │         │
│  └────────────────┘  └────────────────┘  └────────────────┘         │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  [← Anterior]                                        [Próximo →]     │
└──────────────────────────────────────────────────────────────────────┘
```

**Fluxo de Dados:**

```text
Usuário acessa /sync/:memberId
         │
         ▼
┌─────────────────────────────────┐
│ Step 1: Quem Sou Eu            │
│ - Gênero (select)              │
│ - Ano nascimento (input)       │
│ - Hobbies (textarea)           │
└───────────────┬─────────────────┘
                │ Próximo
                ▼
┌─────────────────────────────────┐
│ Step 2: Ritmo e Energia        │
│ - Cronotipo (3 cards)          │
│ - Ambiente (select)            │
│ - Drena/Carrega (textareas)    │
└───────────────┬─────────────────┘
                │ Próximo
                ▼
┌─────────────────────────────────┐
│ Step 3: Manual de Instruções   │
│ - Sinais stress (textarea)     │
│ - Apoio dias ruins (textarea)  │
│ - Feedback style (3 cards)     │
│ - Reconhecimento (2 cards)     │
└───────────────┬─────────────────┘
                │ Próximo
                ▼
┌─────────────────────────────────┐
│ Step 4: Futuro                 │
│ - Motivadores (multi max 3)    │
│ - Skill goal (input)           │
└───────────────┬─────────────────┘
                │ Enviar
                ▼
┌─────────────────────────────────┐
│ RPC submit_rhitmo_sync_v2      │
│ - birth_year, gender           │
│ - chronotype, feedback_style   │
│ - recognition_style            │
│ - motivators (JSONB array)     │
│ - user_manual (JSONB object)   │
│ - work_style_data (marker)     │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Tela de Sucesso                │
│ 🎧 "Perfil Sintonizado!"       │
└─────────────────────────────────┘
```

**Validação por Step:**

| Step | Campos Obrigatórios |
|------|---------------------|
| 1 | Nenhum (todos opcionais para não invasivo) |
| 2 | Cronotipo |
| 3 | Feedback Style, Recognition Style |
| 4 | Pelo menos 1 motivador |

**Estrutura do JSONB `user_manual`:**

```json
{
  "stress_signs": "Fico quieto e não respondo mensagens...",
  "bad_day_support": "Me dê espaço, mas pergunte se preciso de algo",
  "ideal_environment": "music",
  "hobbies": "Corrida, jogos de tabuleiro, ler ficção",
  "energy_drainers": "Reuniões longas sem pauta, interrupções constantes",
  "energy_boosters": "Tempo para trabalho focado, reconhecimento",
  "skill_goal": "Melhorar apresentações em público"
}
```

