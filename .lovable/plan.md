

## Plano: Melhoria no Input do Mentor Chat (Shift+Enter e Auto-Resize)

### Objetivo

Transformar o campo de entrada do MentorChat de uma linha única (`<input>`) para um `<textarea>` com auto-resize e suporte a Shift+Enter, igual ao ChatGPT.

---

### Estado Atual

| Item | Situação |
|------|----------|
| Componente de entrada | `<input type="text">` (linha 662-671) |
| Quebra de linha | Não suportada |
| Altura do campo | Fixa, uma linha |
| Handler de teclas | `handleKeyPress` usa `onKeyPress` (deprecated) |

---

### Parte 1: Adicionar Import do Textarea

```typescript
// Remover Input dos imports (não é mais usado na área de mensagem)
// Adicionar Textarea
import { Textarea } from '@/components/ui/textarea';
```

---

### Parte 2: Adicionar Ref para Auto-Resize

```typescript
const textareaRef = useRef<HTMLTextAreaElement>(null);
```

---

### Parte 3: Função de Auto-Resize

Criar função que ajusta a altura automaticamente baseado no conteúdo:

```typescript
const adjustTextareaHeight = () => {
  const textarea = textareaRef.current;
  if (textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200); // max 200px
    textarea.style.height = `${newHeight}px`;
  }
};
```

---

### Parte 4: Atualizar handleKeyPress para handleKeyDown

Renomear e atualizar a lógica para usar `onKeyDown` (padrão moderno) e checar `shiftKey`:

```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
  // Shift+Enter: comportamento padrão (nova linha)
};
```

---

### Parte 5: Atualizar onChange para Incluir Auto-Resize

```typescript
const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setInput(e.target.value);
  adjustTextareaHeight();
};
```

---

### Parte 6: Reset da Altura ao Enviar

Quando a mensagem é enviada, precisamos resetar a altura do textarea:

```typescript
// Dentro de handleSend, após setInput(''):
setInput('');
// Reset textarea height
if (textareaRef.current) {
  textareaRef.current.style.height = 'auto';
}
```

---

### Parte 7: Substituir o Input pelo Textarea

Trocar o `<input type="text">` (linhas 662-671) pelo componente `<Textarea>`:

```tsx
{/* ANTES - Input de linha única */}
<input
  type="text"
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyPress={handleKeyPress}
  placeholder="Como posso ajudar você hoje?"
  disabled={isLoading || isExtractingFile}
  className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground 
             placeholder:text-muted-foreground disabled:cursor-not-allowed min-w-0"
/>

{/* DEPOIS - Textarea com auto-resize */}
<Textarea
  ref={textareaRef}
  value={input}
  onChange={handleInputChange}
  onKeyDown={handleKeyDown}
  placeholder="Como posso ajudar você hoje?"
  disabled={isLoading || isExtractingFile}
  rows={1}
  className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground 
             placeholder:text-muted-foreground disabled:cursor-not-allowed min-w-0
             resize-none min-h-[40px] max-h-[200px] py-2.5
             focus-visible:ring-0 focus-visible:ring-offset-0"
/>
```

---

### Parte 8: Ajustar Container para Alinhamento Bottom

O botão de enviar deve ficar alinhado na parte inferior quando o textarea crescer:

```tsx
{/* ANTES */}
<div className="flex items-center gap-2 bg-background border border-border rounded-2xl shadow-lg px-4 py-2">

{/* DEPOIS - items-end para alinhar no bottom */}
<div className="flex items-end gap-2 bg-background border border-border rounded-2xl shadow-lg px-4 py-2">
```

---

### Parte 9: Ajustar Botões para Margin Bottom

Os botões de anexo e envio precisam de margin-bottom para ficarem centralizados quando textarea tem uma linha:

```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => fileInputRef.current?.click()}
  disabled={isLoading || isExtractingFile}
  className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground mb-0.5"
  aria-label="Anexar arquivo"
>
  ...
</Button>

{/* VoiceInput também precisa de mb-0.5 */}
<div className="mb-0.5">
  <VoiceInput ... />
</div>

{/* Botão enviar */}
<Button 
  onClick={() => handleSend()} 
  disabled={isLoading || isExtractingFile || !input.trim()}
  size="icon"
  className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0 mb-0.5"
  aria-label="Enviar mensagem"
>
  <Send className="h-4 w-4" />
</Button>
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/MentorChat.tsx` | Substituir input por Textarea, adicionar auto-resize, atualizar key handler, ajustar alinhamento |

---

### Seção Técnica

**Auto-Resize Algorithm:**

O algoritmo de auto-resize funciona em 3 passos:
1. Define `height = 'auto'` para resetar e obter o scrollHeight real
2. Lê `scrollHeight` (altura necessária para mostrar todo conteúdo)
3. Aplica `Math.min(scrollHeight, 200)` para limitar a 200px

```text
Usuário digita texto longo
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ Como posso ajudar você hoje?                        │  ← 1 linha (40px)
└─────────────────────────────────────────────────────┘
         │ continua digitando...
         ▼
┌─────────────────────────────────────────────────────┐
│ Quero entender o comportamento da Gabriela nas     │
│ últimas reuniões e identificar padrões...          │  ← 2 linhas (~80px)
└─────────────────────────────────────────────────────┘
         │ ainda mais texto...
         ▼
┌─────────────────────────────────────────────────────┐
│ Quero entender o comportamento da Gabriela nas     │
│ últimas reuniões e identificar padrões de          │
│ comunicação...                                      │
│ [scroll interno ativado após 200px]                │  ← max-height com overflow
└─────────────────────────────────────────────────────┘
```

**Key Handler Behavior:**

| Tecla | Comportamento |
|-------|---------------|
| Enter (sozinho) | `e.preventDefault()` + `handleSend()` |
| Shift + Enter | Nova linha (comportamento padrão) |
| Qualquer outra | Comportamento padrão |

**CSS Classes Importantes:**

- `resize-none`: Remove handle de redimensionamento manual
- `min-h-[40px]`: Altura mínima de uma linha
- `max-h-[200px]`: Altura máxima antes de ativar scroll
- `focus-visible:ring-0`: Remove borda de foco azul padrão do Radix
- `items-end`: Alinha botões na base quando textarea cresce

