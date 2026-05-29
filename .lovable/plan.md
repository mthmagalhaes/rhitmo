## Objetivo

Reescrever `SlackRollupFeedItem.tsx` para ficar **visualmente indistinguível** dos cards de anotação (`DiaryFeedItem`) no estado colapsado, e revelar todo o conteúdo rico (bullets+subjects, narrativa, avaliação Rhitmo, evidências com permalinks) no estado expandido.

## Mudanças

### Estado colapsado (linha única, igual `DiaryFeedItem`)
- Container: `rounded-xl border border-border/50 bg-card`, sem `shadow-sm`, sem `p-5`.
- Linha `px-3.5 py-2.5` com `hover:bg-muted/40`.
- Ordem: `SlackIcon` (h-3.5 monocromático) → data `dd/MM/yyyy` com `CalendarIcon` → `MemberAvatar` size sm → nome (truncate 140px) → título "Semana de DD/MM — Nome no Slack" (truncate) → badge "Resumo semanal" (md+).
- `⋯` **fixo e sempre visível** (sem `opacity-0 group-hover`), mesmo tamanho `h-7 w-7 text-muted-foreground`.
- Chevron expandir fixo à direita.

### Estado expandido (`border-t bg-muted/20`, `px-3.5 pb-3.5 pt-3 space-y-3`)
1. **Bullets temáticos** com `subject` chip (Badge secondary primary/5).
2. **Narrativa fallback** quando não há highlights (`displayedSummary`).
3. **Avaliação Rhitmo** em pílula colorida por `tone` (TONE_STYLES).
4. **"Ver evidências (N)"** expansível, lazy fetch via `slack_ambient_evidence`, com permalinks Slack.

### Menu `⋯` (DropdownMenu shadcn)
- Editar resumo (inline textarea no bloco expandido, salva em `leader_edited_summary`).
- Copiar texto (formato plain text com título + bullets + avaliação).
- Copiar para outro liderado (via `onCopyToMember` prop).
- Excluir (AlertDialog → soft delete `deleted_at`).

### Comportamento
- Clicar "Editar resumo" abre o expand automaticamente e troca a área pelo editor.
- Editar/Salvar continua mutando `context_evidence.leader_edited_summary`.
- Soft delete + invalidação de `diario-slack-rollups`.

## Fora de escopo
- `Diario.tsx`, filtros, edge functions, RLS, migrations — intocados.
- `DiaryFeedItem` (anotações normais) — intocado.
- Backend de evidências — sem mudança.

## Verificação
- Card Slack colapsado tem mesma altura/largura/padding/radius dos cards de anotação no feed `/lider/diario`.
- `⋯` e chevron sempre visíveis (sem precisar de hover).
- Expandir mostra bullets com chips de assunto, avaliação Rhitmo colorida e evidências com permalinks.
- Editar/Copiar/Excluir continuam funcionando.

## Arquivo editado
- `src/components/leader/diario/SlackRollupFeedItem.tsx` (reescrita completa).
