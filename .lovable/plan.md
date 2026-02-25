

## Correções no MentorChat — Plano de Implementação

### Resumo

Duas correções críticas: (A) incluir histórico de conversa da thread no contexto enviado à IA, e (B) suporte a imagens via vision (base64). Afeta `src/components/MentorChat.tsx` e `supabase/functions/chat-mentor/index.ts`.

---

### Correção A — Histórico da thread no contexto

#### A1. Frontend (`src/components/MentorChat.tsx`)

No `handleSend` (linha ~356), antes de chamar a Edge Function, montar o array de histórico:

```typescript
const conversationHistory = messages.map(msg => ({
  role: msg.role,
  content: msg.content
}));
```

Incluir `conversationHistory` no body da requisição (linha ~364):

```typescript
body: JSON.stringify({
  question: finalMessage,
  // ... campos existentes ...
  conversationHistory
})
```

#### A2. Edge Function (`supabase/functions/chat-mentor/index.ts`)

- Extrair `conversationHistory` do body (linha 175)
- Na chamada ao GPT-4o (linha ~492), substituir o array `messages` fixo por:

```typescript
const apiMessages = [
  { role: 'system', content: systemPrompt },
  ...(conversationHistory || []).slice(0, -1).map(msg => ({
    role: msg.role,
    content: msg.content
  })),
  { role: 'user', content: currentUserContent }
];
```

Onde `currentUserContent` é o conteúdo multimodal (se imagem) ou `question` (string simples).

---

### Correção B — Suporte a imagens (Vision)

#### B1. Frontend: tipo do attachment (`src/components/MentorChat.tsx`)

Alterar o tipo do estado `attachment` (linha 89) para:

```typescript
interface Attachment {
  name: string;
  content: string;
  imageBase64?: string;
  mimeType?: string;
  isImage?: boolean;
}
```

#### B2. Frontend: `handleFileSelect` (linhas 452-485)

Detectar se é imagem (`file.type.startsWith('image/')`) antes de chamar `extractTextFromFile`:

- **Se imagem**: converter para base64 via `FileReader`, salvar com `isImage: true`
- **Se documento**: manter comportamento atual

#### B3. Frontend: `handleSend` (linhas 282-433)

Se `attachment?.isImage`:
- Não concatenar texto — enviar `imageContent` separado no body
- Salvar no banco apenas o texto digitado (sem base64)

```typescript
const imageContent = attachment?.isImage ? {
  isImage: true,
  imageBase64: attachment.imageBase64,
  mimeType: attachment.mimeType,
  textMessage: finalMessage
} : undefined;
```

Se documento: manter concatenação atual.

#### B4. Frontend: UI preview de imagem (linhas 746-761)

Quando `attachment?.isImage`, mostrar thumbnail da imagem em vez do ícone FileText:

```tsx
<img src={`data:${attachment.mimeType};base64,${attachment.imageBase64}`}
     className="h-8 w-8 rounded object-cover" />
```

#### B5. Edge Function: processar imagem

Receber `imageContent` do body. Se presente, montar content multimodal:

```typescript
const currentUserContent = imageContent?.isImage
  ? [
      { type: "image_url", image_url: { url: `data:${imageContent.mimeType};base64,${imageContent.imageBase64}` } },
      { type: "text", text: imageContent.textMessage || "Analise esta imagem no contexto do liderado." }
    ]
  : question;
```

Usar `currentUserContent` como content da última mensagem do array `apiMessages`.

---

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/MentorChat.tsx` | Histórico, attachment tipo, imagem base64, preview UI, imageContent no body |
| `supabase/functions/chat-mentor/index.ts` | Receber conversationHistory + imageContent, montar apiMessages com histórico + vision |

### O que NÃO muda

- Sistema de threads (criação, seleção, renomeação, exclusão)
- ContextPicker e selectedContexts
- Lógica de feedbacks e workStyleData
- Sistema de sugestões rápidas
- Qualquer outro componente
- Outras Edge Functions

