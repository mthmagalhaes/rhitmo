
# Transcrições mais legíveis no Diário (estilo Granola)

Hoje o item expandido em `/lider/diario` renderiza o `content` cru da transcrição como um único parágrafo `whitespace-pre-wrap` (`DiaryFeedItem.tsx:407-411`). Para reuniões longas vira parede de texto. Vamos atacar em três camadas, todas no mesmo card expandido.

## 1. Resumo estruturado no topo (default)

Hoje já temos `feedbacks.summary` (1-2 frases) gerado por `analyze-feedback-background`. Vamos enriquecer **apenas para itens de transcrição** (source = `recall_bot` ou `magic_paste`/`upload`) com um objeto novo:

```
feedbacks.structured_summary jsonb
  - tldr: string                 // 2-3 frases
  - topics: [{ title, bullets[] }]
  - decisions: string[]
  - action_items: [{ owner, text, due? }]
  - open_questions: string[]
  - sentiment: 'positive'|'neutral'|'tense'
```

Migration adiciona a coluna (nullable, sem GRANT novo — herda do feedbacks). Nova edge function `summarize-transcript`:

- Recebe `feedback_id`, valida ownership (`auth.uid()` == `manager_id`), carrega `content`.
- Chama Lovable AI Gateway (`google/gemini-2.5-flash`) com `Output.object` (Zod) usando o schema acima — sem prompt inline da Rhitmo: usa `composeSystemPrompt({ mode: 'transcript-digest', channel: 'web' })` (novo `.md` em `_shared/soul/modes/transcript-digest.md` com guardrails: PT-BR, sem inventar dados, citar trechos curtos).
- Persiste em `structured_summary`. Idempotente (skip se já existir, força via `?force=true`).
- Disparado automaticamente no fim de `analyze-feedback-background` quando o feedback vem de transcrição, e via botão "Reprocessar resumo" no card.

UI no card expandido — header com 3 abas (`Tabs` shadcn):

- **Resumo** (default): bloco TL;DR + chips de sentimento, accordion de Tópicos, lista de Decisões, checklist de Action items (com owner), Open questions. Visual Bento `rounded-2xl`, sombra suave.
- **Transcrição**: ver passo 2.
- **Conversar**: ver passo 3.

Loading state shimmer enquanto `structured_summary IS NULL` e job em andamento. Botão "Gerar resumo" para transcrições antigas sem `structured_summary`.

## 2. Transcrição formatada por speaker

O `content` vem como `**Speaker:** turno **Speaker:** turno...` (visível no print). Novo util `parseTranscript(content)` em `src/lib/transcriptParser.ts`:

- Regex `/\*\*([^*]+):\*\*/g` divide em turnos `{ speaker, text }`.
- Mescla turnos consecutivos do mesmo speaker (concat de frases curtas separadas por gaguejos típicos do Recall).
- Fallback: se não houver marcador, retorna 1 bloco "Transcrição".

Render estilo chat (não bolha — estilo Granola/Linear): coluna única, nome do speaker em `text-xs font-semibold tracking-tight` + cor estável derivada do hash do nome, parágrafo em `text-sm leading-relaxed`. Avatar circular pequeno com inicial. Espaçamento generoso entre speakers.

Topo da aba: pílulas com **participantes** (extraídos dos turnos) + **duração estimada** (palavras/150). Campo de busca local que destaca matches inline (`<mark>`), sem refetch.

Botão "Copiar transcrição" e "Baixar .txt" no canto.

## 3. Chat contextual estilo Granola

Aba **Conversar** abre um chat escopado àquela transcrição:

- Componente novo `TranscriptChat.tsx` usando `useChat` (`@ai-sdk/react`) + `DefaultChatTransport` apontando para edge function existente `chat-mentor` com novo modo `scope: 'transcript'` e `feedback_id` no body.
- `chat-mentor` passa a aceitar esse scope: quando presente, ignora RAG global e injeta **só** o `content` + `structured_summary` daquela transcrição como contexto, usando `composeSystemPrompt({ mode: 'transcript-chat', channel: 'web', vars: { transcriptText, structuredSummary, memberName } })`. Novo `.md` em `_shared/soul/modes/transcript-chat.md`: tom Rhitmo, sem inventar fora da transcrição, sempre citar trecho ("ela disse: '…'").
- **Sem persistência de threads** (escopo do usuário pediu chat para tirar insights da reunião, não histórico permanente). Mensagens vivem em memória do componente, key=`feedback_id`. Botão "Limpar conversa".
- Sugestões iniciais (chips clicáveis): "Quais decisões foram tomadas?", "O que ficou pendente?", "Como foi o tom da conversa?", "Gerar follow-up para enviar à Gabriela".
- AI Elements: `Conversation`/`Message`/`MessageResponse`/`PromptInput` instalados via `bun x ai-elements@latest add conversation message prompt-input shimmer`. Assistant sem fundo, user em `bg-primary/10 text-foreground`. Logo do agente = mini RhythmWave SVG (já existe), nunca `Sparkles`.

## 4. Espelhar para uploads (Magic Paste / upload-meeting)

`upload-meeting/index.ts` e o fluxo do Magic Paste já criam `feedbacks` com `content`. Após o insert eles vão chamar `summarize-transcript` no mesmo padrão — sem mudança de UI extra, o card no Diário ganha o resumo automaticamente.

## Detalhes técnicos

- **Frontend**:
  - `src/components/leader/diario/DiaryFeedItem.tsx`: substituir `<p whitespace-pre-wrap>` por `<TranscriptExpandedView feedbackId content structuredSummary />` quando `source ∈ {recall_bot, magic_paste, upload}`; manter render simples para notas curtas.
  - Novos: `src/components/leader/diario/TranscriptExpandedView.tsx` (tabs), `TranscriptSummaryPanel.tsx`, `TranscriptBodyPanel.tsx`, `TranscriptChat.tsx`.
  - Novo util `src/lib/transcriptParser.ts` + teste leve.
- **Backend**:
  - Migration: `ALTER TABLE feedbacks ADD COLUMN structured_summary jsonb;` (sem novo GRANT — tabela já tem RLS por `manager_id`).
  - Nova edge function `summarize-transcript` seguindo skill `rhitmo-edge-function` (CORS, JWT, ownership, Zod, `safeQuery`, `aiGateway`, `composeSystemPrompt`, sem `.catch` em builder, logger estruturado).
  - Trigger automático: ao fim de `analyze-feedback-background`, se `source` for transcrição, `EdgeRuntime.waitUntil(invoke('summarize-transcript', { feedback_id }))`.
  - `chat-mentor/index.ts`: aceitar `scope: 'transcript'` + `feedback_id`; bypass de RAG; ownership check; usar mode `transcript-chat`.
  - Novos arquivos soul: `_shared/soul/modes/transcript-digest.md`, `_shared/soul/modes/transcript-chat.md` + registro no `loader.ts`.
- **Tipos**: regenerar `src/integrations/supabase/types.ts` (auto).

## Fora de escopo (sprints futuras)

- Persistência das conversas de transcrição como threads no Mentor.
- Áudio/timestamps clicáveis (Recall não está retornando timeline rica hoje — só `speaker_timeline` agregado).
- Compartilhar o resumo com o liderado (envolve novo fluxo de visibilidade — abrir como feature à parte).

## Como vou validar

1. `tsgo` limpo.
2. Em /lider/diario, expandir uma transcrição recente: ver as 3 abas, resumo populado em <8s, transcrição agrupada por speaker, chat respondendo com citação.
3. Browser via Playwright contra `localhost:8080` com sessão Supabase injetada para screenshot das 3 abas.
4. `curl_edge_functions` em `summarize-transcript` e `chat-mentor` (scope=transcript) para confirmar 200 + payload.
