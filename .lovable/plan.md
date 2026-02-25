

## Redesign Completo do MentorChat — Plano de Implementação

### Resumo

Redesign visual e UX do `src/components/MentorChat.tsx` (890 linhas) para nível Claude/ChatGPT, mantendo toda lógica funcional existente (threads, upload, conversationHistory, ContextPicker, VoiceInput). Nenhum outro arquivo é alterado.

---

### Arquivo Alterado

| Arquivo | Ação |
|---------|------|
| `src/components/MentorChat.tsx` | Rewrite completo da UI (JSX + estilos), lógica intacta |

---

### Detalhamento das 7 Seções

#### 1. Bubble do Usuário
- Remover `bg-primary text-primary-foreground`
- Novo: `bg-[hsl(var(--primary)/0.07)]`, `border border-[hsl(var(--primary)/0.15)]`, `text-foreground`, `rounded-2xl`, `max-w-[75%]`
- Avatar com iniciais do usuário (28px, `bg-primary/20 text-primary`) à direita

#### 2. Bubble da IA
- Remover card/container `bg-muted`
- Texto direto sobre o fundo, com avatar 🎯 (28px) à esquerda alinhado ao topo
- ReactMarkdown com componentes customizados expandidos:
  - `h1/h2/h3`: font-semibold, tamanhos diferenciados, margin-top 20px
  - Parágrafos: `leading-relaxed mb-3.5`
  - Listas: `ml-5 space-y-1.5`
  - `code/pre`: `bg-muted rounded-lg p-3 font-mono text-sm` + botão "Copiar"
  - `blockquote`: `border-l-4 border-primary/40 bg-primary/5 p-3 rounded-r-lg italic`
  - `hr`: `border-t border-border/50 my-4`
  - `strong`: `font-semibold text-foreground`

#### 3. Sidebar de Threads — Compacta e Colapsável
- Novo estado: `const [sidebarOpen, setSidebarOpen] = useState(true)`
- Substituir `ResizablePanelGroup` por layout flex manual:
  - Sidebar: `w-[240px] flex-shrink-0` quando aberta, `w-0 overflow-hidden` quando fechada
  - Transição: `transition-all duration-200`
- Botão chevron `<` no topo direito do painel para colapsar
- Quando colapsada: ícone `☰` (Menu) no header do chat para reabrir
- Thread item redesenhado:
  - Título truncado 1 linha (CSS `truncate`)
  - Subtítulo: data relativa (`text-xs text-muted-foreground`)
  - Hover: `bg-muted/60 rounded-lg`
  - Ativa: `bg-primary/10 text-primary rounded-lg`
  - Ações rename/delete: ícones inline 14px no hover (sem DropdownMenu)
- Botão "Nova conversa": full-width, `rounded-xl`, variant outline, sticky no topo
- Remover `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` imports

#### 4. Input Area — Pill Shape
- Container externo: `rounded-2xl border border-border bg-background shadow-sm`
  - `focus-within:border-primary/50 focus-within:shadow-[0_0_0_2px_hsl(var(--primary)/0.1)]`
- Textarea: sem borda, bg transparent, `placeholder="Pergunte sobre {memberName}…"`, min-h 44px, max-h 160px, resize-none
- Barra de ações abaixo do textarea com `border-t border-border/40`:
  - Esquerda: Paperclip + "Anexar", Mic + "Voz", badge contexto se `selectedContexts > 0`
  - Direita: botão Send circular 36px (`bg-primary`, ícone `ArrowUp`) / Stop (`Square`, `bg-destructive/80`) quando loading

#### 5. Loading / Streaming Indicator
- **Fase 1** (antes do token): Avatar 🎯 + 3 dots animados com bouncing (keyframes CSS inline via style tag ou Tailwind animate)
- **Fase 3** (completo): sem mudança funcional (mensagem já aparece)
- Nota: streaming real não está implementado no backend (resposta completa), então fase 2 é omitida

#### 6. Empty State — Saudação Contextual
- Ícone 🎯 48px centralizado
- Título: "Mentor de {memberName}" — `font-semibold text-xl`
- Subtítulo: texto descritivo — `text-muted-foreground text-sm max-w-xs text-center`
- 3 chips de sugestão: "📋 Resumir histórico recente", "⚡ Quais ações estão pendentes?", "💬 Como dar feedback agora?"
- Estilo: `rounded-full border border-border bg-background hover:bg-muted text-sm px-4 py-2`
- Atualizar `quickSuggestions` array com os novos textos

#### 7. Layout Geral do Dialog
- Header: avatar 🎯 32px + "Mentor Chat" font-semibold + "— {memberName} ({memberRole})" muted + ContextPicker à direita
- Remover "Context Status Area" (linhas 547-583) — badge de contexto move para input area
- Área do chat: `p-6 md:px-8`, `gap-6` entre mensagens, `bg-muted/20`
- Remover borda azul de focus do dialog

---

### Imports Removidos
- `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`
- `MoreHorizontal` (substituído por ícones inline)

### Imports Adicionados
- `ArrowUp`, `Square`, `ChevronLeft`, `Menu`, `Copy` de lucide-react

### O que NÃO muda
- Toda lógica de threads (criar, selecionar, renomear, deletar)
- `handleSend`, `handleFileSelect`, `handleKeyDown`
- Upload de imagens/documentos (base64, extractTextFromFile)
- `conversationHistory` no body
- `ContextPicker` e `selectedContexts`
- Edge Function `chat-mentor`
- `VoiceInput`
- `AlertDialog` de exclusão
- Queries (threads, messages)

