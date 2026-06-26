# Chips de origem + filtro + Resumo/Chat para uploads

## 1. Helper de origem — `src/lib/diarySource.ts` (novo)

Função `getSourceMeta(source, content)` retorna:

| `feedbacks.source`    | Label              | Ícone     | Cor (badgeClass)                                 |
| --------------------- | ------------------ | --------- | ------------------------------------------------ |
| `recall_bot`          | Bot                | `Bot`     | indigo soft (`bg-indigo-50 text-indigo-800 …`)   |
| `magic_paste`         | Magic Paste        | `Wand2`   | violet soft                                      |
| `upload` (curto)      | Upload             | `Upload`  | sky soft                                         |
| `upload` (longo)      | Transcrição        | `FileText`| amber soft                                       |
| `slack` / ambient     | Slack              | `SlackIcon`| emerald soft                                    |
| `manual` / null       | Nota               | `PenLine` | neutral (`bg-muted text-foreground/70`)          |

Heurística "longo": `content.length > 1500` **ou** regex `/\*\*[^*]+:\*\*/` (formato speaker) presente → conta como transcrição mesmo via upload.

Também expõe `isTranscriptLike(source, content)` para o switch do TranscriptExpandedView.

## 2. Chip no feed — `DiaryFeedItem.tsx`

Renderizar o chip ao lado dos chips de tag existentes (mesma altura/tipografia: `h-5 text-[10px] px-2 rounded-full` com ícone `h-3 w-3`). Posiciona depois das tags de categoria, antes do timestamp, com `aria-label` descritivo. Aparece tanto no estado colapsado quanto expandido.

## 3. Filtro no header — `DiaryFilters.tsx` + `Diario.tsx`

Hoje já existe um botão isolado "Slack". Substituir por um `Select` único **"Origem"** ao lado do filtro de período:

- Todas as origens (default)
- 🤖 Bot (Recall)
- ✨ Magic Paste
- 📄 Upload / Transcrição
- 💬 Slack
- ✍️ Notas manuais

Estado: trocar `source: 'all' | 'slack'` por `source: 'all' | 'recall_bot' | 'magic_paste' | 'upload' | 'slack' | 'manual'`, persistido na URL (`?source=`). `Diario.tsx` aplica o filtro no `useMemo` que já existe — para `'upload'` inclui ambos `upload` e `magic_paste` se quisermos, mas mantenho separados para alinhar com os chips.

Mantém o atalho visual: o chip "Slack" continua aparecendo, mas como uma opção dentro do select (sem botão duplicado).

## 4. Resumo + Pergunte à Rhitmo para uploads

Hoje `DiaryFeedItem` já chama `TranscriptExpandedView` quando `source === 'recall_bot'`. Vou estender:

```ts
const showRichView = isTranscriptLike(item.source, item.content);
```

- `recall_bot` → sempre rico (como hoje).
- `magic_paste` → sempre rico (já é colado de outra ferramenta).
- `upload` → rico **somente se** for "longo" (heurística acima); upload curto vira nota simples.
- `manual` / null → nota simples (sem abas).

### Geração automática de resumo para uploads

`upload-meeting/index.ts` já invoca `summarize-transcript` (Sprint anterior). Verificar e garantir:
- Magic Paste passa pelo mesmo trigger (chamar `summarize-transcript` após o insert em `feedbacks`, com `EdgeRuntime.waitUntil`).
- Fallback on-the-fly que `TranscriptExpandedView` já tem (gera ao abrir se `structured_summary IS NULL`) cobre uploads antigos.

Nenhuma mudança de banco — `structured_summary` já existe em `feedbacks`. Exports (.md/.txt/PDF) e chat "Pergunte à Rhitmo" funcionam por tabela, sem distinção de origem.

## 5. Validação

- `tsgo` limpo.
- Playwright em `/lider/diario`: filtrar por cada origem, expandir um upload longo (vê as 3 abas), expandir uma nota manual curta (vê texto simples sem abas), conferir chips de origem nos cards.

## Arquivos afetados

- novo `src/lib/diarySource.ts`
- editado `src/components/leader/diario/DiaryFeedItem.tsx` (chip + heurística + condição rica)
- editado `src/components/leader/diario/DiaryFilters.tsx` (substituir botão Slack por Select Origem)
- editado `src/pages/lider/Diario.tsx` (tipo + filtro estendido + querystring)
- editado `supabase/functions/upload-meeting/index.ts` se necessário (garantir trigger do summarize para magic paste)

## Fora de escopo

- Renomear chips ("Upload" → "Transcrição enviada" etc.) — mantenho rótulos curtos para caber.
- Filtros combinados (origem + tag em AND complexo) — já funciona porque cada filtro é AND independente.
