
# Brief V2 — "Editorial" (Versão A) + paridade Slack

## Objetivo
1. Reformular `/brief/:meetingId` (web) para layout 1-coluna narrativo: **Leitura do momento → Pauta (com pendências inline) → Como conduzir → Ações**.
2. Garantir que o botão **"Gerar Pauta"** no Slack devolva o **mesmo brief AI completo** (hoje devolve só um resumo de notas/PDI, sem pauta/pendências/coaching).

---

## Parte 1 — Web: BriefPage.tsx (Versão A)

Arquivo único: `src/pages/BriefPage.tsx`.

### Mudanças no render (estrutura `BriefData` mantida intacta)

```text
┌─ max-w-2xl mx-auto ──────────────────────────────┐
│ ← Voltar                                          │
│ Brief — {memberName}                              │
│ {HH:mm} · {meeting.title}    [Abrir Meet ↗]      │
├──────────────────────────────────────────────────┤
│ 🧠 LEITURA DO MOMENTO                             │
│ {context_summary} (2-3 linhas)                    │
├──────────────────────────────────────────────────┤
│ 📋 PAUTA SUGERIDA                                 │
│ 1. {topic}                                        │
│    {rationale}                                    │
│    [⚠ pendente desde 13/04]  ← chip se houver     │
│ 2. ...                                            │
│ • Pendências sem match: itens extras no fim       │
├──────────────────────────────────────────────────┤
│ 💡 COMO CONDUZIR                                  │
│ {coaching_reminder}                               │
├──────────────────────────────────────────────────┤
│ [✏ Iniciar Anotação]   [👤 Abrir perfil]          │
└──────────────────────────────────────────────────┘
```

### Lógica de matching de pendências (client-side, sem mudar edge)

- Função `matchPendingToAgenda(pending, agenda)` — para cada `pending_items[i]`:
  - normaliza (`lowercase`, remove acentos) `description` e `from_note`
  - extrai 3-5 keywords (palavras > 4 chars, sem stopwords PT)
  - encontra o índice da pauta com mais keywords presentes em `topic + rationale`
  - se ≥ 1 match, anexa pendência ao tópico; senão vai para `unmatched[]`
- Render: chip `Badge` discreto (`bg-amber-500/10 text-amber-600`) abaixo de cada `rationale`, formato `⚠ pendente desde {date}`.
- `unmatched[]` vira itens finais da `<ol>` com prefixo `⚠` em vez de número.

### Visual (mantém Design System Creme/Bento)
- Container: `max-w-2xl mx-auto p-4 sm:p-6 space-y-8`.
- Cada bloco: `rounded-2xl bg-card border border-border/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6`.
- Eyebrow das seções: `text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground`.
- "Como conduzir" ganha bg sutil violeta (`bg-violet-50/60 dark:bg-violet-950/20`) para destacar como diferencial Mirror.
- Header: remover Badge "Hoje/Amanhã às HH:mm" duplicado — manter só linha única `{HH:mm} · {title}` + chip discreto `Hoje`/`Amanhã` se aplicável.

### Estados
- Skeleton/error: 1 coluna (`max-w-2xl`), 4 blocos empilhados.
- Empty `pending_items` E sem unmatched: nenhuma menção visual a pendências (não mostrar bloco vazio).

---

## Parte 2 — Slack: paridade do brief no botão "Gerar Pauta"

### Diagnóstico
Hoje `buildBriefForMember()` (linha 769 de `slack-bot/index.ts`) monta blocos só com **últimas notas + PDI + próxima 1:1**. Não chama IA, não mostra pauta sugerida, pendências, contexto nem coaching. O usuário esperaria ver o **mesmo conteúdo** do botão web.

### Solução: extrair gerador de brief para `_shared/`

Novo arquivo `supabase/functions/_shared/briefGenerator.ts`:
- Exporta `async function generateBriefForMeeting(meetingId, userId, supabase, lovableApiKey): Promise<BriefData>`.
- Move toda a lógica AI atual de `generate-brief/index.ts` (build de prompt, chamada Lovable AI Gateway com `google/gemini-2.5-flash`, parsing, cache em `upcoming_meetings.brief_cache`).
- Reutiliza o cache de 30min quando existir.

Refactor em paralelo:
- `supabase/functions/generate-brief/index.ts`: vira wrapper fino — valida JWT, valida ownership do meeting, chama `generateBriefForMeeting`, retorna JSON. Comportamento idêntico para frontend.
- `supabase/functions/slack-bot/index.ts` no case `prep_1on1_brief` (linha 1432):
  - Chama `generateBriefForMeeting(meetingId, briefPersona.userId, supabase, Deno.env.get('LOVABLE_API_KEY'))`.
  - Converte `BriefData` em **Slack Blocks** com mesma ordem editorial:
    1. `header` — `📊 Brief — {memberName}`
    2. `section` — `🧠 *Leitura do momento*\n{context_summary}`
    3. `divider`
    4. `section` — `📋 *Pauta sugerida*` + lista numerada `1. *{topic}*\n_{rationale}_` (com chip `\n⚠ pendente desde {date}` quando matched)
    5. `section` (se houver) — `💡 *Como conduzir*\n{coaching_reminder}`
    6. `actions` — botões `Abrir no Rhitmo` (URL `https://rhitmo.co/brief/{meetingId}`) e `Abrir Meet` (se `meet_link`)
  - Reutiliza `matchPendingToAgenda` portado para Deno (helper duplicado em `_shared/briefGenerator.ts`).
- Fallback: se geração AI falhar (timeout, sem API key), cai no comportamento antigo de `buildBriefForMember` com `text: '⚠ Não foi possível gerar a pauta agora. Veja resumo abaixo.'` + blocos atuais.

### Logs e idempotência
- Log `[INTERACT] prep_1on1_brief: generated brief for meetingId=... member=...`.
- Cache compartilhado: 2ª chamada (web ou Slack) dentro de 30min reaproveita `brief_cache`.

---

## Detalhes técnicos

- **Sem migração SQL** — tudo lê/escreve em campos existentes (`upcoming_meetings.brief_cache`, `brief_generated_at`).
- **Sem mudança no contrato `BriefData`** — frontend e Slack consomem o mesmo JSON.
- **Deploy**: `generate-brief` + `slack-bot` (Slack-bot depende do helper compartilhado).
- **i18n**: copy em PT-BR hardcoded (consistente com Slack atual).
- **QA manual após deploy**:
  1. Web: abrir `/brief/{id}` → ver 4 blocos na ordem nova, pendência aparece como chip dentro do tópico certo.
  2. Slack: clicar "Gerar Pauta" no DM proativo → resposta deve conter Pauta + Leitura + Como conduzir.
  3. Cache: clicar 2x rápido → segunda render é instantânea.

---

## Fora de escopo (próximas iterações)
- Mudar prompt do `generate-brief` para já devolver `linked_agenda_index` em vez de matching heurístico.
- Sprint 12.5 "Slack Conversational First" (LLM puro substituindo botões).
