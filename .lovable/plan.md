

## Plano: Implementação do Editor de Texto Rico (TipTap)

### Diagnóstico do Estado Atual

| Componente | Estado Atual | Problema |
|------------|-------------|----------|
| `NewNoteDialog.tsx` | Textarea simples (linha 283-290) | Usuário precisa digitar Markdown manualmente |
| `NewReviewDialog.tsx` | Textarea simples (linha 275-281) | IA gera Markdown que aparece como texto cru na edição |
| `NewGoalDialog.tsx` | Textarea simples (linha 141-147) | Sem formatação na descrição |
| `ReviewViewDialog.tsx` (edição) | Textarea com fonte mono (linha 290-294) | Usuário edita Markdown cru |
| `FeedbackTimeline.tsx` | Renderiza com DOMPurify | ✅ Já funciona (exibe HTML formatado) |
| `ReviewViewDialog.tsx` (visualização) | ReactMarkdown | ✅ Já funciona |

**Conclusão**: A renderização está correta, mas a **experiência de edição** precisa de um editor WYSIWYG.

---

### Solução: TipTap Rich Text Editor

TipTap é a escolha ideal pois:
- Framework headless (total controle de estilo)
- Baseado em ProseMirror (robusto)
- Exporta HTML nativo (compatível com DOMPurify existente)
- Extensões modulares (bold, italic, headings, lists)

---

### Arquivos a Criar

| Arquivo | Propósito |
|---------|-----------|
| `src/components/ui/rich-text-editor.tsx` | Componente reutilizável com toolbar |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/NewNoteDialog.tsx` | Substituir Textarea por RichTextEditor |
| `src/components/NewReviewDialog.tsx` | Substituir Textarea por RichTextEditor |
| `src/components/NewGoalDialog.tsx` | Substituir Textarea por RichTextEditor |
| `src/components/ReviewViewDialog.tsx` | Substituir Textarea (modo edição) por RichTextEditor |

---

### Estrutura Visual do Editor

```text
┌──────────────────────────────────────────────────────────────┐
│ [B] [I] [H1] [H2] [•] [1.] │                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Digite seu conteúdo aqui...                                  │
│                                                              │
│ O texto fica **formatado** em tempo real!                    │
│                                                              │
│ • Item de lista                                              │
│ • Outro item                                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Botões da Toolbar:**
- **B** - Negrito (bold)
- **I** - Itálico (italic)
- **H1** - Título principal (heading 1)
- **H2** - Subtítulo (heading 2)
- **•** - Lista com marcadores (bullet list)
- **1.** - Lista numerada (ordered list)

---

### Fluxo de Dados

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Fluxo de Entrada/Saída                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Usuário Digita → Editor TipTap → Exporta HTML → Salva no DB    │
│                                                                 │
│  Carrega do DB → HTML → TipTap (modo edição) → Renderiza WYSIWYG│
│                                                                 │
│  Carrega do DB → HTML → DOMPurify/ReactMarkdown → Exibe limpo   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Compatibilidade com Dados Existentes

O sistema precisa suportar dois formatos:
1. **Markdown Legado**: Conteúdo antigo gerado pela IA (`### Título`, `**negrito**`)
2. **HTML Novo**: Conteúdo criado pelo TipTap (`<h3>Título</h3>`, `<strong>negrito</strong>`)

**Estratégia de Migração Automática:**
```typescript
// Ao carregar conteúdo para edição:
const loadContent = (content: string) => {
  if (content.includes('</') || content.includes('/>')) {
    // Já é HTML - usar direto
    return content;
  }
  // É Markdown - converter para HTML
  return marked.parse(content);
};
```

---

### Dependências Necessárias

```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-placeholder": "^2.x"
}
```

---

### Implementação do Componente

**Interface do RichTextEditor:**
```typescript
interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}
```

**Uso nos Dialogs:**
```typescript
// Antes (Textarea)
<Textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  placeholder="Digite..."
/>

// Depois (RichTextEditor)
<RichTextEditor
  content={content}
  onChange={setContent}
  placeholder="Digite..."
/>
```

---

### Integração com VoiceInput

O `NewNoteDialog` possui um componente `VoiceInput` que adiciona texto transcrito ao conteúdo. O TipTap suporta inserção programática:

```typescript
// Ao receber transcrição de voz
const handleTranscription = (text: string) => {
  if (editor) {
    editor.chain().focus().insertContent(text).run();
  }
};
```

---

### Seção Técnica

**Extensões TipTap a incluir:**
- `StarterKit` - Bold, Italic, Strike, Heading (1-6), Bullet List, Ordered List, Code, Code Block, Blockquote, History (undo/redo)
- `Placeholder` - Texto placeholder quando vazio

**Estilização da Toolbar:**
- Usar Shadcn `Toggle` para botões (mesmo padrão visual do app)
- Separador visual entre grupos (texto | listas)
- Estado ativo visualmente destacado

**Estilos do Editor:**
- Usar classes Tailwind `prose` para renderização consistente
- Borda arredondada (`rounded-lg`) seguindo brand kit
- Focus ring igual ao Input padrão

**Conversão Markdown → HTML para IA:**
A IA do backend (`generate-review`) retorna Markdown. Ao receber:
```typescript
const generatedContent = data.review_content;
// Converter para HTML antes de setar no editor
const htmlContent = marked.parse(generatedContent);
setContent(htmlContent);
```

---

### Resumo das Alterações

| Etapa | Descrição |
|-------|-----------|
| 1 | Instalar dependências TipTap |
| 2 | Criar `src/components/ui/rich-text-editor.tsx` |
| 3 | Atualizar `NewNoteDialog.tsx` - substituir Textarea |
| 4 | Atualizar `NewReviewDialog.tsx` - substituir Textarea + converter output da IA |
| 5 | Atualizar `NewGoalDialog.tsx` - substituir Textarea da descrição |
| 6 | Atualizar `ReviewViewDialog.tsx` - substituir Textarea no modo edição |
| 7 | Testar compatibilidade com conteúdo Markdown existente |

