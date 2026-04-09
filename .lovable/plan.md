

## Auto-Record: Gravação Automática no Google Meet

Evolução da extensão Chrome para iniciar gravação automaticamente ao entrar numa reunião, sem nenhum clique.

---

### Como funciona

```text
Líder entra no Meet
        │
        ▼
Content Script (meet.google.com)
  │  Observa DOM: detecta que entrou na chamada
  │  Detecta saída da chamada (botão "sair" / URL muda)
  │
  ▼ chrome.runtime.sendMessage
Background Service Worker
  │  chrome.tabCapture.getMediaStreamId()
  │  chrome.offscreen.createDocument()
  │
  ▼ stream ID
Offscreen Document (offscreen.html)
  │  Recebe stream, cria MediaRecorder
  │  Grava em background (popup pode estar fechado)
  │  Quando recebe "stop" → cria blob → upload
  │
  ▼ POST FormData
upload-meeting (edge fn) → transcrição automática
```

---

### Arquivos novos/alterados

| Arquivo | Ação |
|---------|------|
| `extension/manifest.json` | Adicionar `content_scripts`, permissão `offscreen`, declarar `offscreen.html` |
| `extension/content.js` | **Novo** — injeta em meet.google.com, detecta join/leave via DOM |
| `extension/offscreen.html` | **Novo** — documento offscreen para gravação em background |
| `extension/offscreen.js` | **Novo** — recebe stream, grava, faz upload |
| `extension/background.js` | Reescrever — orquestra content script ↔ offscreen, gerencia tabCapture |
| `extension/popup.html` | Atualizar — mostrar status "gravando automaticamente" |
| `extension/popup.js` | Atualizar — ler estado do storage, mostrar timer/status, botão stop manual |

### O que NÃO muda
- Edge function `upload-meeting`: sem alterações
- Backend/migrations: nenhuma
- `ProfileSettingsDialog.tsx`: mantido (token + download)

---

### Detalhes técnicos

**1. Content Script (`content.js`)**
- Injetado automaticamente em `meet.google.com/*` via `content_scripts` no manifest
- Detecta entrada na reunião: observa DOM por elementos que indicam chamada ativa (ex: botão de desligar, indicador de microfone)
- Detecta saída: URL muda para `/` ou elemento de "reunião encerrada" aparece
- Envia mensagens `{ type: 'meeting-joined' }` e `{ type: 'meeting-left' }` ao background

**2. Offscreen Document (`offscreen.html` + `offscreen.js`)**
- Criado pelo background quando reunião é detectada
- Recebe `streamId` via `chrome.runtime.sendMessage`
- Usa `navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } } })` para capturar áudio
- `MediaRecorder` grava em WebM/Opus
- Ao receber "stop", monta blob e faz upload direto para `upload-meeting`

**3. Background Service Worker (reescrito)**
- Recebe `meeting-joined` do content script
- Chama `chrome.tabCapture.getMediaStreamId({ targetTabId })` para obter stream ID
- Cria offscreen document se não existir
- Passa stream ID para offscreen via messaging
- Recebe `meeting-left` → envia "stop" para offscreen
- Salva estado (`recording: true/false`, `startTime`, `tabId`) em `chrome.storage.local`

**4. Popup (atualizado)**
- Lê estado do `chrome.storage.local`
- Se gravando: mostra timer em tempo real + botão "Parar gravação"
- Se idle: mostra "Gravação automática ativa — entre em uma reunião"
- Toggle para ativar/desativar auto-record (para quem quer controle manual)

**5. Manifest atualizado**
```json
{
  "permissions": ["tabCapture", "activeTab", "storage", "tabs", "offscreen"],
  "content_scripts": [{
    "matches": ["https://meet.google.com/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

---

### Configuração do usuário

- Toggle no popup: "Gravar automaticamente" (on/off, salvo em `chrome.storage.local`)
- Default: **ligado** — zero fricção
- Notificação visual: badge verde pulsante no ícone quando gravando

---

### Limitação conhecida

- `chrome.tabCapture.getMediaStreamId()` pode exigir que a extensão tenha sido ativada pelo usuário ao menos uma vez (first-run gesture). Depois disso, funciona automaticamente.
- Se o Meet estiver em background tab por muito tempo, Chrome pode suspender o service worker — o offscreen document mitiga isso por ser persistente durante a gravação.

