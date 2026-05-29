## Objetivo

Unificar tudo do Slack num único card semanal por liderado dentro da aba **Anotações** do Diário. O card é uma "anotação" gerada pela IA com evidências, fontes e avaliação — editável e gerenciável como qualquer outra nota. Elimina a aba "Sinais do Slack" e a rota `/evidence`.

## Por que faz sentido (avaliação cofundador)

- `slack_ambient_evidence` permanece como matéria-prima (alimenta o rollup + RAG). Custo baixo (~$0.08/mês/workspace), nada muda no classifier.
- O líder consome 1 card/semana/liderado com **toda a profundidade** que hoje está espalhada em N sinais → menos ruído, mais sinal.
- "Dispensar" deixa de existir: tudo entra na RAG do Mentor de qualquer jeito; o ato de "dispensar" era cosmético.
- "Virar nota" também some: o card **já é** a nota. Pode editar texto, copiar pra outro liderado, excluir.
- Mantém auditabilidade via seção expansível com permalinks Slack.

## Mudanças

### 1. Enriquecer o payload do rollup (`slack-weekly-rollup`)

Atualmente o JSON salvo em `context_evidence.metadata` é `{themes, top_collaborators, top_channels, narrative}`. Vamos enriquecer para o card precisar de tudo em 1 leitura:

```json
{
  "themes": ["..."],
  "narrative": "2-3 frases gerais",
  "highlights": [
    {
      "bullet": "Defendeu prazo realista do projeto X em #squad-growth",
      "subject": "Negociação de escopo",
      "evidence_ids": ["<uuid slack_ambient_evidence>", "..."]
    },
    ... (3 a 5 bullets)
  ],
  "ai_assessment": {
    "tone": "construtivo|preocupação|positivo|neutro",
    "summary": "1-2 frases — leitura da IA sobre padrão da semana (mesmo formato dos sinais hoje)"
  },
  "top_collaborators": [...],
  "top_channels": [...],
  "evidence_count": N,
  "window_start": "...",
  "window_end": "..."
}
```

- Prompt do Gemini atualizado pra emitir bullets temáticos atrelados a `evidence_ids` reais (passamos a lista de IDs+resumos no input).
- `ai_assessment` reaproveita o mesmo padrão usado hoje no `EvidenceCard` (avaliação curta IA).
- Idempotência por `(member_id, ISO week)` mantida.

### 2. Card semanal vira anotação editável

Hoje `SlackRollupFeedItem.tsx` é read-only. Vamos:

- Renderizar **bullets temáticos** com `subject` (chip pequeno) + texto, mantendo logo Slack monocromático.
- Adicionar bloco **"Avaliação da IA"** no rodapé (mesma pílula visual do `EvidenceCard`).
- Adicionar seção expansível **"▸ Ver evidências (N)"** que lista 3-5 trechos com permalink "Abrir no Slack" (busca `slack_ambient_evidence` por `evidence_ids`).
- Menu de ações `⋯` (igual `NoteCard`):
  - **Editar** (abre editor inline; salva em campo novo `context_evidence.leader_edited_summary` — preserva original em `metadata.narrative`)
  - **Copiar texto**
  - **Copiar para outro liderado** (cria `feedback` ou nova `context_evidence` no destino — escolha de implementação no detalhe técnico)
  - **Excluir** (soft delete via `context_evidence.deleted_at` novo campo, oculta do feed; matéria-prima `slack_ambient_evidence` permanece intacta)

### 3. Remover aba "Sinais do Slack" e rota `/evidence`

- `src/pages/lider/Diario.tsx`: remover `<TabsList>` e `DiarySlackSignalsTab`. Volta a ser página única ("Anotações").
- `src/App.tsx`: `/evidence` → `<Navigate to="/lider/diario" replace />`.
- Deletar `src/pages/Evidence.tsx`, `src/components/leader/diario/DiarySlackSignalsTab.tsx`.
- Manter `useEvidence`, `useEvidenceMutations`, `EvidenceCard` por ora (chamados por outras superfícies; remoção em sprint separada se confirmar zero uso).

### 4. Filtro Slack

Mantém o chip "Slack" no `DiaryFilters.tsx` filtrando `kind === 'slack_rollup'` — agora ainda mais útil.

## Detalhes técnicos

**Migration:**
- `ALTER TABLE context_evidence ADD COLUMN leader_edited_summary text NULL;`
- `ALTER TABLE context_evidence ADD COLUMN deleted_at timestamptz NULL;`
- Atualizar política RLS de UPDATE/DELETE para permitir o líder dono (`manager_id = auth.uid()`) editar `leader_edited_summary` e marcar `deleted_at` apenas em rows `evidence_type='slack_activity_rollup'`. Outros tipos seguem imutáveis.
- Filtro `deleted_at IS NULL` na query do feed em `Diario.tsx`.

**Edge function `slack-weekly-rollup`:**
- Passar `id` de cada `slack_ambient_evidence` para o prompt; pedir array `highlights[].evidence_ids`.
- Persistir o novo metadata enriquecido.
- Mesmas guardas de idempotência e privacidade (nunca msgs cruas no `summary`, só nos permalinks expansíveis renderizados client-side).

**Frontend:**
- `SlackRollupFeedItem.tsx` reescrito com seções: header, bullets+subjects, avaliação IA, "Ver evidências" (lazy fetch via novo hook `useSlackRollupEvidences(evidenceIds)` que faz 1 `select id, message_text, slack_channel_name, permalink, captured_at from slack_ambient_evidence where id in (...)`).
- Menu `⋯` com `DropdownMenu` shadcn, igual padrão `NoteCard`.
- "Copiar para outro liderado" abre `MemberPickerDialog` e duplica como `feedback` privado (mais leve que criar outro context_evidence — usa fluxo existente).

**Out of scope:**
- Mudanças no `chat-mentor` (já lê `context_evidence` via RAG).
- Mudar cadência do classifier (segue 2x/dia) ou rollup (segue diário, mas só 1 row/semana).
- Remover hooks `useEvidence*` (limpeza separada).
- Notificação no Slack quando um novo rollup é criado.

## Verificação

- `/lider/diario` mostra só a aba Anotações (sem Tabs).
- Card semanal Slack mostra: bullets com subject chips, avaliação IA, "Ver evidências (N)" expansível com permalinks.
- Menu ⋯ permite editar texto inline, copiar, copiar p/ outro liderado, excluir.
- Excluir oculta do feed mas não apaga `slack_ambient_evidence` nem quebra RAG.
- `/evidence` redireciona pra `/lider/diario`.
- Filtro "Slack" isola só esses cards.
- Build limpo.
