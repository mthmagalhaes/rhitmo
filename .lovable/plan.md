## Problema

Os cards de Resumo Semanal expandidos hoje mostram só o parágrafo da IA. Faltam os blocos que existiam na antiga aba "Sinais do Slack" (e que o usuário pediu para resgatar):

- **Temas** detectados (tags)
- **Top canais** onde a pessoa atuou
- **Top parceiros** (com quem mais conversou)
- **Avaliação Rhitmo** (tom)
- **Evidências-fonte** (mensagens originais com permalink pro Slack)

Hoje o componente espera `highlights[]`, `ai_assessment` e `evidence_ids` por highlight — mas os rollups que já estão no banco (`context_evidence.metadata`) seguem o schema antigo: `themes[]`, `top_channels[]`, `top_collaborators[]`, `evidence_count`, `window_start`, `window_end`. Por isso o expand fica vazio.

## Solução

Renderizar **ambos os schemas** no card expandido (legado + novo), e buscar evidências-fonte direto em `slack_ambient_evidence` pela janela `member_id + captured_at BETWEEN window_start AND window_end` quando não houver `evidence_ids`.

### 1. `src/pages/lider/Diario.tsx` — carregar metadata completo

Estender `SlackRollupItem` e o mapper para incluir os campos legados:

```ts
themes: string[];
top_channels: string[];
top_collaborators: { name: string; interactions: number }[];
evidence_count: number;
window_start: string | null;
window_end: string | null;
```

Mapear de `r.metadata.themes`, `r.metadata.top_channels`, etc. (fallback `[]`).

### 2. `src/components/leader/diario/SlackRollupFeedItem.tsx` — bloco expandido enriquecido

Ordem dentro do `open && (...)`:

1. **Narrativa** (já existe — `displayedSummary` ou editor).
2. **Avaliação Rhitmo** (já existe, quando `ai_assessment`).
3. **Temas** — chips horizontais (`Badge` secundary) de `themes[]` quando houver. Header pequeno "Temas".
4. **Atividade** — grid 2 colunas (`md:grid-cols-2`):
   - **Canais ativos**: lista `top_channels` (até 5) com `#nome` em `text-primary/80`.
   - **Colabora com**: lista `top_collaborators` (até 5) com nome + `(N)` em `text-muted-foreground`.
5. **Highlights** (quando `highlights.length > 0` — schema novo): bullets com chip de subject.
6. **Evidências-fonte** (expansível): botão "Ver evidências (N)" onde N = `evidence_count` (ou `evidence_ids.length` se houver). Ao abrir, lazy-load:
   - Se `evidence_ids.length > 0`: `slack_ambient_evidence.in('id', evidence_ids)`.
   - Senão, fallback: `slack_ambient_evidence.eq('member_id', member_id).gte('captured_at', window_start).lte('captured_at', window_end).order('relevance_score desc').limit(8)`.
   - Cada evidência mostra: `#canal · data hora`, `message_text` (line-clamp-3), badge `category`, e link "Abrir no Slack" com `permalink`.

### 3. Sem mudança no edge / migration

Os rollups novos do `slack-weekly-rollup` continuam gerando `highlights[]` e `ai_assessment` (já implementado). O card só passa a renderizar também o que já existe nos rollups antigos sem exigir regeração.

## Resultado visual

Cards continuam compactos colapsados. Ao expandir, o usuário vê: narrativa → avaliação Rhitmo → temas (chips) → canais + parceiros (2 colunas) → highlights (se houver) → "Ver evidências (N)" expansível com mensagens originais + permalinks pro Slack — exatamente o conteúdo da antiga aba de Sinais, agora dentro do banner.

## Arquivos

- `src/pages/lider/Diario.tsx` — estender interface + mapper.
- `src/components/leader/diario/SlackRollupFeedItem.tsx` — adicionar blocos Temas / Atividade / fallback de evidências por janela temporal.
