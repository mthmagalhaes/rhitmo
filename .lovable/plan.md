

## Chrome Extension Rhitmo Recorder

Extensão Chrome que auto-detecta abas do Google Meet e permite gravação com 1 click, reutilizando toda a infraestrutura de upload/transcrição existente.

---

### Arquitetura

```text
┌─────────────────────────────┐
│  Chrome Extension           │
│  ┌───────────────────────┐  │
│  │ background.js          │  │  ← Detecta abas meet.google.com
│  │ (service worker)       │  │  ← chrome.tabCapture.capture()
│  └───────┬───────────────┘  │
│          │                   │
│  ┌───────▼───────────────┐  │
│  │ popup.html/popup.js    │  │  ← UI: status, timer, stop button
│  │ (mesma UI do Recorder) │  │  ← Converte WebM→MP3 (lamejs)
│  └───────┬───────────────┘  │
│          │ upload            │
└──────────┼──────────────────┘
           │ POST FormData
           ▼
   upload-meeting (edge fn)   ← Já existe, sem mudanças
           │
           ▼
   transcribe-audio → feedbacks → analyze-feedback-background
```

---

### Estrutura de arquivos

Tudo dentro de `extension/` na raiz do projeto:

| Arquivo | Função |
|---------|--------|
| `extension/manifest.json` | Manifest V3, permissões tabCapture + activeTab |
| `extension/background.js` | Service worker: detecta Meet, gerencia estado |
| `extension/popup.html` | UI da extensão (compacta) |
| `extension/popup.js` | Lógica de gravação, conversão MP3, upload |
| `extension/icon-48.png` | Ícone 48px |
| `extension/icon-128.png` | Ícone 128px |

O ZIP final vai para `public/rhitmo-recorder-extension.zip`.

---

### Detalhes técnicos

**1. manifest.json**
- `manifest_version: 3`
- Permissions: `tabCapture`, `activeTab`, `storage`, `tabs`
- `host_permissions`: `https://meet.google.com/*` (para detectar abas Meet)
- `action.default_popup`: `popup.html`
- Background service worker

**2. background.js**
- Listener em `chrome.tabs.onUpdated`: quando URL contém `meet.google.com`, muda ícone para "ativo" (badge verde)
- Gerencia estado da gravação via `chrome.storage.local`
- Usa `chrome.tabCapture.capture({ audio: true, video: false })` — sem picker dialog, captura direto a aba ativa

**3. popup.js — Reutiliza lógica do RecorderPopup**
- Mesma conversão WebM→MP3 (lamejs inline ou bundled)
- Upload direto para edge function `upload-meeting` via fetch
- Auth: usa token Supabase armazenado via `chrome.storage.local` (líder faz login 1 vez)
- Estados: idle → recording → converting → uploading → done
- Timer visual, waveform simplificado

**4. Autenticação na extensão**
- Na primeira vez, popup mostra campo "Cole seu token" ou botão "Login com Rhitmo"
- O token é obtido da sessão do app (adicionamos botão "Copiar token da extensão" em Settings)
- Token salvo em `chrome.storage.local`, usado como Bearer nos requests

**5. Página de download na Landing/Settings**
- Seção em Settings ou Landing com botão "Baixar Extensão Chrome"
- Instruções: (1) Baixe o ZIP, (2) Abra chrome://extensions, (3) Ative modo desenvolvedor, (4) Carregue descompactado
- Futuramente: publicar na Chrome Web Store

---

### O que NÃO muda

- Edge function `upload-meeting`: sem alterações (já aceita FormData)
- Edge function `transcribe-audio`: sem alterações
- `RecorderPopup.tsx`: mantido como fallback para quem não instala a extensão
- `MeetingRecorder.tsx`: mantido como está
- Nenhuma migration SQL necessária

---

### Limitações conhecidas

- `chrome.tabCapture` só funciona em Chromium (Chrome, Edge, Brave, Arc)
- Precisa estar na aba do Meet quando inicia (não grava aba em background sem interação)
- Para publicar na Chrome Web Store: processo de review ~3-5 dias úteis
- lamejs precisa ser bundled inline no popup.js (sem CDN em extensões MV3)

---

### Fases de entrega

**Fase única** (tudo junto, ~1 sessão):
1. Criar arquivos da extensão (`manifest.json`, `background.js`, `popup.html`, `popup.js`, ícones)
2. Empacotar como ZIP em `public/`
3. Adicionar botão "Conectar Extensão" em Settings com instruções de instalação
4. Adicionar botão "Copiar token" para autenticação da extensão

