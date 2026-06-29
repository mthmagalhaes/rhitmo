## Visão de PM

A "camada Granola" (TL;DR + Tópicos + Decisões + Próximos passos + Transcrição estruturada + Pergunte à Rhitmo + Exportar) **já existe e já é acionada automaticamente** para uploads e colagens — o gatilho é o helper `isTranscriptLike` em `src/lib/diarySource.ts`, espelhado no Postgres por `detect_feedback_source`. O `summarize-transcript` roda em background no upload e também sob demanda na primeira abertura.

O caso "Alinhamento Operações" não ativou a visão rica porque o texto colado veio como **um único parágrafo corrido** (`Yasmin Nobrega: Bcë. Guilherme Cunha: Bom dia, ...`), sem quebras de linha, sem timestamps e sem cabeçalho Tactiq/Fireflies. Nenhuma das 4 regras atuais bate nesse formato:

- `TIMESTAMPED_SPEAKER_REGEX` exige `> 10:32 Name:` em linhas separadas.
- `BOLD_SPEAKER_REGEX` exige `**Name:**`.
- `TACTIQ_HEADER_REGEX` exige `Meeting started:` + `Participants:`.
- `GENERIC_SPEAKER_REGEX` exige `(^|\n)Capital:`.

Resposta direta: **sim, dá pra estender para qualquer upload/colagem**, com 3 ajustes pequenos e 1 melhoria de UX que diferencia *transcrição falada* de *anotação longa* (para não inflar nota curta em "Resumo + Chat").

---

## Escopo

### 1. Heurística mais robusta (frontend + DB, mesma regra)

Adicionar 2 detectores que cobrem o formato "parágrafo único de fala":

- **Inline speaker turns**: ≥ 6 ocorrências de `Nome[ Sobrenome]: ` no mesmo texto (sem exigir `\n`), e razão `turnos / tamanho` compatível com fala (não confundir com listas/markdown).
- **Lista de participantes explícita**: presença de `Participantes ` ou `[Alinhamento]`/`[1:1]` no início + ≥ 4 nomes próprios seguidos de `:`.

Manter as 4 regras atuais. Promover para `transcription` quando bater qualquer uma.

Espelhar em `public.detect_feedback_source` via migration para reclassificar legados (o "Alinhamento Operações" é um deles) e manter a verdade canônica no DB.

### 2. Pré-processamento leve para a aba "Transcrição"

Quando o texto vem em parágrafo único, `parseTranscript` produz um único turn gigante. Adicionar um normalizador em `src/lib/transcriptParser.ts` que, antes de parsear, insere `\n` antes de cada novo `Nome: ` detectado (mesmo regex inline). O texto original permanece intacto no DB e no `.txt` cru; o split é só de apresentação. Isso faz a aba Transcrição render como chat agrupado por falante, igual ao do bot.

### 3. Distinção visual: Upload curto vs Transcrição

Já existe o split `upload` (sky) vs `transcription_upload` (amber) em `getDiarySourceMeta`. Vamos:

- **Não** abrir aba "Resumo/Chat" para `upload` puro com `< ~800` chars (nota textual longa, sem padrão de fala). Mostrar só o texto como hoje. Evita criar TL;DR para parágrafo de anotação.
- **Sim** ativar para `transcription_upload` (qualquer comprimento, formato de fala) e para `upload` longo (`>= 1500` chars com pelo menos 2 parágrafos), com label "Resumo" igual ao do bot.

### 4. Reprocessamento dos legados

Acionar `summarize-transcript` em batch para os feedbacks que mudarem de `manual` → `transcription` após o trigger reclassificar. Já temos `reprocess-meeting`; basta uma chamada noturna ou um botão "Gerar resumo" no menu `…` do card quando `structured_summary IS NULL` e `isTranscriptLike == true`.

### 5. Pequenas melhorias na visão expandida (válidas para bot + upload)

- Mostrar o **chip de origem** (Bot / Transcrição / Upload) ao lado das tabs, para o líder saber a procedência mesmo dentro da visão rica.
- No Exportar `.txt` de upload, se a transcrição foi "splitada" para visualização, exportar a versão normalizada (uma linha por falante) — é o que o mercado faz (Granola, Fathom, Otter).

---

## Diferenças honestas em relação ao Bot

| Aspecto | Bot (Recall) | Upload / Colagem |
|---|---|---|
| Timestamps por fala | Sim | Geralmente não |
| Diarização confiável | Sim (speaker_timeline) | Heurística por padrão de nome |
| Áudio anexado | Sim | Não |
| Sinais relacionais (talk-time, sentimento por trecho) | Sim (`meeting_signals`) | Parcial — só o que dá pra inferir do texto |
| Resumo estruturado, tópicos, decisões, ações | **Sim** | **Sim** (mesma função) |
| Pergunte à Rhitmo (escopo da reunião) | **Sim** | **Sim** |
| Exportar (Markdown / .md / .txt / PDF) | **Sim** | **Sim** |

O que o líder vê é praticamente igual; o que muda é a profundidade dos sinais quantitativos, e isso é honesto sinalizar com o chip de origem.

---

## Detalhes técnicos

**Arquivos a tocar**
- `src/lib/diarySource.ts` — adicionar `INLINE_SPEAKER_REGEX` + contagem; ajustar `detectEffectiveSource` e `getDiarySourceMeta`.
- `src/lib/transcriptParser.ts` — normalizador opcional `normalizeInlineSpeakers(text)`.
- `src/components/leader/diario/DiaryFeedItem.tsx` — gate da visão rica passa a usar `isTranscriptLike` + threshold de comprimento; passar `kind` do chip para o `TranscriptExpandedView` mostrar o chip de origem no header.
- `src/components/leader/diario/TranscriptExpandedView.tsx` — receber `originMeta` e renderizar chip; usar texto normalizado para a aba Transcrição e para o `.txt`.
- `supabase/functions/upload-meeting/index.ts` — garantir que `summarize-transcript` seja invocado também quando vier de "Magic Paste" (não só upload de arquivo).
- **Migration**: atualizar `public.detect_feedback_source` com a nova regra inline; rodar `UPDATE` retroativo para reclassificar registros `manual` que agora batem.
- (Opcional) Botão "Gerar resumo" no `…` do card quando faltar `structured_summary`.

**Não muda**
- Schema da `feedbacks` (já tem `structured_summary`).
- `chat-transcript`, `summarize-transcript`, `EvidenceDrawer`, citações DD/MM/AAAA — tudo já é agnóstico à origem.

**Riscos / mitigação**
- Falso-positivo (lista de tarefas com `Nome:` virar "transcrição"): exigir ≥ 6 turnos + razão `turnos / palavras` mínima (~1 turno a cada 25 palavras).
- Custo de LLM no backfill: limitar concorrência (5 em paralelo) e priorizar feedbacks dos últimos 90 dias do líder ativo.

---

## Entregáveis em ordem

1. Migration + reclassificação retroativa (DB é a verdade).
2. Helper frontend + parser normalizador.
3. Gate atualizado no `DiaryFeedItem` + chip de origem dentro da visão rica.
4. Garantir `summarize-transcript` no caminho de Magic Paste.
5. (Opcional sprint seguinte) Botão manual "Gerar resumo" para legados.

Pronto para implementar quando você aprovar.