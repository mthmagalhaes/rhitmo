

## Gravação Resiliente — Popup Independente + Proteção contra Refresh

### Problema

A gravação atual vive dentro de um Dialog React na página principal. Isso causa:
1. **Navegar na Rhitmo mata a gravação** — qualquer mudança de rota destrói o componente
2. **Refresh perde tudo** — o MediaRecorder e os chunks de áudio vivem em memória do componente
3. **Usuário precisa duplicar abas** para usar a plataforma enquanto grava

### Solução: Popup de Gravação Independente

Abrir uma **janela popup pequena e flutuante** (~400x500px) que executa a gravação de forma completamente independente da aba principal. O popup:
- Roda seu próprio MediaRecorder
- Não é afetado por navegação ou refresh na aba principal
- Comunica o resultado de volta via `BroadcastChannel`
- Tem UI minimalista (timer, waveform, botão parar)

```text
┌─────────────────────────────┐
│  Rhitmo (aba principal)     │
│  Navega livremente,         │    ┌──────────────────┐
│  anota, usa a plataforma    │    │  Popup Gravação   │
│                             │    │  ● REC  03:45     │
│  ← BroadcastChannel →      │←──→│  ▁▃▅▇▅▃▁▃▅▇▅▃   │
│                             │    │  [Parar Gravação]  │
│                             │    └──────────────────┘
└─────────────────────────────┘
```

### Implementação

**1. Criar página `/recorder` (rota leve)**
- `src/pages/RecorderPopup.tsx` — página standalone com toda a lógica de gravação (MediaRecorder, conversão MP3, upload)
- UI minimalista: título da reunião, timer, waveform, botão parar
- Ao concluir upload, envia resultado via `BroadcastChannel('rhitmo-recorder')`

**2. Modificar `MeetingRecorder.tsx`**
- No estado `idle`, ao clicar "Iniciar Gravação", abre `window.open('/recorder?memberId=X&memberName=Y', ...)` com dimensões fixas
- Escuta `BroadcastChannel('rhitmo-recorder')` para receber o resultado (transcript_id, feedback_id, etc.)
- Mostra estado "Gravando em janela externa..." com link para focar o popup
- Quando recebe resultado, mostra o estado `done` com replicação normalmente

**3. Proteção contra refresh acidental (no popup)**
- `beforeunload` event listener durante gravação ativa
- Warning: "Gravação em andamento será perdida"

**4. Adicionar rota no `App.tsx`**
- Rota `/recorder` renderiza `RecorderPopup` sem o `AppLayout` (sem sidebar/header)

### Fluxo do usuário (novo)

1. Líder clica "Gravar Reunião" no perfil do liderado
2. Dialog abre com título + botão "Iniciar"
3. Ao clicar, abre **popup pequeno** com seleção de aba
4. Popup grava independentemente — líder volta para a aba principal e usa a Rhitmo normalmente
5. Ao parar gravação no popup, upload + transcrição acontecem
6. Resultado volta para a aba principal via BroadcastChannel
7. Dialog na aba principal mostra "Transcrição salva!" com opção de replicar

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/RecorderPopup.tsx` | Criar — página standalone de gravação |
| `src/components/MeetingRecorder.tsx` | Refatorar — abrir popup + escutar BroadcastChannel |
| `src/App.tsx` | Adicionar rota `/recorder` |

### O que melhora
- Líder usa a plataforma normalmente durante gravação
- Refresh na aba principal não afeta nada
- Popup tem `beforeunload` para evitar fechamento acidental
- Mesmo pipeline de transcrição (Whisper → feedback → classify)

