## Contexto

O **MentorChat** (dentro de uma thread já criada) **já suporta anexos**: paperclip button, `Ctrl+V` para colar imagem, PDFs/DOCX/TXT/MD/PNG/JPG/WEBP, preview inline e envio como imagem (base64 → visão) ou texto extraído. Toda a lógica em `src/components/MentorChat.tsx` + `src/lib/fileParser.ts` + `chat-mentor` edge function já funciona.

O que **falta** é justamente a tela do screenshot: o launchpad `/lider/mentor` (`src/pages/lider/Mentor.tsx`). O composer inicial ali é um `<textarea>` puro, sem paperclip, sem paste, sem preview. Quando o líder cria a thread e cai em `/lider/mentor/:threadId`, aí o anexo funciona — mas ele já perdeu a chance de anexar junto da primeira mensagem.

## Proposta

Trazer paridade de anexos entre o launchpad e o chat da thread, nos dois modos (Coach e Analisar liderado), sem duplicar lógica.

### 1. Composer do launchpad ganha paperclip + paste (`src/pages/lider/Mentor.tsx`)

- Estado local `attachment` no mesmo formato do MentorChat: `{ name, content, imageBase64?, mimeType?, isImage? }`.
- Botão **Anexar** (ícone `Paperclip`) na barra inferior do composer, ao lado do picker de liderado e do seletor de escopo. Aceita `.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp` no modo Coach e no modo Analisar liderado (mesma matriz de hoje).
- `onPaste` no textarea captura imagem do clipboard (mesma validação: png/jpg/webp, ≤5MB).
- Preview do anexo (chip com thumb 32×32 para imagem ou ícone FileText + nome) renderizado **acima** do textarea, com `X` para remover — visual idêntico ao MentorChat para consistência.
- Reaproveitar `extractTextFromFile` / `isFileSupported` de `@/lib/fileParser`.
- Toast de erro para formato inválido / tamanho excedido.
- Botão de envio fica habilitado quando **`input.trim() || attachment`** (hoje exige texto).

### 2. Propagação do anexo para a thread recém-criada

Hoje `goToThread` passa apenas `{ initialPrompt }` via `location.state`. Estender:

- `goToThread(threadId, prompt?, attachment?)` passa `{ initialPrompt, initialAttachment }`.
- `startNewChat` recebe o anexo do estado local e propaga.
- `MentorThread.tsx` lê `initialAttachment` de `location.state`, limpa junto com `initialPrompt` no `useEffect` que faz `history.replaceState`, e passa como nova prop `initialAttachment` para `<MentorChat>`.
- `MentorChat`: nova prop opcional `initialAttachment`. No mesmo `useEffect` do `autoSendInitialPrompt`, se `initialAttachment` estiver presente, hidrata `setAttachment(initialAttachment)` **antes** de disparar `handleSend(initialPrompt)` (já suporta enviar só com anexo). Nenhuma mudança no backend `chat-mentor`.

### 3. Sugestões e conversas recentes continuam iguais

- Clicar em uma sugestão (`handleSuggestion`) não anexa nada — comportamento atual preservado.
- Nada muda no MentorChat em si além da nova prop.

## Fora de escopo

- Múltiplos anexos por mensagem (segue 1 por vez, como no MentorChat de hoje).
- Suporte a áudio/vídeo anexado.
- Persistência do anexo em `chat_messages` além do que já existe hoje (imagem vira `imageContent` no payload; texto de arquivo é concatenado à mensagem — mesmo comportamento vigente).
- Mudanças no `chat-mentor` edge function.
- Composer do liderado (`MeuRhitmo`) — só se pedirem depois; MentorChat já suporta lá dentro.

## Detalhes técnicos

- **Arquivos alterados:**
  - `src/pages/lider/Mentor.tsx` — estado `attachment`, handlers `handleFileSelect` / `handlePaste`, botão Paperclip, preview chip, `<input type="file" hidden>`.
  - `src/pages/lider/MentorThread.tsx` — ler `initialAttachment` de `location.state`, incluir no `history.replaceState` cleanup, passar prop.
  - `src/components/MentorChat.tsx` — nova prop `initialAttachment?: Attachment`; hidratar `setAttachment` no mesmo bloco do `autoSendInitialPrompt`.
- **Riscos:** `location.state` carrega base64 na navegação — imagens até 5MB codificadas em base64 ≈ ~6.7MB em memória, aceitável para uma navegação client-side. Não vai para URL nem localStorage.
- **Sem migração de banco**, sem mudança de RLS, sem tokens extras (o custo de visão só ocorre quando o líder de fato anexa).
