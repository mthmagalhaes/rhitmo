

# Limpar citações do Rhitmo Mensal: prosa + chips de evidência

## Problema

Hoje os blocos "Mandou bem" e "Atenção" mostram o texto puro da IA, que vem assim:

> "Gabriela apresentou as análises de LTV... (feedback_id=c7d155ec-4709-4ef9-b671-ff395474ab40, data=2026-03-12)."

Dois bugs combinados:

1. **Prompt**: instruímos a IA a "citar o ID e a data" dentro do texto — então ela faz isso literalmente, com UUID no meio da frase.
2. **UI**: o campo `highlight_evidence` (JSONB) já é salvo estruturado no banco mas **não é renderizado**. A gente só mostra `highlight_text` cru.

A Avaliação Formal já tem o padrão certo (chips com nome + data, renderizadas separadamente do texto). Vamos trazer o mesmo padrão para o Mensal.

## O que muda

### 1. Prompt da `generate-monthly-recap` — texto limpo

Trocar a regra do system prompt:

- **Antes**: "cite o ID e a data da nota/1:1 de origem" dentro do texto.
- **Depois**: "escreva em prosa limpa, **sem IDs e sem datas no meio do texto**. As evidências vão no campo `evidence` separado, onde você cita os UUIDs reais — eles serão renderizados como chips na UI, não no parágrafo."

E adicionar uma instrução explícita no formato de saída:
> "O campo `text` deve ser uma frase factual sobre o que a pessoa fez. NÃO inclua `(feedback_id=...)`, `(data=...)`, nem qualquer marcação técnica. As referências vão no `evidence`."

### 2. Renderização das evidências como chips

Criar um sub-componente `EvidenceChips` em `MonthlyRecapSection.tsx` que, dado o array `evidence`, busca em paralelo os títulos das notas/1:1s e renderiza chips no estilo Creme/Bento:

```text
[📝 Apresentação de LTV/CAC no All Hands · 12/03]
[💬 1:1 sobre churn geral · 18/03]
```

- Ícone diferente para `feedback_id` (📝 ScrollText) vs `meeting_id` (💬 MessageSquare)
- Hover mostra borda violeta sutil
- Click abre a nota/transcrição original (link para `/member/{id}` com âncora ao feedback, padrão já usado no FeedbackTimeline)
- Chip com `rounded-xl`, `bg-muted/40`, `text-xs`, padding apertado

### 3. Hook `useEvidenceResolver`

Hook novo `src/hooks/useEvidenceResolver.ts` que recebe array de `{feedback_id?, meeting_id?, date}` e devolve `{ id, label, date, type, href }[]`:

- Faz **uma** query no Supabase: `feedbacks(id, content, summary)` + `meeting_transcripts(id, leader_notes)` filtrando por IDs presentes
- O "label" é: `summary` da nota se existir, senão primeiros ~60 chars do `content`/`leader_notes`. Sem aspas, sem ID.
- Cacheia via React Query com chave `['evidence-resolver', sortedIds]`

### 4. Limpeza retroativa (opcional, sugerido)

Para os rascunhos que já existem com IDs no texto (como o de fevereiro na imagem): adicionar um util `stripInlineEvidenceMarkers(text)` que remove regex `\s*\(feedback_id=[^)]+\)` e `\s*\(meeting_id=[^)]+\)` e `\s*\(data=[^)]+\)` antes de renderizar/editar. Aplicado no `useState` inicial do `RecapCard`.

Isso resolve o caso da imagem **sem precisar regerar** — quando o líder confirmar o rascunho, salva já limpo.

## Detalhes técnicos

**Arquivos editados:**
- `supabase/functions/generate-monthly-recap/index.ts` — reescrever `systemPrompt` regras 1, 5 + ajustar `userPrompt` formato de saída
- `src/components/recaps/MonthlyRecapSection.tsx` — adicionar `<EvidenceChips>` abaixo dos textareas de highlight e concern; aplicar `stripInlineEvidenceMarkers` no setState inicial

**Arquivos novos:**
- `src/hooks/useEvidenceResolver.ts` — hook React Query
- `src/components/recaps/EvidenceChips.tsx` — componente visual

**i18n:** novas chaves em `rhitmo-pt/en/es.json`:
- `recap.monthly.evidence.label` ("Evidências")
- `recap.monthly.evidence.empty` ("Nenhuma evidência vinculada")
- `recap.monthly.evidence.feedback` ("Anotação")
- `recap.monthly.evidence.meeting` ("1:1")

**Sem migration. Sem alterar schema.** O `highlight_evidence` JSONB já existe e já é populado.

## Critérios de aceite

- [ ] Novas mensais geradas vêm com texto limpo, sem `(feedback_id=...)` no parágrafo
- [ ] Abaixo do texto de "Mandou bem" e "Atenção" aparecem chips com nome curto da nota + data formatada (12/03)
- [ ] Click em uma chip leva à nota original
- [ ] Rascunhos antigos (como o de fev/2026 na imagem) ficam limpos automaticamente ao reabrir o card
- [ ] Strings em PT/EN/ES
- [ ] Padrão visual Creme/Bento (rounded-xl, ícones lucide, sem borda dura)

