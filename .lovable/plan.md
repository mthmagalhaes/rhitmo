

## Problema

Quando `autoTranscribe` é desligado, bots já agendados mostram `Loader2 animate-spin` + "Agendado" indefinidamente. O spinner passa a impressão de loop infinito, mas é apenas um ícone errado para um estado estável.

## Causa raiz

Linha 274-289 de `UpcomingMeetingsCard.tsx`: o status `'scheduled'` usa `Loader2 animate-spin`, que é apropriado apenas para estados transitórios (`joining`, `processing`).

## Correção

Separar os estados no render:
- **`scheduled`** → ícone estático (Clock ou similar) + "Agendado" (sem spinner)
- **`joining`** → Loader2 spinner + "Entrando"  
- **`processing`** → Loader2 spinner + "Processando"

### Arquivo: `src/components/dashboard/UpcomingMeetingsCard.tsx`

Substituir o bloco das linhas 274-289 para tratar `'scheduled'` separadamente com um ícone de relógio (Clock do Lucide) sem animação, mantendo o spinner apenas para `joining` e `processing`.

Quando `isAutoScheduled` (auto + scheduled), continua mostrando "Auto ✓" com Sparkles.

