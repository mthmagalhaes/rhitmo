## Sprint 8.2 — Citações Clicáveis (Rastro Auditável da IA)

Objetivo: transformar referências `[doc:UUID]` geradas pela IA em chips clicáveis que abrem um drawer lateral mostrando a evidência original do `context_evidence`. O líder lê o conselho da IA → clica no chip → o drawer desliza pela direita com o fato real → fecha e segue lendo.

### Arquitetura de UX

```text
Resposta da IA (markdown)
   "...você priorizou X em vez de Y [doc:8af1...]..."
                         │
                         ▼ (parser regex no react-markdown)
   "...você priorizou X em vez de Y  [📄 1]"  ← CitationChip
                         │ click
                         ▼
   ┌─ Sheet lateral (right) ─────────────────┐
   │ Badge fonte (Recall.ai)                  │
   │ Título · 12 mar 2026                     │
   │ ─────────────────────────────────────── │
   │ Conteúdo completo da evidência           │
   │ (transcrição / nota / kudo / pulse)      │
   └──────────────────────────────────────────┘
```

### Componentes a criar

1. **`src/components/context/CitationChip.tsx`**
   - Props: `docId: string`, `index?: number` (numeração visual), `inline?: boolean`.
   - Visual: `inline-flex` rounded-full, `bg-primary/8`, ícone `FileText` (lucide) 12px + número. Hover lift sutil. Estética Creme/Bento (`rounded-full`, sombra muito leve).
   - Ação: `onClick` despacha um custom event `rhitmo:open-evidence` com `{ docId }` (evita prop drilling pelo react-markdown).

2. **`src/components/context/EvidenceDrawer.tsx`**
   - Monta um `<Sheet side="right">` (shadcn) controlado por estado interno.
   - Escuta `rhitmo:open-evidence` no `window` → abre com o `docId`.
   - Usa `useEvidenceById(docId)` para carregar a linha de `context_evidence`.
   - Mostra:
     - **Badge de fonte** (mapeia `source_table` → label/cor/ícone): `meeting_transcripts` → "Recall.ai", `feedbacks` → "Diário", `slack_ambient_evidence` → "Slack", `kudos` → "Kudo", `member_prompts` → "Pulse", `goals` → "Meta", `performance_reviews` → "Avaliação", `leader_nudges` → "Nudge".
     - **Título** (`title` ou fallback por tipo) e **data** (`occurred_at` formatada `dd MMM yyyy · HH:mm` em pt-BR via date-fns).
     - **Conteúdo completo**: busca lazy do conteúdo original no `source_table` (ex: `meeting_transcripts.transcript_text`, `feedbacks.content`, `slack_ambient_evidence.message_text`, etc.). Se RLS bloquear, mostra fallback com `summary`.
     - Footer: link "Ver no contexto completo" → futura `/contexto/:memberId`.
   - Estados: loading skeleton, erro ("Evidência não encontrada ou sem permissão"), vazio.
   - Montado uma vez globalmente em `App.tsx` (singleton listener).

3. **`src/hooks/useEvidenceById.ts`**
   - `useQuery(['evidence', docId])`.
   - Passo 1: `select * from context_evidence where id = docId` (RLS já protege).
   - Passo 2: com base em `source_table` + `source_id`, busca o conteúdo bruto na tabela origem (switch/case com selects mínimos). Retorna `{ evidence, fullContent }`.

### Renderização nas respostas da IA

4. **Helper compartilhado `src/lib/markdownCitations.tsx`**
   - Exporta `withCitations(markdown: string): string` que **mantém** o texto mas garante que `[doc:UUID]` esteja em uma forma estável (ex: nada a fazer — só normaliza espaçamento ao redor).
   - Exporta `citationMarkdownComponents` — `components` para `react-markdown` que sobrescreve `p`, `li`, `td`, `strong`, `em` (qualquer nó com `children` string) usando uma função `renderWithCitations(children)` que faz `String.split` no regex `/\[doc:([0-9a-f-]{36})\]/gi` e substitui por `<CitationChip docId={uuid} index={n} />`. Numeração sequencial por mensagem (passada via contexto React `CitationCounterProvider`).

5. **Integração nos consumers**:
   - **`src/components/MentorChat.tsx`** (linha ~658-693): mesclar `citationMarkdownComponents` ao `markdownComponents` existente (sobrescreve `p`/`li`/`strong`). Envolver cada bolha de assistente com `<CitationCounterProvider>` para resetar numeração por mensagem.
   - **`src/components/review/FormalReviewSheet.tsx`** (linha 485): trocar `components={{ em: EvidenceTag }}` por `components={{ em: EvidenceTag, ...citationMarkdownComponents }}`.
   - **`src/components/ReviewViewDialog.tsx`** (linhas 443, 473): aplicar mesmo `components`.

6. **Montagem global do Drawer**:
   - Em `src/App.tsx`, adicionar `<EvidenceDrawer />` perto dos `<Toaster />`. Singleton, escuta evento global → não polui árvores filhas.

### Atualização dos prompts da IA (gera o `[doc:UUID]`)

O backend já tem `context_evidence.id` por evidência, mas hoje os prompts não pedem citação nesse formato. Atualizar **prompts-only** (sem mudar lógica RAG):

7. **`supabase/functions/chat-mentor/index.ts`** — no system prompt do RAG, adicionar bloco:
   > "Sempre que afirmar um fato baseado em evidência, anexe a citação no formato `[doc:UUID]` imediatamente após a frase. Use o `id` recebido em `context_evidence` no contexto. Não invente IDs. Não cite se não houver evidência."
   - Garantir que o contexto enviado ao modelo já inclua `id` de cada chunk (ajustar a montagem do contexto se necessário).

8. **`supabase/functions/generate-formal-review/index.ts`** e **`generate-review/index.ts`** — mesma instrução de citação. Manter `(fonte: ...)` legacy funcionando (EvidenceTag continua) — adicionamos citações estruturadas em paralelo.

> Não tocar `generate-brief`, `generate-nudges`, recaps neste sprint para limitar escopo. Backlog explícito.

### Segurança / RLS

- `context_evidence` já tem RLS (Sprint 8.1) — leitor só vê o que tem direito. O `useEvidenceById` confia 100% nisso.
- A busca no `source_table` original também passa por RLS de cada tabela. Se falhar, mostramos summary.
- Nenhuma RPC nova necessária neste sprint.

### Aceitação

- IA do Mentor Chat e da Review gera respostas com `[doc:UUID]` e a UI renderiza chips numerados (`[📄 1]`, `[📄 2]`) inline com o texto.
- Clicar em qualquer chip abre o `<Sheet>` à direita (slide animation padrão shadcn) sem mudar de rota.
- Drawer mostra badge da fonte, título, data formatada PT-BR e conteúdo completo (ou summary fallback).
- Liderado A não consegue abrir evidência do liderado B (RLS bloqueia → estado de erro amigável).
- Fechar o Sheet preserva a posição de scroll da conversa/review.
- UUID inválido ou removido → drawer mostra "Evidência não disponível" sem quebrar.

### Arquivos

Criar:
- `src/components/context/CitationChip.tsx`
- `src/components/context/EvidenceDrawer.tsx`
- `src/components/context/CitationCounterProvider.tsx`
- `src/components/context/sourceMeta.ts` (mapa source_table → {label, icon, color})
- `src/hooks/useEvidenceById.ts`
- `src/lib/markdownCitations.tsx`

Editar:
- `src/App.tsx` (montar `<EvidenceDrawer />` global)
- `src/components/MentorChat.tsx` (mesclar components + provider)
- `src/components/review/FormalReviewSheet.tsx` (mesclar components)
- `src/components/ReviewViewDialog.tsx` (mesclar components)
- `supabase/functions/chat-mentor/index.ts` (prompt + incluir id no contexto)
- `supabase/functions/generate-formal-review/index.ts` (prompt)
- `supabase/functions/generate-review/index.ts` (prompt)

### Fora de escopo (Sprint 8.3+)

- Página `/contexto/:memberId` (timeline cheia).
- Citações em recaps mensais/trimestrais e nudges.
- Highlight bidirecional (hover no chip → highlight no drawer aberto).
