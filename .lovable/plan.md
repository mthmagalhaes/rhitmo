

## Plano: Implementar Smart Tags (Auto-Classificação de Notas)

### Visão Geral

Adicionar um sistema de classificação automática de notas utilizando IA, permitindo que o líder identifique visualmente o "tipo" de conversa sem precisar ler o conteúdo.

---

### Parte 1: Banco de Dados

Adicionar coluna `tags` na tabela `feedbacks`:

```sql
ALTER TABLE feedbacks 
ADD COLUMN tags TEXT[] DEFAULT '{}';
```

**Nota**: A tabela é `feedbacks` (não `notes`), conforme identificado no schema existente.

---

### Parte 2: Nova Edge Function (`classify-note`)

Criar função em `supabase/functions/classify-note/index.ts`:

**Configuração de CORS e Autenticação:**
- `verify_jwt = true` (usuário deve estar autenticado)
- Recebe: `{ content: string }`
- Retorna: `{ tags: string[] }`

**System Prompt (Taxonomia de Tags):**

```text
Você é um classificador de reuniões corporativas. Analise o texto e retorne ATÉ 2 tags desta lista:

🎯 1:1 - Conversas individuais livres, alinhamento semanal, conexão pessoal
🚀 PDI - Conversas sobre carreira, futuro, promoções, desenvolvimento de skills
🚨 Feedback Difícil - Correção de rota, performance baixa, comportamento inadequado, demissão
✅ Check-in - Status report, acompanhamento de projetos, prazos, burocracia do dia a dia
📢 Reunião Geral - Reuniões com 3+ pessoas, alinhamentos de área, townhalls
🧠 Brainstorming - Ideação, resolução de problemas complexos sem pauta fixa

REGRAS:
1. Se não tiver certeza absoluta, use apenas UMA tag
2. Se for misto (ex: 1:1 que virou PDI), use as DUAS tags relevantes
3. SEMPRE retorne pelo menos uma tag
4. Retorne APENAS os nomes das tags, sem emojis
```

**Tool Calling para Structured Output:**
```typescript
tools: [{
  type: "function",
  function: {
    name: "classify_note",
    parameters: {
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: { 
            type: "string",
            enum: ["1:1", "PDI", "Feedback Difícil", "Check-in", "Reunião Geral", "Brainstorming"]
          },
          maxItems: 2
        }
      },
      required: ["tags"]
    }
  }
}]
```

---

### Parte 3: Interface de Criação (`NewNoteDialog.tsx`)

#### 3.1 Novo Estado

```typescript
const [tags, setTags] = useState<string[]>([]);
const [isClassifying, setIsClassifying] = useState(false);
```

#### 3.2 Botão "Gerar Tags"

Posição: Abaixo do campo de conteúdo, ao lado do VoiceInput

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleClassifyNote}
  disabled={!content.trim() || isClassifying || loading}
  className="gap-2"
>
  {isClassifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
  Gerar Tags
</Button>
```

#### 3.3 Chips de Tags Removíveis

Posição: Acima ou abaixo do campo de Data

```tsx
{tags.length > 0 && (
  <div className="flex flex-wrap gap-2">
    {tags.map((tag) => (
      <Badge key={tag} variant="secondary" className={getTagColor(tag)}>
        {getTagEmoji(tag)} {tag}
        <button onClick={() => removeTag(tag)} className="ml-1">
          <X className="h-3 w-3" />
        </button>
      </Badge>
    ))}
  </div>
)}
```

#### 3.4 Atualizar handleSubmit

Incluir `tags` no INSERT:

```typescript
const { data: feedback, error: insertError } = await supabase
  .from('feedbacks')
  .insert({
    // ... existing fields
    tags: tags, // ← NOVO
  })
```

---

### Parte 4: Interface de Listagem (`FeedbackTimeline.tsx`)

#### 4.1 Atualizar Interface

```typescript
interface Feedback {
  id: string;
  created_at: string;
  occurred_at?: string;
  content: string;
  type: 'positive' | 'constructive' | 'neutral';
  tags?: string[]; // ← NOVO
}
```

#### 4.2 Renderizar Tags no Card

Posição: No header, ao lado da data

```tsx
{/* Tags */}
{feedback.tags && feedback.tags.length > 0 && (
  <div className="flex flex-wrap gap-1.5">
    {feedback.tags.map((tag) => (
      <Badge key={tag} variant="secondary" className={cn("text-xs py-0.5", getTagColor(tag))}>
        {getTagEmoji(tag)} {tag}
      </Badge>
    ))}
  </div>
)}
```

#### 4.3 Mapa de Cores e Emojis

Criar constante compartilhada ou inline:

```typescript
const TAG_CONFIG: Record<string, { emoji: string; color: string }> = {
  "1:1": { emoji: "🎯", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  "PDI": { emoji: "🚀", color: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
  "Feedback Difícil": { emoji: "🚨", color: "bg-red-500/10 text-red-700 dark:text-red-400" },
  "Check-in": { emoji: "✅", color: "bg-green-500/10 text-green-700 dark:text-green-400" },
  "Reunião Geral": { emoji: "📢", color: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
  "Brainstorming": { emoji: "🧠", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
};
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| **Migration SQL** | Adicionar coluna `tags TEXT[]` na tabela `feedbacks` |
| `supabase/config.toml` | Registrar função `classify-note` com `verify_jwt = true` |
| `supabase/functions/classify-note/index.ts` | **NOVO** - Edge function para classificação com IA |
| `src/components/NewNoteDialog.tsx` | Adicionar estado `tags`, botão "Gerar Tags", chips removíveis, incluir no INSERT |
| `src/components/FeedbackTimeline.tsx` | Renderizar tags com cores no card de feedback |
| `src/lib/tagConfig.ts` (opcional) | **NOVO** - Constantes compartilhadas de cores/emojis |

---

### Seção Técnica

#### Fluxo de Dados

```text
Usuário digita/cola transcrição
        │
        ▼
Clica em "✨ Gerar Tags"
        │
        ▼
Frontend → classify-note Edge Function
        │
        ▼
Edge Function → Lovable AI Gateway
        │
        ▼
IA classifica → ["1:1", "PDI"]
        │
        ▼
Retorna tags → Frontend exibe chips
        │
        ▼
Usuário pode remover/manter
        │
        ▼
Salvar → tags[] vão para o banco
        │
        ▼
Listagem → FeedbackTimeline exibe badges coloridos
```

#### Por que Gerar Tags sob Demanda (não automático)?

1. **Controle do Usuário**: O líder decide se quer classificar ou não
2. **Economia de Créditos**: Não gasta IA em notas simples
3. **Transparência**: O usuário vê e pode ajustar antes de salvar
4. **Velocidade**: Não bloqueia o fluxo de salvar nota

#### Modelo de IA

Usar Lovable AI Gateway com `google/gemini-2.5-flash` (default) para:
- Baixo custo
- Resposta rápida (~1-2s)
- Suficiente para classificação simples

