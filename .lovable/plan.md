

## Retry com Backoff Exponencial no MentorChat

Adicionar retry automatico para erros 429 e 503 na chamada da Edge Function `chat-mentor`, com feedback visual "Reconectando..." durante as tentativas.

---

### Alteracoes em `src/components/MentorChat.tsx`

**1. Novo estado para mensagem de loading:**
```tsx
const [loadingMessage, setLoadingMessage] = useState('');
```

**2. Envolver o bloco fetch (linhas 267-288) em funcao de retry:**

Criar funcao `fetchWithRetry` que:
- Tenta o fetch ate 3 vezes para status 429 e 503
- Backoff: 1s, 2s, 4s
- Atualiza `loadingMessage` para "Reconectando... (tentativa X/3)" durante retries
- AbortError nao retenta (comportamento atual mantido)
- Se todas tentativas falharem, lanca o erro normalmente para o catch existente

**3. Atualizar UI de loading (area de dots animados):**
Quando `loadingMessage` nao vazio, mostrar o texto em vez dos dots padrao.

---

### Logica de retry (pseudo-codigo)

```typescript
const MAX_RETRIES = 3;

let lastResponse: Response | null = null;
for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  if (attempt > 0) {
    const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
    setLoadingMessage(`Reconectando... (tentativa ${attempt}/${MAX_RETRIES})`);
    await new Promise(r => setTimeout(r, delay));
  }
  
  const response = await fetch(...);
  
  if (response.ok) {
    setLoadingMessage('');
    // process response normally
    break;
  }
  
  if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
    continue; // retry
  }
  
  // Not retryable or max retries reached — throw
  setLoadingMessage('');
  throw error;
}
```

**4. UI do loading message** — no bloco de loading dots (dentro da ScrollArea), adicionar condicional:

```tsx
{isLoading && (
  <div className="...">
    {loadingMessage ? (
      <span className="text-xs text-muted-foreground">{loadingMessage}</span>
    ) : (
      // dots animados existentes
    )}
  </div>
)}
```

---

### Arquivo alterado

| Arquivo | Acao |
|---|---|
| `src/components/MentorChat.tsx` | Adicionar estado `loadingMessage`, retry com backoff no fetch, feedback visual |

### O que NAO muda
- Toda a logica de threads, sidebar, attachments, context picker
- Edge Function `chat-mentor`
- Tratamento de AbortError (timeout) — continua sem retry
- Toast de erro final — continua identico, so aparece apos esgotar tentativas

