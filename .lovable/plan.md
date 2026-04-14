

## Plano: Corrigir idioma da transcrição — migrar de `meeting_captions` para `recallai_streaming`

### Diagnóstico

O provider atual é `meeting_captions`, que usa as legendas nativas do Google Meet. Essas legendas dependem da configuração de idioma do Meet do participante — se estava em inglês, a transcrição sai em inglês (traduzida/mal-reconhecida). Pior: **`meeting_captions` não suporta detecção automática de idioma**.

### Solução

Trocar para o provider `recallai_streaming` com `language_code: "auto"`. Isso:
- Detecta automaticamente o idioma falado (PT-BR, EN, ES — todos suportados)
- Não depende das configurações do Google Meet de cada participante
- Custo: US$ 0.15/hora de transcrição (vs. gratuito do `meeting_captions`)

O modo `prioritize_accuracy` entrega transcrições em blocos de 3-10 min com qualidade superior. Para o caso de uso do Rhitmo (análise pós-reunião), é ideal.

### Mudanças

**Arquivos:** `schedule-recall-bot/index.ts` e `fetch-calendar-events/index.ts`

Substituir o bloco `recording_config` em ambos:

```typescript
// ANTES
recording_config: {
  transcript: {
    provider: { meeting_captions: {} }
  }
}

// DEPOIS
recording_config: {
  transcript: {
    provider: {
      recallai_streaming: {
        mode: "prioritize_accuracy",
        language_code: "auto"
      }
    }
  }
}
```

Isso é tudo. Não precisa de migração de banco, mudança no webhook, nem configuração do usuário. O `language_code: "auto"` resolve os 3 idiomas (PT-BR, EN, ES) automaticamente.

### Custo

- `meeting_captions`: gratuito
- `recallai_streaming`: US$ 0.15/hora

Para uma reunião de 1 hora, são ~R$ 0.85. Aceitável para o valor que entrega.

### Resultado esperado

- Reuniões em português: transcrição em português
- Reuniões em inglês: transcrição em inglês
- Reuniões em espanhol: transcrição em espanhol
- Detecção automática — nenhuma configuração manual necessária do líder

