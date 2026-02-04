

## Plano: Visualização Unificada Rhitmo Sync (V1 + V2)

### Problema

Perfis com dados V2 do Rhitmo Sync (chronotype, feedback_style, recognition_style, motivators) aparecem com seções vazias, enquanto perfis V1 mostram chips coloridos. Isso ocorre porque:

1. O `styleConfig` atual só tem mapeamentos para campos V1 (processing, feedback, autonomy, energy, motivation)
2. Os novos campos V2 são armazenados em colunas separadas (`member.chronotype`, `member.feedback_style`, etc.) e não em `work_style_data`
3. Não há renderização para arrays (motivators)

### Estrutura de Dados Atual

| Versão | Campos | Armazenamento |
|--------|--------|---------------|
| V1 | processing, feedback, autonomy, energy, motivation | `work_style_data` (JSONB) |
| V2 | chronotype, feedback_style, recognition_style, motivators | Colunas separadas na tabela |
| V2 | stress_signs, hobbies, ideal_environment, etc. | `user_manual` (JSONB) |

---

### Parte 1: Expandir `styleConfig` em WorkStyleCard.tsx

Adicionar mapeamentos visuais para os campos V2:

```typescript
export const styleConfig = {
  // ... campos V1 existentes ...

  // V2: Cronotipo
  chronotype: {
    morning: { label: 'Madrugador (5h-10h)', icon: Sunrise, color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
    commercial: { label: 'Horário Comercial', icon: Briefcase, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
    night: { label: 'Noturno / Tarde', icon: Moon, color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' }
  },

  // V2: Estilo de Feedback (diferente do V1 "feedback")
  feedback_style: {
    direct: { label: 'Direto ao Ponto', icon: Zap, color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
    empathetic: { label: 'Empático / Sanduíche', icon: Heart, color: 'bg-pink-500/10 text-pink-700 dark:text-pink-400' },
    written: { label: 'Por Escrito Primeiro', icon: FileText, color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400' }
  },

  // V2: Estilo de Reconhecimento
  recognition_style: {
    public: { label: 'Reconhecimento Público', icon: Megaphone, color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
    private: { label: 'Reconhecimento Privado', icon: Lock, color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' }
  },

  // V2: Motivadores (array)
  motivators: {
    autonomy: { label: 'Autonomia', icon: Compass, color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400' },
    money: { label: 'Dinheiro', icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
    stability: { label: 'Estabilidade', icon: Shield, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
    learning: { label: 'Aprendizado', icon: GraduationCap, color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
    purpose: { label: 'Propósito', icon: Heart, color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' },
    status: { label: 'Status', icon: Crown, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' }
  }
};
```

---

### Parte 2: Atualizar Renderização em MemberDetails.tsx

#### 2.1 Adicionar Imports de Ícones

```typescript
import { 
  ArrowLeft, PenSquare, Loader2, Sparkles, Mail, Copy, Target, Music, BookOpen, FileText, Clock, Lock, ArrowRight,
  Briefcase, Heart, Megaphone, Compass, DollarSign, Shield, GraduationCap, Crown, HelpCircle
} from 'lucide-react';
```

#### 2.2 Lógica de Renderização Híbrida

Detectar se é V1 ou V2 e renderizar apropriadamente:

```typescript
// Detectar versão dos dados
const hasV2Data = member.chronotype || member.feedback_style || member.recognition_style || 
                  (member.motivators && Array.isArray(member.motivators) && member.motivators.length > 0);
const hasV1Data = member.work_style_data && 
                  (member.work_style_data as unknown as WorkStyleData).processing;

// Determinar data de preenchimento
const completedAt = hasV2Data 
  ? (member.work_style_data as any)?.completed_at 
  : (member.work_style_data as unknown as WorkStyleData)?.completed_at;
```

#### 2.3 Nova Estrutura de Renderização

Se V2 (campos novos existem):
- Mostrar Cronotipo (chronotype)
- Mostrar Estilo de Feedback V2 (feedback_style)
- Mostrar Reconhecimento (recognition_style)
- Mostrar Motivadores (múltiplos chips)

Se V1 (apenas work_style_data):
- Mostrar campos antigos (processing, feedback, autonomy, energy, motivation)

#### 2.4 Renderização de Motivadores (Array)

```typescript
{/* Motivadores - Campo Array */}
{member.motivators && Array.isArray(member.motivators) && member.motivators.length > 0 && (
  <div className="space-y-2">
    <p className="text-sm font-medium text-muted-foreground">Motivadores Principais</p>
    <div className="flex flex-wrap gap-2">
      {(member.motivators as string[]).map((motivator) => {
        const config = styleConfig.motivators?.[motivator as keyof typeof styleConfig.motivators];
        if (!config) {
          // Fallback para motivadores desconhecidos
          return (
            <Badge key={motivator} variant="secondary" className="gap-2 py-2 px-3 bg-gray-500/10 text-gray-700">
              <HelpCircle className="h-4 w-4" />
              {motivator.charAt(0).toUpperCase() + motivator.slice(1)}
            </Badge>
          );
        }
        const Icon = config.icon;
        return (
          <Badge key={motivator} variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
            <Icon className="h-4 w-4" />
            {config.label}
          </Badge>
        );
      })}
    </div>
  </div>
)}
```

---

### Parte 3: Fallback Visual

Para qualquer campo que exista no banco mas não tenha configuração visual:

```typescript
// Função helper para renderizar badge com fallback
const renderBadge = (configCategory: any, key: string | undefined) => {
  if (!key) return null;
  const config = configCategory?.[key];
  
  if (!config) {
    // Fallback genérico
    return (
      <Badge variant="secondary" className="gap-2 py-2 px-3 bg-gray-500/10 text-gray-600">
        <HelpCircle className="h-4 w-4" />
        {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
      </Badge>
    );
  }
  
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
      <Icon className="h-4 w-4" />
      {config.label}
    </Badge>
  );
};
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/WorkStyleCard.tsx` | Expandir `styleConfig` com chronotype, feedback_style, recognition_style, motivators + novos imports de ícones |
| `src/pages/MemberDetails.tsx` | Adicionar imports de ícones, lógica híbrida V1/V2, renderização de motivadores (array), fallback visual |

---

### Seção Técnica

**Fluxo de Decisão na Renderização:**

```text
member.work_style_data existe?
         │
    ┌────┴────┐
    │ NÃO    │ SIM
    │        ▼
    │   hasV2Data = member.chronotype || member.feedback_style || 
    │              member.recognition_style || member.motivators.length > 0
    │        │
    │   ┌────┴────┐
    │   │ TRUE   │ FALSE
    │   │        │
    │   ▼        ▼
    │  RENDER   RENDER
    │  V2       V1
    │  Fields   Fields
    │        │
    └────────┴─────────────────────┘
```

**Campos V2 a Renderizar:**

| Campo | Tipo | Origem | Renderização |
|-------|------|--------|--------------|
| chronotype | string | `member.chronotype` | 1 Badge |
| feedback_style | string | `member.feedback_style` | 1 Badge |
| recognition_style | string | `member.recognition_style` | 1 Badge |
| motivators | string[] | `member.motivators` | N Badges (máx 3) |

**Ícones a Importar:**

| Ícone | Uso |
|-------|-----|
| Briefcase | Cronotipo Comercial |
| Heart | Feedback Empático, Motivador Propósito |
| FileText | Feedback Escrito |
| Megaphone | Reconhecimento Público |
| Lock | Reconhecimento Privado (já importado) |
| Compass | Motivador Autonomia |
| DollarSign | Motivador Dinheiro |
| Shield | Motivador Estabilidade |
| GraduationCap | Motivador Aprendizado |
| Crown | Motivador Status |
| HelpCircle | Fallback genérico |

