## Diagnóstico (UX SR)

Hoje `/lider/mentor` é uma **coluna única `max-w-5xl` alinhada à esquerda**, dentro de um shell que vai até ~1600px no desktop. Resultado: faixa morta de ~400-500px à direita (rabisco vermelho do print). Em telas <1280px o problema some, mas no primary target (líder usando notebook 1440px+) parece "página inacabada".

Três alternativas consideradas:

1. **Centralizar (`mx-auto`)** — empurra peso para o centro, mas cria duas faixas mortas (esquerda e direita) e quebra o paralelo com Diário/1:1s/Objetivos que são left-aligned. ❌
2. **Esticar tudo para `max-w-none`** — composer e lista de threads ficariam com linhas longas demais (>120 chars), prejudicando legibilidade. ❌
3. **Layout 2 colunas master-detail invertido** — coluna principal de criação (composer + sugestões) à esquerda em ~`max-w-2xl`, e **painel direito de "Contexto da conversa"** ocupando o espaço morto com informação útil. ✅

Vou pelo (3) — é o padrão Claude/ChatGPT/Linear AI e resolve o vazio com **conteúdo de valor**, não com filler.

## Estrutura proposta

```text
┌─────────────────────────────────────────────────────────────────┐
│  h-[calc(100svh-3rem)] overflow-hidden  (full-bleed app)        │
│ ┌──────────────────────────────────┬──────────────────────────┐ │
│ │ <main> overflow-y-auto           │ <aside> w-[340px]        │ │
│ │ max-w-2xl px-6 lg:px-8 py-8      │ border-l bg-muted/30     │ │
│ │                                  │ overflow-y-auto py-8 px-6│ │
│ │ • Eyebrow "PERGUNTE À RHITMO"    │                          │ │
│ │ • H1 saudação                    │ ┌──────────────────────┐ │ │
│ │ • Composer (textarea + chips)    │ │ CONTEXTO ATIVO       │ │ │
│ │ • Sugestões                      │ │ • Liderado / Geral   │ │ │
│ │ • Conversas recentes (lista)     │ │ • Escopo do RAG      │ │ │
│ │                                  │ │ • Mini-stats time    │ │ │
│ │                                  │ └──────────────────────┘ │ │
│ │                                  │ ┌──────────────────────┐ │ │
│ │                                  │ │ COMO USAR (dicas)    │ │ │
│ │                                  │ │ 3 cards curtos       │ │ │
│ │                                  │ └──────────────────────┘ │ │
│ │                                  │ ┌──────────────────────┐ │ │
│ │                                  │ │ ATALHOS              │ │ │
│ │                                  │ │ ⌘K, ↵, ⇧↵            │ │ │
│ │                                  │ └──────────────────────┘ │ │
│ └──────────────────────────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

Em viewport `<lg` (≤1024px) o `<aside>` colapsa via `hidden lg:block` — em mobile/tablet a página continua single-column como hoje.

## Conteúdo do painel direito (`MentorContextPanel`)

**Card 1 — "Contexto ativo"** (reativo ao state do composer):
- Sem liderado: ícone `Sparkles` + texto "Modo coaching pessoal — Rhitmo vai te ajudar a refletir sobre sua liderança". Botão secundário "Selecionar liderado" abre o mesmo Popover.
- Com liderado: avatar + nome + cargo, badge do escopo (`Tudo / Notas / Geral`), e 3 mini-stats consultadas via reuse das queries existentes:
  - "X notas registradas"
  - "Última atividade há Y dias"
  - "Próxima 1:1: Z" (se houver)

**Card 2 — "Como obter o melhor"** (estático, educacional):
- 💡 "Seja específico: 'O que mudou no engajamento da Ana nas últimas 4 semanas?' rende mais que 'Como está a Ana?'"
- 🎯 "Selecione um liderado para análises com contexto. Sem liderado, foco vira sua liderança."
- 🔒 "Tudo aqui é privado. Suas conversas não saem do seu workspace."

**Card 3 — "Atalhos"**:
- `↵` enviar · `⇧↵` quebra de linha · `⌘K` busca global

## Mudanças técnicas

### `src/pages/lider/Mentor.tsx`

- Container raiz vira `flex h-[calc(100svh-3rem)] overflow-hidden bg-background`.
- Coluna principal: `<main className="flex-1 min-w-0 overflow-y-auto"><div className="max-w-2xl px-6 lg:px-8 py-8">…</div></main>` (era `max-w-5xl` direto no scroller).
- Coluna direita: `<aside className="hidden lg:block w-[340px] shrink-0 border-l border-border/40 bg-muted/30 overflow-y-auto"><MentorContextPanel … /></aside>`.
- Passar props `selectedMember`, `scope`, `onPickMember`, `onChangeScope` para o painel reusarem o mesmo state (Popover do picker permanece no composer; o botão do painel só abre/foca o picker).

### `src/components/mentor/MentorContextPanel.tsx` (novo)

- Componente puro de apresentação + 1 query opcional `useQuery(['mentor-context-stats', memberId])` que faz `count: 'exact', head: true` em `feedbacks` e busca a próxima reunião em `meetings` (já existe pattern em `MemberUpcomingMeetings`).
- Layout: `space-y-4`, cada card `rounded-2xl bg-card border border-border/60 p-4` com header `text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2`.
- Sem ações destrutivas — apenas um botão `Selecionar liderado` que dispara callback recebido do pai.

### `src/pages/lider/MentorThread.tsx`

- **Sem mudanças.** A sub-página `/lider/mentor/:threadId` já é full-bleed via `MentorChat embedded`.

## Por que isso funciona

1. **Resolve o vazio com utilidade**, não filler decorativo (sem ilustrações grandes ou "marketing copy").
2. **Mantém paralelo com master-detail** das outras páginas (aside + main), só que invertido (aside à direita por ser secundário/contextual, não navegacional).
3. **Educacional para early adopters**: muitos líderes não sabem que selecionar liderado muda o RAG — o painel torna isso visível.
4. **Degrade gracioso**: em <lg some, sem refactor adicional.

## Fora de escopo

- Sub-página de chat (`/lider/mentor/:threadId`).
- Mudanças no composer, sugestões ou lista de threads em si (apenas o container muda de largura).
- Edge functions, prompts, lógica de criação de thread.

## Arquivos afetados

- `src/pages/lider/Mentor.tsx` — refactor do container raiz para 2 colunas.
- `src/components/mentor/MentorContextPanel.tsx` — **novo**.
