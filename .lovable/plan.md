

## Plano: Implementar Limpeza de HTML (Text Sanitizer)

### Problema

Transcrições coladas de ferramentas como Tactiq/Google Meet frequentemente contêm lixo HTML (`<strong>`, `<br>`, `&nbsp;`) que:

1. Quebra a leitura da IA
2. Interfere no reconhecimento de falantes (ex: `<strong>Matheus:</strong>` em vez de `Matheus:`)
3. Polui o banco de dados com markup desnecessário

### Solução

Criar uma função utilitária `cleanTranscriptText()` que sanitiza o texto antes de salvar, garantindo que a IA receba apenas texto limpo e legível.

---

### Parte 1: Criar Função Utilitária (src/lib/textSanitizer.ts)

Novo arquivo com a lógica de limpeza:

```typescript
/**
 * Text Sanitizer - Limpa HTML e normaliza texto de transcrições
 * Garante que a IA receba texto puro para o Protocolo de Identidade funcionar
 */

// Mapa de entidades HTML comuns
const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&#x27;': "'",
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '...',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&bull;': '•',
  '&middot;': '·',
};

/**
 * Remove todas as tags HTML do texto
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>?/gm, '');
}

/**
 * Decodifica entidades HTML comuns
 */
function decodeHtmlEntities(text: string): string {
  let result = text;
  
  // Substituir entidades nomeadas
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }
  
  // Substituir entidades numéricas (ex: &#60;)
  result = result.replace(/&#(\d+);/g, (_, code) => 
    String.fromCharCode(parseInt(code, 10))
  );
  
  // Substituir entidades hex (ex: &#x3C;)
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => 
    String.fromCharCode(parseInt(code, 16))
  );
  
  return result;
}

/**
 * Normaliza quebras de linha excessivas
 */
function normalizeLineBreaks(text: string): string {
  return text
    .replace(/\r\n/g, '\n')           // Windows → Unix
    .replace(/\r/g, '\n')             // Mac antigo → Unix
    .replace(/\n{3,}/g, '\n\n')       // Múltiplas quebras → máximo 2
    .trim();
}

/**
 * Normaliza espaços em branco
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/[\t ]+/g, ' ')          // Múltiplos espaços/tabs → 1 espaço
    .replace(/ +\n/g, '\n')           // Remove espaços antes de quebra
    .replace(/\n +/g, '\n')           // Remove espaços depois de quebra
    .trim();
}

/**
 * Função principal: Limpa texto de transcrição
 * 
 * Pipeline de limpeza:
 * 1. Remove tags HTML
 * 2. Decodifica entidades HTML
 * 3. Normaliza quebras de linha
 * 4. Normaliza espaços em branco
 */
export function cleanTranscriptText(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Pipeline de limpeza
  cleaned = stripHtmlTags(cleaned);
  cleaned = decodeHtmlEntities(cleaned);
  cleaned = normalizeLineBreaks(cleaned);
  cleaned = normalizeWhitespace(cleaned);
  
  return cleaned;
}

/**
 * Detecta se o texto contém HTML
 */
export function containsHtml(text: string): boolean {
  // Verifica tags HTML
  if (/<[a-zA-Z][^>]*>/.test(text)) return true;
  
  // Verifica entidades HTML comuns
  if (/&(nbsp|amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);/i.test(text)) return true;
  
  return false;
}
```

---

### Parte 2: Atualizar NewNoteDialog.tsx

Aplicar a limpeza em dois pontos:

#### 2.1 No processamento de arquivos

```typescript
import { cleanTranscriptText } from '@/lib/textSanitizer';

// Dentro de handleFileSelect, após extrair o texto:
const extractedText = await extractTextFromFile(file);
const cleanedText = cleanTranscriptText(extractedText);
setContent(cleanedText);
```

#### 2.2 No envio do formulário (handleSubmit)

```typescript
// Antes de inserir no banco:
const cleanedContent = cleanTranscriptText(content);

const { data: feedback, error: insertError } = await supabase
  .from('feedbacks')
  .insert({
    manager_id: user.id,
    member_id: targetMemberId,
    content: cleanedContent,  // ← Texto limpo
    type: 'neutral',
    occurred_at: occurredAt.toISOString(),
    // ...
  })
```

---

### Parte 3: Atualizar RichTextEditor para Limpar no Paste

Adicionar interceptação do paste para limpar HTML antes de inserir no editor:

```typescript
// No RichTextEditor, adicionar extensão para interceptar paste
const editor = useEditor({
  extensions: [
    StarterKit.configure({ ... }),
    Placeholder.configure({ ... }),
  ],
  editorProps: {
    handlePaste: (view, event) => {
      const text = event.clipboardData?.getData('text/plain');
      if (text) {
        // Limpa o texto antes de inserir
        const cleanedText = cleanTranscriptText(text);
        // Insere como texto puro
        view.dispatch(
          view.state.tr.insertText(cleanedText)
        );
        return true; // Previne comportamento padrão
      }
      return false;
    },
  },
  // ...
});
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/textSanitizer.ts` | **NOVO** - Função `cleanTranscriptText()` e helpers |
| `src/components/NewNoteDialog.tsx` | Importar e aplicar limpeza no `handleFileSelect` e `handleSubmit` |
| `src/components/ui/rich-text-editor.tsx` | Adicionar `handlePaste` para limpar texto colado |

---

### Exemplos de Transformação

| Input (Sujo) | Output (Limpo) |
|--------------|----------------|
| `<strong>Matheus:</strong> Olá` | `Matheus: Olá` |
| `Yas:&nbsp;Terminei a tarefa` | `Yas: Terminei a tarefa` |
| `<br><br><br>Gabi: Oi` | `\n\nGabi: Oi` |
| `&quot;Projeto A&quot; concluído` | `"Projeto A" concluído` |
| `<p>Parágrafo 1</p><p>Parágrafo 2</p>` | `Parágrafo 1 Parágrafo 2` |

---

### Seção Técnica

#### Pipeline de Limpeza

```text
Texto Colado (HTML sujo)
         │
         ▼
    stripHtmlTags()
    ├── Remove <strong>, <br>, <p>, etc
         │
         ▼
    decodeHtmlEntities()
    ├── &nbsp; → espaço
    ├── &amp; → &
    ├── &#60; → <
         │
         ▼
    normalizeLineBreaks()
    ├── \r\n → \n
    ├── 3+ quebras → 2 quebras
         │
         ▼
    normalizeWhitespace()
    ├── Múltiplos espaços → 1
         │
         ▼
    Texto Limpo → Banco de Dados
```

#### Por que limpar no Frontend (não no Backend)?

1. **Feedback Imediato**: O usuário vê o texto limpo antes de salvar
2. **Menor Payload**: Menos bytes enviados para o servidor
3. **Consistência**: Garante que TODAS as notas passem pelo mesmo tratamento
4. **Performance**: Não sobrecarrega as Edge Functions

#### Integração com Protocolo de Identidade

Após a limpeza, transcrições como:

```html
<strong>Yas:</strong>&nbsp;Terminei a tarefa<br><br>
<strong>Matheus:</strong>&nbsp;Ótimo trabalho!
```

Se tornam:

```text
Yas: Terminei a tarefa

Matheus: Ótimo trabalho!
```

Permitindo que a IA identifique corretamente:
- **Yas** (variação de Yasmin) → Atribui ao membro
- **Matheus** (gestor) → Ignora como contexto

