

## Plano: File Attachment Chip UI (Estilo ChatGPT)

### Problema

Atualmente, ao fazer upload de um arquivo no MentorChat, o conteúdo é colado como texto bruto no campo de input, poluindo a visão do usuário. O benchmark é o ChatGPT, que mostra um ícone/chip elegante do arquivo e mantém o input limpo para a pergunta.

---

### Solução

Implementar um sistema de anexo visual que:
1. Armazena o arquivo em um estado separado
2. Renderiza um chip elegante com ícone e nome do arquivo
3. Mantém o input livre para digitação
4. Concatena tudo silenciosamente no momento do envio

---

### Parte 1: Novo State de Anexo

Adicionar estado para armazenar o anexo temporariamente:

```typescript
// Junto aos outros estados (após linha 85)
const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
```

---

### Parte 2: Atualizar handleFileSelect

Modificar a função para salvar no estado de anexo em vez de poluir o input:

```typescript
const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!isFileSupported(file)) {
    toast({
      title: "Formato inválido",
      description: "Envie PDF, Word, TXT, Markdown ou imagem.",
      variant: "destructive"
    });
    return;
  }

  setIsExtractingFile(true);
  try {
    const text = await extractTextFromFile(file);
    // ✅ NOVO: Salvar no estado de anexo em vez de colar no input
    setAttachment({ name: file.name, content: text });
    toast({ 
      title: "Arquivo anexado!", 
      description: file.name 
    });
  } catch (error: any) {
    toast({ 
      title: "Erro ao processar", 
      description: error.message, 
      variant: "destructive" 
    });
  } finally {
    setIsExtractingFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};
```

---

### Parte 3: Atualizar handleSend (Concatenação Silenciosa)

Modificar o início da função para incluir o anexo no envio:

```typescript
const handleSend = async (messageToSend?: string) => {
  let finalMessage = messageToSend || input;
  if (!finalMessage.trim() && !attachment) return; // Permite enviar só com anexo
  if (isLoading || !user) return;

  // ✅ NOVO: Concatenar anexo silenciosamente
  if (attachment) {
    const attachmentBlock = `\n\n--- ARQUIVO ANEXADO (${attachment.name}) ---\n${attachment.content}`;
    finalMessage = finalMessage + attachmentBlock;
  }

  setInput('');
  setAttachment(null); // ✅ Limpar anexo após envio
  // ... resto da função continua igual
};
```

---

### Parte 4: Renderizar o Chip de Arquivo (UI)

Adicionar import do ícone `FileText` e `X`:

```typescript
import { Send, Loader2, MessageCircle, Paperclip, Plus, MessageSquare, 
         MoreHorizontal, Pencil, Trash2, FileText, X } from 'lucide-react';
```

Renderizar o chip acima do Textarea (antes da div de input):

```tsx
{/* Chip de Arquivo Anexado */}
{attachment && (
  <div className="flex items-center gap-2 mb-3">
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border 
                    rounded-lg text-sm max-w-[300px]">
      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
      <span className="truncate text-foreground">{attachment.name}</span>
      <button
        onClick={() => setAttachment(null)}
        className="p-0.5 hover:bg-accent rounded-sm transition-colors flex-shrink-0"
        aria-label="Remover anexo"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  </div>
)}
```

---

### Resumo das Alterações

| Localização | Alteração |
|-------------|-----------|
| Estado (linha ~85) | Adicionar `attachment` state |
| Imports (linha 7) | Adicionar `FileText` e `X` |
| `handleFileSelect` (linhas 419-452) | Salvar no `attachment` state em vez de concatenar ao input |
| `handleSend` (linhas 277-400) | Concatenar anexo antes do envio e limpar após |
| Área de Input (linhas 650-722) | Adicionar chip visual acima do Textarea |

---

### UX Final

```text
┌─────────────────────────────────────────────┐
│  📄 Relatorio-Semana.pdf              [X]   │  ← Chip do arquivo
├─────────────────────────────────────────────┤
│ 📎 │ Resuma os pontos principais      🎤 ➤ │  ← Input limpo
└─────────────────────────────────────────────┘
```

O usuário vê o arquivo como um chip elegante e pode digitar a pergunta livremente. A IA recebe tudo concatenado internamente.

---

### Seção Técnica

**Fluxo de Dados:**

```text
Usuário faz upload
       │
       ▼
extractTextFromFile()
       │
       ▼
setAttachment({ name, content }) ← Texto armazenado aqui
       │
       ▼
UI renderiza chip [📄 arquivo.pdf X]
       │
       ▼
Usuário digita pergunta no input limpo
       │
       ▼
handleSend() concatena: pergunta + anexo
       │
       ▼
API recebe mensagem completa
       │
       ▼
setAttachment(null) ← Limpa após envio
```

**Por que esse padrão é melhor:**

1. **UX Clean**: O input fica livre para a pergunta, sem scroll de texto longo
2. **Feedback Visual**: O usuário sabe que o arquivo está anexado (chip visível)
3. **Controle**: Botão X permite remover o anexo antes de enviar
4. **Benchmark**: Segue o padrão do ChatGPT/Claude (referência do usuário)

